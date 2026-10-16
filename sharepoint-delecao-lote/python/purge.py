#!/usr/bin/env python3
"""Expurgo em lote de itens de lista do SharePoint via Microsoft Graph.

Apaga até 5.000 itens por execução sem estourar a cota da API:

  * pagina os IDs que casam com um filtro OData ($select=id, $top=999);
  * agrupa os DELETE em `$batch` de 20 (limite do Graph);
  * controla o ritmo com um *token bucket* do lado do cliente
    (requisições por minuto configurável, cada sub-requisição conta);
  * respeita `Retry-After` em 429/503 e pausa o bucket inteiro;
  * grava um checkpoint JSON após cada lote: se cair no meio, a próxima
    execução continua de onde parou, sem listar tudo de novo.

Autenticação por client credentials (variáveis de ambiente):
    AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, SP_SITE_ID, SP_LIST_ID

Dependências só no modo real:  pip install msal requests

Exemplos:
    # Offline: lista simulada com 12.000 itens, 40% casam com o filtro
    python purge.py --dry-run --itens 12000 --proporcao 0.4 --rpm 1200
    # O mesmo sem controle de ritmo, para comparar quantos 429 aparecem
    python purge.py --dry-run --itens 12000 --proporcao 0.4 --sem-controle

    # Real
    python purge.py --filtro "fields/Status eq 'Baixado'" --rpm 600
"""
from __future__ import annotations

import argparse
import json
import logging
import math
import os
import random
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Protocol

GRAPH = "https://graph.microsoft.com/v1.0"
LIMITE_BATCH = 20
MAX_POR_EXECUCAO = 5000
TRANSITORIOS = {429, 503, 504}

log = logging.getLogger("purge")


# --------------------------------------------------------------------------
# Controle de ritmo
# --------------------------------------------------------------------------
class TokenBucket:
    """Token bucket: `taxa` fichas/segundo, rajada máxima de `capacidade`."""

    def __init__(self, por_minuto: float, relogio, dormir, rajada_s: float = 5.0) -> None:
        self.taxa = por_minuto / 60.0
        self.capacidade = max(1.0, self.taxa * rajada_s)
        self.fichas = self.capacidade
        self._relogio, self._dormir = relogio, dormir
        self._ultimo = relogio()
        self.bloqueado_ate = 0.0

    def _repor(self) -> None:
        agora = self._relogio()
        self.fichas = min(self.capacidade, self.fichas + (agora - self._ultimo) * self.taxa)
        self._ultimo = agora

    def pausar(self, segundos: float) -> None:
        """Retry-After recebido: ninguém envia nada até lá."""
        self.bloqueado_ate = max(self.bloqueado_ate, self._relogio() + segundos)
        self.fichas = 0

    def adquirir(self, n: int) -> None:
        n = min(n, self.capacidade)
        while True:
            espera_bloqueio = self.bloqueado_ate - self._relogio()
            if espera_bloqueio > 0:
                self._dormir(espera_bloqueio)
            self._repor()
            if self.fichas >= n - 1e-6:  # tolerância de ponto flutuante
                self.fichas = max(0.0, self.fichas - n)
                return
            self._dormir(max((n - self.fichas) / self.taxa, 0.001))


# --------------------------------------------------------------------------
# Transporte
# --------------------------------------------------------------------------
class Transporte(Protocol):
    def get(self, url: str) -> tuple[int, dict, dict]: ...
    def post_batch(self, corpo: dict) -> tuple[int, dict, dict]: ...
    def relogio(self) -> float: ...
    def dormir(self, s: float) -> None: ...


class GraphReal:
    def __init__(self) -> None:
        import msal
        import requests

        faltando = [v for v in ("AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET") if not os.getenv(v)]
        if faltando:
            raise SystemExit(f"Defina as variáveis de ambiente: {', '.join(faltando)} (ou use --dry-run)")
        self._app = msal.ConfidentialClientApplication(
            os.environ["AZURE_CLIENT_ID"], client_credential=os.environ["AZURE_CLIENT_SECRET"],
            authority=f"https://login.microsoftonline.com/{os.environ['AZURE_TENANT_ID']}")
        self._http = requests.Session()

    def _headers(self) -> dict:
        tok = self._app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
        if "access_token" not in tok:
            raise RuntimeError(f"Falha na autenticação: {tok.get('error_description', tok)}")
        # Filtrar por coluna não indexada exige este cabeçalho em listas grandes.
        return {"Authorization": f"Bearer {tok['access_token']}",
                "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly"}

    def get(self, url: str):
        r = self._http.get(url if url.startswith("http") else GRAPH + url, headers=self._headers(), timeout=60)
        return r.status_code, dict(r.headers), (r.json() if r.content else {})

    def post_batch(self, corpo: dict):
        r = self._http.post(f"{GRAPH}/$batch", json=corpo, headers=self._headers(), timeout=120)
        return r.status_code, dict(r.headers), (r.json() if r.content else {})

    def relogio(self) -> float:
        return time.monotonic()

    def dormir(self, s: float) -> None:
        time.sleep(s)


class GraphSimulado:
    """Lista em memória + servidor com cota de `limite_rpm` sub-requisições/min.

    Quando a cota acaba, cada sub-requisição recebe 429 com Retry-After.
    Se o cliente insiste durante o bloqueio, o servidor aumenta a punição
    (como o SharePoint Online faz com quem ignora o Retry-After).
    O tempo é virtual: o dry-run termina na hora.
    """

    def __init__(self, itens: int, proporcao: float, limite_rpm: int, semente: int = 7) -> None:
        rng = random.Random(semente)
        self.itens = {i: ("Baixado" if rng.random() < proporcao else "Ativo") for i in range(1, itens + 1)}
        self.t = 0.0
        self.taxa = limite_rpm / 60.0
        self.cota = self.taxa * 10  # rajada de 10 s
        self.fichas = self.cota
        self._ult = 0.0
        self.bloqueio_ate = 0.0
        self.punicao = 0
        self.recebidos_429 = 0

    def relogio(self) -> float:
        return self.t

    def dormir(self, s: float) -> None:
        self.t += max(0.0, s)

    def _consumir(self) -> float | None:
        """Devolve None se aceitou, ou o Retry-After em segundos."""
        self.fichas = min(self.cota, self.fichas + (self.t - self._ult) * self.taxa)
        self._ult = self.t
        if self.t < self.bloqueio_ate:
            self.punicao += 1
            # insistir durante o bloqueio estende a punição (até 30 s à frente)
            self.bloqueio_ate = min(self.bloqueio_ate + 0.1, self.t + 30)
            return self.bloqueio_ate - self.t
        if self.fichas >= 1:
            self.fichas -= 1
            self.punicao = max(0, self.punicao - 1)
            return None
        self.bloqueio_ate = self.t + max(1.0, (1 - self.fichas) / self.taxa)
        return self.bloqueio_ate - self.t

    def get(self, url: str):
        self.t += 0.4
        # Simula $filter=fields/Status eq 'Baixado', $top=999 com skiptoken
        inicio = int(url.split("skip=")[1]) if "skip=" in url else 0
        ids = sorted(i for i, s in self.itens.items() if s == "Baixado")
        pagina = ids[inicio:inicio + 999]
        corpo = {"value": [{"id": str(i)} for i in pagina]}
        if inicio + 999 < len(ids):
            corpo["@odata.nextLink"] = f"sim://items?skip={inicio + 999}"
        return 200, {}, corpo

    def post_batch(self, corpo: dict):
        self.t += 0.25 + 0.03 * len(corpo["requests"])
        resp = []
        for req in corpo["requests"]:
            ra = self._consumir()
            item_id = int(req["url"].rsplit("/", 1)[1])
            if ra is not None:
                self.recebidos_429 += 1
                resp.append({"id": req["id"], "status": 429, "headers": {"Retry-After": str(max(1, math.ceil(ra)))}})
            elif item_id in self.itens:
                del self.itens[item_id]
                resp.append({"id": req["id"], "status": 204})
            else:
                resp.append({"id": req["id"], "status": 404, "body": {"error": {"code": "itemNotFound"}}})
        return 200, {}, {"responses": resp}


# --------------------------------------------------------------------------
# Checkpoint
# --------------------------------------------------------------------------
def ler_checkpoint(caminho: Path, filtro: str) -> dict | None:
    if not caminho.exists():
        return None
    dados = json.loads(caminho.read_text(encoding="utf-8"))
    if dados.get("filtro") != filtro or not dados.get("pendentes"):
        return None
    return dados


def gravar_checkpoint(caminho: Path, filtro: str, pendentes: list[str], deletados: int) -> None:
    tmp = caminho.with_suffix(".tmp")
    tmp.write_text(json.dumps({"filtro": filtro, "pendentes": pendentes, "deletados": deletados,
                               "atualizado": datetime.now(timezone.utc).isoformat()}, indent=1), encoding="utf-8")
    tmp.replace(caminho)  # gravação atômica


# --------------------------------------------------------------------------
# Expurgo
# --------------------------------------------------------------------------
@dataclass
class Relatorio:
    deletados: int = 0
    nao_encontrados: int = 0
    lotes: int = 0
    respostas_429: int = 0
    falhas: int = 0
    duracao: float = 0.0
    restantes: int = 0


def listar_ids(tr: Transporte, site: str, lista: str, filtro: str, limite: int) -> list[str]:
    url = (f"/sites/{site}/lists/{lista}/items?$select=id&$top=999"
           f"&$filter={filtro}" if filtro else f"/sites/{site}/lists/{lista}/items?$select=id&$top=999")
    ids: list[str] = []
    while url and len(ids) < limite:
        st, hd, corpo = tr.get(url)
        if st in TRANSITORIOS:
            tr.dormir(float(hd.get("Retry-After", 10)))
            continue
        if st >= 400:
            raise RuntimeError(f"Falha ao listar itens: HTTP {st} {corpo}")
        ids += [v["id"] for v in corpo.get("value", [])]
        url = corpo.get("@odata.nextLink")
    return ids[:limite]


def expurgar(tr: Transporte, site: str, lista: str, ids: list[str], *, lote: int, rpm: float,
             controle: bool, checkpoint: Path | None, filtro: str, max_tentativas: int = 8) -> Relatorio:
    rel = Relatorio()
    inicio = tr.relogio()
    balde = TokenBucket(rpm, tr.relogio, tr.dormir) if controle else None
    pendentes = list(ids)

    while pendentes:
        grupo = pendentes[:lote]
        rel.lotes += 1
        tentativa = 0
        while grupo:
            if balde:
                balde.adquirir(len(grupo))
            corpo = {"requests": [{"id": str(i), "method": "DELETE", "url": f"/sites/{site}/lists/{lista}/items/{item}"}
                                  for i, item in enumerate(grupo)]}
            st, hd, dados = tr.post_batch(corpo)
            if st in TRANSITORIOS:
                rel.respostas_429 += len(grupo)
                pausa = float(hd.get("Retry-After", 2 ** tentativa))
                tentativa += 1
                if balde:
                    balde.pausar(pausa)
                else:
                    tr.dormir(min(2 ** tentativa, 30))
                continue
            refazer, maior_ra = [], 0.0
            for r in dados.get("responses", []):
                item = grupo[int(r["id"])]
                if r["status"] in (200, 204):
                    rel.deletados += 1
                elif r["status"] == 404:  # já apagado (ex.: execução anterior caiu após o DELETE)
                    rel.nao_encontrados += 1
                elif r["status"] in TRANSITORIOS:
                    rel.respostas_429 += 1
                    refazer.append(item)
                    maior_ra = max(maior_ra, float((r.get("headers") or {}).get("Retry-After", 1)))
                else:
                    rel.falhas += 1
                    log.error("item %s: HTTP %s %s", item, r["status"], r.get("body"))
            grupo = refazer
            if grupo:
                tentativa += 1
                if tentativa > max_tentativas:
                    log.error("%d itens desistidos após %d tentativas", len(grupo), max_tentativas)
                    rel.falhas += len(grupo)
                    break
                if balde:
                    balde.pausar(maior_ra)          # respeita o Retry-After do servidor
                else:
                    tr.dormir(min(0.5 * 2 ** tentativa, 30))  # sem controle: backoff cego
        pendentes = pendentes[lote:]
        if checkpoint:
            gravar_checkpoint(checkpoint, filtro, pendentes, rel.deletados)
        if rel.lotes % 25 == 0:
            log.info("%d deletados · %d lotes · %d respostas 429 · t=%.0fs",
                     rel.deletados, rel.lotes, rel.respostas_429, tr.relogio() - inicio)
    rel.duracao = tr.relogio() - inicio
    return rel


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Apaga itens de lista do SharePoint em lote, com controle de cota.")
    ap.add_argument("--filtro", default="fields/Status eq 'Baixado'", help="filtro OData sobre fields/…")
    ap.add_argument("--max", type=int, default=MAX_POR_EXECUCAO, help="máximo de itens por execução (padrão 5000)")
    ap.add_argument("--lote", type=int, default=LIMITE_BATCH, help="DELETEs por $batch (1–20)")
    ap.add_argument("--rpm", type=float, default=540, help="requisições por minuto permitidas ao cliente")
    ap.add_argument("--sem-controle", action="store_true", help="desliga o token bucket e ignora Retry-After")
    ap.add_argument("--checkpoint", type=Path, default=Path("purge_checkpoint.json"))
    ap.add_argument("--dry-run", action="store_true", help="lista e servidor simulados, sem rede")
    ap.add_argument("--itens", type=int, default=12000, help="(dry-run) tamanho da lista")
    ap.add_argument("--proporcao", type=float, default=0.4, help="(dry-run) fração que casa com o filtro")
    ap.add_argument("--limite-servidor", type=int, default=600, help="(dry-run) cota do servidor em req/min")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args(argv)

    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING,
                        format="%(levelname)-7s %(message)s")
    lote = max(1, min(args.lote, LIMITE_BATCH))
    limite = max(1, min(args.max, MAX_POR_EXECUCAO))

    if args.dry_run:
        tr: Transporte = GraphSimulado(args.itens, args.proporcao, args.limite_servidor)
        site, lista = "contoso.sharepoint.com,site-simulado", "InventarioPatrimonial"
    else:
        tr = GraphReal()
        site = os.getenv("SP_SITE_ID") or sys.exit("Defina SP_SITE_ID")
        lista = os.getenv("SP_LIST_ID") or sys.exit("Defina SP_LIST_ID")

    retomado = ler_checkpoint(args.checkpoint, args.filtro) if not args.dry_run else None
    if retomado:
        ids = retomado["pendentes"][:limite]
        print(f"Retomando checkpoint de {retomado['atualizado']}: {len(retomado['pendentes'])} pendentes")
    else:
        ids = listar_ids(tr, site, lista, args.filtro, limite)
    print(f"{len(ids)} itens para apagar (limite por execução: {limite})")

    cp = None if args.dry_run else args.checkpoint
    rel = expurgar(tr, site, lista, ids, lote=lote, rpm=args.rpm, controle=not args.sem_controle,
                   checkpoint=cp, filtro=args.filtro)
    if cp and cp.exists():
        cp.unlink()  # terminou: checkpoint não é mais necessário

    resumo = {
        "modo": ("dry-run" if args.dry_run else "real") + (" · sem controle" if args.sem_controle else " · token bucket"),
        "deletados": rel.deletados, "ja_inexistentes": rel.nao_encontrados, "lotes": rel.lotes,
        "respostas_429": rel.respostas_429, "falhas": rel.falhas, "duracao_s": round(rel.duracao, 1),
        "itens_por_min": round(rel.deletados / rel.duracao * 60, 1) if rel.duracao else None,
    }
    if isinstance(tr, GraphSimulado):
        resumo["restam_no_filtro"] = sum(1 for s in tr.itens.values() if s == "Baixado")
    print(json.dumps(resumo, ensure_ascii=False, indent=2))
    return 0 if not rel.falhas else 4


if __name__ == "__main__":
    sys.exit(main())
