#!/usr/bin/env python3
"""Importador em lote para listas do SharePoint via Microsoft Graph ($batch).

Versão em Python do fluxo Cloud `flow/definition.json`. Lê um CSV produzido
pelas rotinas desktop, monta lotes de até 20 requisições (limite do JSON
batching do Graph), envia com retry exponencial respeitando `Retry-After`
em 429/503/504 e grava o que não entrou num CSV de *dead-letter*.

Autenticação (app registration com permissão Sites.Selected ou
Sites.ReadWrite.All, fluxo client credentials) por variáveis de ambiente:

    AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
    SP_SITE_ID   (ex.: contoso.sharepoint.com,<guid-site>,<guid-web>)
    SP_LIST_ID   (GUID ou nome de exibição da lista)

Dependências só no modo real:  pip install msal requests

Exemplos:
    # Offline: nenhum acesso à rede, Graph simulado (com falhas aleatórias)
    python importer.py ../exemplo/patrimonio_lote.csv --dry-run --falhas 0.15

    # Real
    python importer.py ../exemplo/patrimonio_lote.csv --lote 20
"""
from __future__ import annotations

import argparse
import csv
import json
import logging
import os
import random
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Protocol

GRAPH = "https://graph.microsoft.com/v1.0"
LIMITE_BATCH = 20                      # máximo de requisições por $batch no Graph
STATUS_TRANSITORIOS = {429, 502, 503, 504}
NUMERICOS = {"ValorAquisicao"}

log = logging.getLogger("importer")


# --------------------------------------------------------------------------
# Transporte: real (requests + MSAL) ou simulado (offline)
# --------------------------------------------------------------------------
class Transporte(Protocol):
    def post_batch(self, corpo: dict) -> tuple[int, dict, dict]: ...
    def dormir(self, segundos: float) -> None: ...


class GraphReal:
    """Envia $batch ao Microsoft Graph com token client-credentials."""

    def __init__(self) -> None:
        import msal  # noqa: import tardio para o --dry-run não depender disso
        import requests

        faltando = [v for v in ("AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET") if not os.getenv(v)]
        if faltando:
            raise SystemExit(f"Defina as variáveis de ambiente: {', '.join(faltando)} (ou use --dry-run)")
        self._app = msal.ConfidentialClientApplication(
            client_id=os.environ["AZURE_CLIENT_ID"],
            client_credential=os.environ["AZURE_CLIENT_SECRET"],
            authority=f"https://login.microsoftonline.com/{os.environ['AZURE_TENANT_ID']}",
        )
        self._http = requests.Session()

    def _token(self) -> str:
        # O MSAL guarda o token em cache e só renova quando expira.
        res = self._app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
        if "access_token" not in res:
            raise RuntimeError(f"Falha na autenticação: {res.get('error_description', res)}")
        return res["access_token"]

    def post_batch(self, corpo: dict) -> tuple[int, dict, dict]:
        r = self._http.post(f"{GRAPH}/$batch", json=corpo, timeout=60,
                            headers={"Authorization": f"Bearer {self._token()}"})
        try:
            dados = r.json()
        except ValueError:
            dados = {}
        return r.status_code, dict(r.headers), dados

    def dormir(self, segundos: float) -> None:
        time.sleep(segundos)


class GraphSimulado:
    """Imita o endpoint $batch: devolve 201, 429 (com Retry-After) ou 400.

    `falhas` é a probabilidade de cada sub-requisição sofrer throttling
    (transitório); `permanentes` é a chance de erro de validação 400.
    O tempo é só contado, não esperado, então o dry-run é instantâneo.
    """

    def __init__(self, falhas: float = 0.1, permanentes: float = 0.03, semente: int | None = 42) -> None:
        self.falhas, self.permanentes = falhas, permanentes
        self.rng = random.Random(semente)
        self.relogio = 0.0
        self.proximo_id = 1
        self.chamadas = 0

    def post_batch(self, corpo: dict) -> tuple[int, dict, dict]:
        self.chamadas += 1
        self.relogio += 0.35 + 0.02 * len(corpo["requests"])
        if self.rng.random() < self.falhas / 6:  # às vezes o lote inteiro é estrangulado
            return 429, {"Retry-After": str(self.rng.randint(2, 6))}, {"error": {"code": "TooManyRequests"}}
        respostas = []
        for req in corpo["requests"]:
            sorte = self.rng.random()
            if sorte < self.permanentes:
                respostas.append({"id": req["id"], "status": 400, "headers": {},
                                  "body": {"error": {"code": "invalidRequest",
                                                     "message": "List data validation failed. (simulado)"}}})
            elif sorte < self.permanentes + self.falhas:
                respostas.append({"id": req["id"], "status": 429, "headers": {"Retry-After": str(self.rng.randint(1, 5))},
                                  "body": {"error": {"code": "activityLimitReached"}}})
            else:
                respostas.append({"id": req["id"], "status": 201, "headers": {},
                                  "body": {"id": str(self.proximo_id), "fields": req["body"]["fields"]}})
                self.proximo_id += 1
        return 200, {}, {"responses": respostas}

    def dormir(self, segundos: float) -> None:
        self.relogio += segundos


# --------------------------------------------------------------------------
# Importação
# --------------------------------------------------------------------------
@dataclass
class Relatorio:
    linhas: int = 0
    inseridas: int = 0
    lotes: int = 0
    chamadas: int = 0
    retries: int = 0
    dead_letter: list[dict] = field(default_factory=list)


def ler_csv(caminho: Path) -> list[dict]:
    with open(caminho, newline="", encoding="utf-8-sig") as f:
        amostra = f.read(4096)
        f.seek(0)
        try:
            delim = csv.Sniffer().sniff(amostra, delimiters=",;\t").delimiter
        except csv.Error:
            delim = ","
        return [{k.strip(): (v or "").strip() for k, v in row.items() if k} for row in csv.DictReader(f, delimiter=delim)]


def para_fields(linha: dict) -> dict:
    """Converte a linha do CSV para o objeto `fields` do Graph."""
    campos = {}
    for k, v in linha.items():
        if v == "":
            continue
        if k in NUMERICOS:
            try:
                campos[k] = float(v)
                continue
            except ValueError:
                pass
        campos[k] = v
    return campos


def em_lotes(itens: list, tamanho: int) -> Iterable[list]:
    for i in range(0, len(itens), tamanho):
        yield itens[i:i + tamanho]


def espera(tentativa: int, retry_after: str | None, rng: random.Random) -> float:
    if retry_after:
        try:
            return max(float(retry_after), 0.5)
        except ValueError:
            pass
    return min(2 ** tentativa, 60) + rng.uniform(0, 1)  # backoff exponencial com jitter


def importar(linhas: list[dict], transporte: Transporte, site: str, lista: str,
             tamanho_lote: int = LIMITE_BATCH, max_tentativas: int = 5) -> Relatorio:
    rel = Relatorio(linhas=len(linhas))
    rng = random.Random(1)
    url_itens = f"/sites/{site}/lists/{lista}/items"
    numeradas = list(enumerate(linhas, start=2))  # linha 1 = cabeçalho

    for n_lote, lote in enumerate(em_lotes(numeradas, tamanho_lote), start=1):
        rel.lotes += 1
        pendentes = {str(n): linha for n, linha in lote}
        ultimo_erro: dict[str, str] = {}
        for tentativa in range(max_tentativas + 1):
            corpo = {"requests": [
                {"id": rid, "method": "POST", "url": url_itens,
                 "headers": {"Content-Type": "application/json"}, "body": {"fields": para_fields(linha)}}
                for rid, linha in pendentes.items()
            ]}
            status, headers, dados = transporte.post_batch(corpo)
            rel.chamadas += 1

            if status in STATUS_TRANSITORIOS:  # o $batch inteiro foi recusado
                pausa = espera(tentativa, headers.get("Retry-After"), rng)
                log.warning("lote %d: HTTP %d no $batch, aguardando %.1fs", n_lote, status, pausa)
                for rid in pendentes:
                    ultimo_erro[rid] = f"HTTP {status} no $batch"
                rel.retries += 1
                transporte.dormir(pausa)
                continue
            if status >= 400:
                msg = (dados.get("error") or {}).get("message", f"HTTP {status}")
                for rid in pendentes:
                    ultimo_erro[rid] = msg
                break

            maior_retry_after = None
            for resp in dados.get("responses", []):
                rid, st = resp["id"], resp["status"]
                if 200 <= st < 300:
                    rel.inseridas += 1
                    pendentes.pop(rid, None)
                elif st in STATUS_TRANSITORIOS:
                    ra = (resp.get("headers") or {}).get("Retry-After")
                    if ra and (maior_retry_after is None or float(ra) > float(maior_retry_after)):
                        maior_retry_after = ra
                    ultimo_erro[rid] = f"HTTP {st} (throttling)"
                else:
                    erro = (resp.get("body") or {}).get("error", {})
                    ultimo_erro[rid] = f"HTTP {st}: {erro.get('message') or erro.get('code', 'erro')}"
                    rel.dead_letter.append({"linha": rid, "erro": ultimo_erro[rid], **pendentes.pop(rid)})

            if not pendentes:
                log.info("lote %d: ok (tentativa %d)", n_lote, tentativa + 1)
                break
            if tentativa < max_tentativas:
                pausa = espera(tentativa, maior_retry_after, rng)
                log.warning("lote %d: %d item(ns) com throttling, nova tentativa em %.1fs",
                            n_lote, len(pendentes), pausa)
                rel.retries += 1
                transporte.dormir(pausa)

        for rid, linha in pendentes.items():  # esgotou as tentativas
            rel.dead_letter.append({"linha": rid, "erro": ultimo_erro.get(rid, "tentativas esgotadas"), **linha})
    return rel


def gravar_dead_letter(itens: list[dict], caminho: Path) -> None:
    if not itens:
        return
    campos = ["linha", "erro"] + [k for k in itens[0] if k not in ("linha", "erro")]
    with open(caminho, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=campos, extrasaction="ignore")
        w.writeheader()
        w.writerows(sorted(itens, key=lambda d: int(d["linha"])))


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Importa CSV para lista do SharePoint via Graph $batch.")
    ap.add_argument("csv", type=Path)
    ap.add_argument("--lote", type=int, default=LIMITE_BATCH, help="itens por $batch (1–20)")
    ap.add_argument("--tentativas", type=int, default=5, help="retries por lote")
    ap.add_argument("--dead-letter", type=Path, help="CSV de saída dos itens não importados")
    ap.add_argument("--dry-run", action="store_true", help="não acessa a rede; usa o Graph simulado")
    ap.add_argument("--falhas", type=float, default=0.1, help="(dry-run) chance de 429 por item")
    ap.add_argument("--permanentes", type=float, default=0.03, help="(dry-run) chance de erro 400 por item")
    ap.add_argument("--semente", type=int, default=42, help="(dry-run) semente aleatória")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args(argv)

    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING,
                        format="%(asctime)s %(levelname)-7s %(message)s", datefmt="%H:%M:%S")
    tamanho = max(1, min(args.lote, LIMITE_BATCH))
    linhas = ler_csv(args.csv)

    if args.dry_run:
        transporte: Transporte = GraphSimulado(args.falhas, args.permanentes, args.semente)
        site, lista = "contoso.sharepoint.com,site-simulado", "InventarioPatrimonial"
    else:
        transporte = GraphReal()
        site = os.getenv("SP_SITE_ID") or sys.exit("Defina SP_SITE_ID")
        lista = os.getenv("SP_LIST_ID") or sys.exit("Defina SP_LIST_ID")

    inicio = time.monotonic()
    rel = importar(linhas, transporte, site, lista, tamanho, args.tentativas)
    duracao = transporte.relogio if isinstance(transporte, GraphSimulado) else time.monotonic() - inicio

    dl = args.dead_letter or args.csv.with_name(args.csv.stem + "_dead_letter.csv")
    gravar_dead_letter(rel.dead_letter, dl)
    resumo = {"modo": "dry-run (Graph simulado)" if args.dry_run else "real", "linhas": rel.linhas,
              "inseridas": rel.inseridas, "dead_letter": len(rel.dead_letter), "lotes": rel.lotes,
              "chamadas_batch": rel.chamadas, "retries": rel.retries, "duracao_s": round(duracao, 1)}
    print(json.dumps(resumo, ensure_ascii=False, indent=2))
    if rel.dead_letter:
        print(f"Dead-letter: {dl}")
    return 0 if not rel.dead_letter else 3


if __name__ == "__main__":
    sys.exit(main())
