#!/usr/bin/env python3
"""Web Scraper e Extrator Cadastral de Médicos (CRM).

Percorre as páginas de resultado do portal médico para cada UF, extrai os
dados cadastrais com XPath (lxml) e gera um CSV por UF e um CSV consolidado.

Os seletores, a URL e os limites de cortesia (atraso entre requisições,
tentativas, timeout) ficam em ``config.json``.

Uso:
    python scraper.py --offline                 # usa as páginas de exemplo/ (sem rede)
    python scraper.py --ufs SP RJ               # raspa o portal configurado
    python scraper.py --config outro.json --saida resultados
"""
from __future__ import annotations

import argparse
import csv
import json
import logging
import sys
import time
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin

from lxml import html as lxml_html

HERE = Path(__file__).resolve().parent
log = logging.getLogger("crm-scraper")

CAMPOS_CSV = ["uf", "crm", "nome", "situacao", "especialidades", "inscricao", "data_inscricao", "pagina", "coletado_em"]


@dataclass
class Medico:
    uf: str
    crm: str
    nome: str
    situacao: str
    especialidades: list[str] = field(default_factory=list)
    inscricao: str = ""
    data_inscricao: str = ""
    pagina: int = 1
    coletado_em: str = ""

    def to_row(self) -> dict:
        row = asdict(self)
        row["especialidades"] = " | ".join(self.especialidades)
        return row


# --------------------------------------------------------------------------
# Configuração
# --------------------------------------------------------------------------
def load_config(path: Path) -> dict:
    with open(path, encoding="utf-8") as fh:
        cfg = json.load(fh)
    obrigatorios = ["item", "nome", "crm", "uf", "situacao", "proxima_pagina"]
    faltando = [k for k in obrigatorios if k not in cfg.get("seletores", {})]
    if faltando:
        raise SystemExit(f"config.json sem seletores obrigatórios: {', '.join(faltando)}")
    return cfg


# --------------------------------------------------------------------------
# Busca de páginas (online com requests, offline com arquivos locais)
# --------------------------------------------------------------------------
class OnlineFetcher:
    def __init__(self, cfg: dict):
        import requests  # importado aqui para o modo offline não exigir a dependência

        self.requests = requests
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": cfg.get("user_agent", "crm-scraper/1.0")})
        self.tentativas = int(cfg.get("tentativas", 3))
        self.timeout = float(cfg.get("timeout_segundos", 20))
        self.atraso = float(cfg.get("atraso_segundos", 1.5))
        self._ultimo = 0.0

    def _respeitar_atraso(self):
        espera = self.atraso - (time.monotonic() - self._ultimo)
        if espera > 0:
            time.sleep(espera)
        self._ultimo = time.monotonic()

    def get(self, url: str) -> str:
        ultimo_erro: Exception | None = None
        for tentativa in range(1, self.tentativas + 1):
            self._respeitar_atraso()
            try:
                resp = self.session.get(url, timeout=self.timeout)
                if resp.status_code in (429, 500, 502, 503, 504):
                    raise self.requests.HTTPError(f"HTTP {resp.status_code}")
                resp.raise_for_status()
                resp.encoding = resp.encoding or resp.apparent_encoding
                return resp.text
            except self.requests.RequestException as exc:
                ultimo_erro = exc
                pausa = self.atraso * (2 ** (tentativa - 1))
                log.warning("  falha em %s (tentativa %d/%d): %s; nova tentativa em %.1fs",
                            url, tentativa, self.tentativas, exc, pausa)
                time.sleep(pausa)
        raise RuntimeError(f"Desisti de {url} após {self.tentativas} tentativas: {ultimo_erro}")


class OfflineFetcher:
    """Lê as páginas de exemplo do disco; os links de paginação são caminhos relativos."""

    def get(self, url: str) -> str:
        path = Path(url)
        if not path.is_file():
            raise RuntimeError(f"Página offline não encontrada: {path}")
        return path.read_text(encoding="utf-8")


# --------------------------------------------------------------------------
# Extração
# --------------------------------------------------------------------------
def _xpath_text(node, expr: str) -> str:
    res = node.xpath(expr)
    if isinstance(res, list):
        res = " ".join(str(r).strip() for r in res if str(r).strip())
    return " ".join(str(res).split())


def _xpath_list(node, expr: str) -> list[str]:
    res = node.xpath(expr)
    if not isinstance(res, list):
        res = [res]
    return [" ".join(str(r).split()) for r in res if str(r).strip()]


def normalizar_situacao(texto: str) -> str:
    t = texto.strip().lower()
    if t in {"regular", "ativo", "a"}:
        return "Regular"
    if not t:
        return "Não informado"
    return "Irregular"


def normalizar_data(texto: str) -> str:
    try:
        return datetime.strptime(texto.strip(), "%d/%m/%Y").strftime("%Y-%m-%d")
    except ValueError:
        return texto.strip()


def parse_page(html_text: str, seletores: dict, pagina: int = 1) -> tuple[list[Medico], str | None]:
    """Extrai os médicos de uma página e devolve também o href da próxima página."""
    doc = lxml_html.fromstring(html_text)
    agora = datetime.now().isoformat(timespec="seconds")
    medicos: list[Medico] = []
    for item in doc.xpath(seletores["item"]):
        crm = "".join(ch for ch in _xpath_text(item, seletores["crm"]) if ch.isdigit())
        if not crm:
            continue
        nome = _xpath_text(item, seletores["nome"]).title()
        for preposicao in (" Da ", " De ", " Do ", " Das ", " Dos ", " E "):
            nome = nome.replace(preposicao, preposicao.lower())
        medicos.append(Medico(
            uf=_xpath_text(item, seletores["uf"]).upper(),
            crm=crm,
            nome=nome,
            situacao=normalizar_situacao(_xpath_text(item, seletores["situacao"])),
            especialidades=_xpath_list(item, seletores["especialidade"]) if seletores.get("especialidade") else [],
            inscricao=_xpath_text(item, seletores["inscricao"]) if seletores.get("inscricao") else "",
            data_inscricao=normalizar_data(_xpath_text(item, seletores["data_inscricao"])) if seletores.get("data_inscricao") else "",
            pagina=pagina,
            coletado_em=agora,
        ))
    proxima = doc.xpath(seletores["proxima_pagina"])
    href = str(proxima[0]).strip() if proxima else None
    return medicos, href or None


def raspar_uf(uf: str, cfg: dict, fetcher, offline: bool) -> list[Medico]:
    seletores = cfg["seletores"]
    max_paginas = int(cfg.get("max_paginas", 50))
    if offline:
        url: str | None = str((HERE / cfg.get("offline_pagina_inicial", "exemplo/pagina_resultado.html")).resolve())
    else:
        url = cfg["base_url"].format(uf=uf, pagina=1)

    vistos: set[str] = set()
    coletados: list[Medico] = []
    pagina = 0
    while url and pagina < max_paginas:
        pagina += 1
        if url in vistos:
            log.warning("  [%s] link de paginação repetido, encerrando", uf)
            break
        vistos.add(url)
        medicos, href = parse_page(fetcher.get(url), seletores, pagina)
        if offline:
            # As páginas de exemplo misturam UFs; filtra a UF pedida.
            medicos = [m for m in medicos if m.uf == uf]
        coletados.extend(medicos)
        log.info("  [%s] página %d: %d registro(s)", uf, pagina, len(medicos))
        if not href:
            break
        url = str((Path(url).parent / href).resolve()) if offline else urljoin(url, href)
    return coletados


# --------------------------------------------------------------------------
# Saída
# --------------------------------------------------------------------------
def deduplicar(medicos: list[Medico]) -> list[Medico]:
    vistos, unicos = set(), []
    for m in medicos:
        chave = (m.uf, m.crm)
        if chave not in vistos:
            vistos.add(chave)
            unicos.append(m)
    return unicos


def salvar_csv(path: Path, medicos: list[Medico]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.DictWriter(fh, fieldnames=CAMPOS_CSV, delimiter=";")
        writer.writeheader()
        for m in medicos:
            writer.writerow(m.to_row())


def resumo(medicos: list[Medico]) -> str:
    por_uf: dict[str, Counter] = defaultdict(Counter)
    for m in medicos:
        por_uf[m.uf][m.situacao] += 1
    linhas = ["", f"{'UF':<4}{'Regular':>9}{'Irregular':>11}{'Total':>7}"]
    for uf in sorted(por_uf):
        c = por_uf[uf]
        linhas.append(f"{uf:<4}{c['Regular']:>9}{c['Irregular']:>11}{sum(c.values()):>7}")
    total = Counter(m.situacao for m in medicos)
    linhas.append(f"{'—':<4}{total['Regular']:>9}{total['Irregular']:>11}{len(medicos):>7}")
    return "\n".join(linhas)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Extrai cadastro de médicos por UF e gera CSV consolidado.")
    ap.add_argument("--config", default=str(HERE / "config.json"), help="arquivo de configuração (padrão: config.json)")
    ap.add_argument("--ufs", nargs="+", help="UFs a raspar (padrão: as do config)")
    ap.add_argument("--saida", help="pasta de saída (padrão: pasta_saida do config)")
    ap.add_argument("--offline", action="store_true", help="usa as páginas de exemplo/ em vez da rede")
    ap.add_argument("-q", "--quiet", action="store_true", help="mostra só o resumo")
    args = ap.parse_args(argv)

    logging.basicConfig(level=logging.WARNING if args.quiet else logging.INFO, format="%(message)s")
    cfg = load_config(Path(args.config))
    ufs = [u.upper() for u in (args.ufs or cfg.get("ufs", []))]
    if not ufs:
        ap.error("informe ao menos uma UF")
    saida = Path(args.saida or HERE / cfg.get("pasta_saida", "saida"))
    fetcher = OfflineFetcher() if args.offline else OnlineFetcher(cfg)

    log.info("Iniciando coleta (%s) para %s", "offline" if args.offline else "online", ", ".join(ufs))
    todos: list[Medico] = []
    falhas = []
    for uf in ufs:
        try:
            dados = deduplicar(raspar_uf(uf, cfg, fetcher, args.offline))
        except Exception as exc:  # uma UF com problema não derruba as outras
            log.error("  [%s] erro: %s", uf, exc)
            falhas.append(uf)
            continue
        salvar_csv(saida / f"medicos_{uf}.csv", dados)
        log.info("  [%s] %d registro(s) -> %s", uf, len(dados), saida / f"medicos_{uf}.csv")
        todos.extend(dados)

    consolidado = saida / "medicos_consolidado.csv"
    salvar_csv(consolidado, todos)
    print(resumo(todos))
    print(f"\nCSV consolidado: {consolidado}")
    if falhas:
        print(f"UFs com falha: {', '.join(falhas)}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
