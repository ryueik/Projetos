#!/usr/bin/env python3
"""ETL de planilhas para ingestão no SharePoint (App Inventário Patrimonial).

Lê uma planilha bruta (.csv ou .xlsx), padroniza e valida cada linha e grava:

  * <saida>/inventario_sharepoint.csv  – pronto para importar na lista
  * <saida>/rejeitados.csv              – linhas recusadas, com o motivo
  * <saida>/resumo.json                 – contagens da execução

Regras aplicadas (as mesmas da versão web em index.html):

  1. Cabeçalhos: acentos/maiúsculas/espaços são ignorados e cada coluna é
     mapeada para o *nome interno* da coluna no SharePoint (Title, Descricao…).
  2. Texto: trim, espaços duplicados removidos; nomes de pessoa em Title Case.
  3. Datas: dd/mm/aaaa, dd-mm-aa, aaaa-mm-dd e aaaa/mm/dd → ISO 8601 (aaaa-mm-dd).
  4. Números: "R$ 1.234,56", "1234,5", "5899.90" → 1234.56 (ponto decimal).
  5. Chave (Nº patrimônio) em maiúsculas; duplicatas ficam só na 1ª ocorrência.
  6. Campos obrigatórios vazios, datas/valores inválidos e status fora das
     opções da coluna Choice vão para o relatório de rejeitados.

Somente biblioteca padrão. Para ler .xlsx instale `openpyxl` (opcional).

Uso:
    python etl.py exemplo/inventario_bruto.csv -o saida
    python etl.py planilha.xlsx -o saida --aba "Inventário"
    python etl.py bruto.csv -o saida --mapa mapa.json   # mapeamento próprio
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import unicodedata
from collections import Counter
from datetime import date
from pathlib import Path

# --------------------------------------------------------------------------
# Configuração padrão: coluna interna do SharePoint → apelidos aceitos
# --------------------------------------------------------------------------
COLUNAS = {
    "Title": {"aliases": ["n patrimonio", "no patrimonio", "patrimonio", "numero patrimonio", "plaqueta", "tag"],
              "tipo": "chave", "obrigatorio": True},
    "Descricao": {"aliases": ["descricao do bem", "descricao", "item", "bem"], "tipo": "texto", "obrigatorio": True},
    "Categoria": {"aliases": ["categoria", "grupo", "classe"], "tipo": "categoria", "obrigatorio": True},
    "Localizacao": {"aliases": ["local", "localizacao", "setor", "unidade"], "tipo": "texto", "obrigatorio": False},
    "Responsavel": {"aliases": ["responsavel", "custodiante", "usuario"], "tipo": "pessoa", "obrigatorio": False},
    "DataAquisicao": {"aliases": ["data aquisicao", "data de aquisicao", "dt aquisicao", "data compra"],
                      "tipo": "data", "obrigatorio": True},
    "ValorAquisicao": {"aliases": ["valor r", "valor", "valor aquisicao", "valor de aquisicao", "custo"],
                       "tipo": "numero", "obrigatorio": True},
    "Status": {"aliases": ["status", "situacao"], "tipo": "escolha", "obrigatorio": True,
               "opcoes": ["Ativo", "Em manutenção", "Inativo", "Baixado"]},
}
CHAVE = "Title"


def sem_acento(texto: str) -> str:
    nfkd = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def slug(texto: str) -> str:
    """'Nº Patrimônio ' → 'n patrimonio' (base para casar cabeçalhos)."""
    t = sem_acento(texto).lower().replace("º", "").replace("°", "")
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return t.strip()


def limpa(texto) -> str:
    return re.sub(r"\s+", " ", str(texto if texto is not None else "")).strip()


# --------------------------------------------------------------------------
# Conversores
# --------------------------------------------------------------------------
_DATAS = [
    (re.compile(r"^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$"), ("a", "m", "d")),
    (re.compile(r"^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$"), ("d", "m", "a")),
    (re.compile(r"^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2})$"), ("d", "m", "a2")),
]


def para_data(valor: str) -> str:
    v = limpa(valor)
    if hasattr(valor, "isoformat"):  # célula datetime vinda do openpyxl
        return valor.date().isoformat() if hasattr(valor, "date") else valor.isoformat()
    for rx, ordem in _DATAS:
        m = rx.match(v)
        if not m:
            continue
        partes = dict(zip(ordem, m.groups()))
        ano = int(partes["a"]) if "a" in partes else 2000 + int(partes["a2"])
        if "a2" in partes and ano > date.today().year:
            ano -= 100
        try:
            return date(ano, int(partes["m"]), int(partes["d"])).isoformat()
        except ValueError:
            raise ValueError(f"data inexistente: {v!r}") from None
    raise ValueError(f"data não reconhecida: {v!r}")


def para_numero(valor) -> float:
    if isinstance(valor, (int, float)):
        return round(float(valor), 2)
    v = limpa(valor).replace("R$", "").replace(" ", "")
    if not v:
        raise ValueError("valor vazio")
    if "," in v:  # formato brasileiro: 1.234,56
        v = v.replace(".", "").replace(",", ".")
    elif v.count(".") > 1:  # 1.234.567
        v = v.replace(".", "")
    if not re.fullmatch(r"-?\d+(\.\d+)?", v):
        raise ValueError(f"número inválido: {valor!r}")
    return round(float(v), 2)


def title_case(texto: str) -> str:
    minusculas = {"da", "de", "do", "das", "dos", "e"}
    palavras = limpa(texto).lower().split(" ")
    return " ".join(p if (i and p in minusculas) else p[:1].upper() + p[1:] for i, p in enumerate(palavras) if p)


# --------------------------------------------------------------------------
# Leitura
# --------------------------------------------------------------------------
def ler_planilha(caminho: Path, aba: str | None = None) -> tuple[list[str], list[list]]:
    if caminho.suffix.lower() in (".xlsx", ".xlsm"):
        try:
            from openpyxl import load_workbook
        except ImportError:
            sys.exit("Para ler .xlsx instale o openpyxl:  pip install openpyxl")
        wb = load_workbook(caminho, read_only=True, data_only=True)
        ws = wb[aba] if aba else wb.active
        linhas = [list(r) for r in ws.iter_rows(values_only=True)]
        wb.close()
    else:
        bruto = caminho.read_text(encoding="utf-8-sig", errors="replace")
        try:
            dialeto = csv.Sniffer().sniff(bruto[:4096], delimiters=";,\t|")
            delim = dialeto.delimiter
        except csv.Error:
            delim = ";"
        linhas = list(csv.reader(bruto.splitlines(), delimiter=delim))
    if not linhas:
        return [], []
    return [limpa(c) for c in linhas[0]], linhas[1:]


def mapear_cabecalhos(cabecalhos: list[str], colunas: dict) -> dict[str, int]:
    """Devolve {nome_interno: índice_da_coluna_na_planilha}."""
    mapa: dict[str, int] = {}
    slugs = [slug(c) for c in cabecalhos]
    for interno, cfg in colunas.items():
        candidatos = [slug(interno)] + [slug(a) for a in cfg["aliases"]]
        for cand in candidatos:
            if cand in slugs and slugs.index(cand) not in mapa.values():
                mapa[interno] = slugs.index(cand)
                break
    return mapa


# --------------------------------------------------------------------------
# Transformação
# --------------------------------------------------------------------------
def transformar(cabecalhos: list[str], linhas: list[list], colunas: dict = COLUNAS) -> dict:
    mapa = mapear_cabecalhos(cabecalhos, colunas)
    faltando = [c for c, cfg in colunas.items() if cfg["obrigatorio"] and c not in mapa]
    if faltando:
        raise SystemExit(f"Colunas obrigatórias não encontradas na planilha: {', '.join(faltando)}")

    # Categoria: a grafia mais comum (preferindo a acentuada) vira a oficial.
    idx_cat = mapa.get("Categoria")
    grafias: dict[str, Counter] = {}
    if idx_cat is not None:
        for ln in linhas:
            bruto = limpa(ln[idx_cat]) if idx_cat < len(ln) else ""
            if bruto:
                grafias.setdefault(slug(bruto), Counter())[bruto[:1].upper() + bruto[1:].lower()] += 1
    canon_cat = {
        k: max(c.items(), key=lambda kv: (kv[1], kv[0] != sem_acento(kv[0])))[0] for k, c in grafias.items()
    }

    validas, rejeitadas = [], []
    vistos: dict[str, int] = {}
    stats = Counter(lidas=0, vazias=0, validas=0, rejeitadas=0, duplicadas=0)

    for n, ln in enumerate(linhas, start=2):  # linha 1 = cabeçalho
        if not any(limpa(c) for c in ln):
            stats["vazias"] += 1
            continue
        stats["lidas"] += 1
        original = {cabecalhos[i] if i < len(cabecalhos) else f"col{i}": limpa(v) for i, v in enumerate(ln)}
        saida, erros = {}, []

        for interno, cfg in colunas.items():
            idx = mapa.get(interno)
            bruto = ln[idx] if idx is not None and idx < len(ln) else ""
            texto = limpa(bruto)
            if not texto and not isinstance(bruto, (int, float)):
                if cfg["obrigatorio"]:
                    erros.append(f"{interno} vazio")
                saida[interno] = ""
                continue
            try:
                tipo = cfg["tipo"]
                if tipo == "chave":
                    saida[interno] = texto.upper()
                elif tipo == "data":
                    saida[interno] = para_data(bruto)
                elif tipo == "numero":
                    num = para_numero(bruto)
                    if num < 0:
                        raise ValueError(f"valor negativo: {texto}")
                    saida[interno] = f"{num:.2f}"
                elif tipo == "pessoa":
                    saida[interno] = title_case(texto)
                elif tipo == "categoria":
                    saida[interno] = canon_cat.get(slug(texto), texto)
                elif tipo == "escolha":
                    opcoes = {slug(o): o for o in cfg["opcoes"]}
                    if slug(texto) not in opcoes:
                        raise ValueError(f"status '{texto}' fora das opções ({', '.join(cfg['opcoes'])})")
                    saida[interno] = opcoes[slug(texto)]
                else:
                    saida[interno] = texto
            except ValueError as exc:
                erros.append(f"{interno}: {exc}")

        chave = saida.get(CHAVE, "")
        if not erros and chave in vistos:
            stats["duplicadas"] += 1
            erros.append(f"duplicado da linha {vistos[chave]}")
        if erros:
            stats["rejeitadas"] += 1
            rejeitadas.append({"linha": n, "motivo": "; ".join(erros), **original})
        else:
            vistos[chave] = n
            stats["validas"] += 1
            validas.append(saida)

    return {"mapa": {k: cabecalhos[v] for k, v in mapa.items()}, "validas": validas,
            "rejeitadas": rejeitadas, "stats": dict(stats)}


def gravar(resultado: dict, pasta: Path, colunas: dict = COLUNAS) -> None:
    pasta.mkdir(parents=True, exist_ok=True)
    with open(pasta / "inventario_sharepoint.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(colunas))
        w.writeheader()
        w.writerows(resultado["validas"])
    campos = ["linha", "motivo"] + sorted({k for r in resultado["rejeitadas"] for k in r} - {"linha", "motivo"})
    with open(pasta / "rejeitados.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=campos, delimiter=";")
        w.writeheader()
        w.writerows(resultado["rejeitadas"])
    (pasta / "resumo.json").write_text(
        json.dumps({"stats": resultado["stats"], "mapeamento": resultado["mapa"]}, ensure_ascii=False, indent=2),
        encoding="utf-8")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Limpa e valida planilha de inventário para o SharePoint.")
    ap.add_argument("entrada", type=Path, help="arquivo .csv ou .xlsx bruto")
    ap.add_argument("-o", "--saida", type=Path, default=Path("saida"), help="pasta de saída (padrão: ./saida)")
    ap.add_argument("--aba", help="nome da aba (só .xlsx)")
    ap.add_argument("--mapa", type=Path, help="JSON com configuração de colunas no formato de COLUNAS")
    args = ap.parse_args(argv)

    colunas = json.loads(args.mapa.read_text(encoding="utf-8")) if args.mapa else COLUNAS
    cab, linhas = ler_planilha(args.entrada, args.aba)
    resultado = transformar(cab, linhas, colunas)
    gravar(resultado, args.saida, colunas)

    s = resultado["stats"]
    print(f"Lidas: {s['lidas']} | válidas: {s['validas']} | rejeitadas: {s['rejeitadas']} "
          f"(duplicadas: {s['duplicadas']}) | vazias ignoradas: {s['vazias']}")
    print(f"Saída em: {args.saida.resolve()}")
    # Código de saída 2 avisa o PAD que houve rejeições (sem ser erro fatal).
    return 2 if s["rejeitadas"] else 0


if __name__ == "__main__":
    sys.exit(main())
