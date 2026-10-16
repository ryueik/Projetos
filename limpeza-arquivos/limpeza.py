#!/usr/bin/env python3
"""Sistema de Governança e Limpeza Automática de Arquivos.

Varre diretórios, lê os metadados de criação/modificação e remove (ou move
para quarentena) os arquivos mais antigos que a regra de retenção.

Segurança por padrão:
  * roda em modo SIMULAÇÃO; só altera algo com ``--executar``;
  * nunca segue links simbólicos e recusa diretórios de sistema;
  * padrões ``--excluir`` e extensões protegidas nunca são tocados;
  * toda execução gera um log de auditoria em JSON e CSV.

Exemplos:
    python limpeza.py C:\\Temp D:\\Exportacoes                 # simula, 30 dias
    python limpeza.py /var/tmp/relatorios --dias 15 --executar
    python limpeza.py ./downloads --incluir "*.log" "*.tmp" --excluir "*/manter/*"
    python limpeza.py ./downloads --executar --quarentena ./quarentena
"""
from __future__ import annotations

import argparse
import csv
import fnmatch
import json
import os
import shutil
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path

EXTENSOES_PROTEGIDAS_PADRAO = [".db", ".sqlite", ".mdf", ".ldf", ".pst", ".key", ".pem", ".kdbx"]


@dataclass
class Item:
    caminho: str
    tamanho: int
    criado_em: str
    modificado_em: str
    idade_dias: float
    acao: str          # manter | remover | quarentena | protegido | excluido
    motivo: str
    resultado: str = "simulado"   # simulado | ok | erro | ignorado
    erro: str = ""


@dataclass
class Relatorio:
    inicio: str
    fim: str = ""
    modo: str = "simulacao"
    dias: int = 30
    criterio: str = "modificacao"
    diretorios: list[str] = field(default_factory=list)
    analisados: int = 0
    candidatos: int = 0
    processados: int = 0
    bytes_liberados: int = 0
    erros: int = 0
    pastas_vazias_removidas: int = 0
    itens: list[Item] = field(default_factory=list)


# --------------------------------------------------------------------------
# Regras
# --------------------------------------------------------------------------
def criado_em(st: os.stat_result) -> float:
    """Data de criação: st_birthtime (Windows/macOS) ou, no Linux, o menor entre ctime e mtime."""
    birth = getattr(st, "st_birthtime", None)
    if birth:
        return birth
    if os.name == "nt":
        return st.st_ctime
    return min(st.st_ctime, st.st_mtime)


def referencia(st: os.stat_result, criterio: str) -> float:
    if criterio == "criacao":
        return criado_em(st)
    if criterio == "ambos":  # só conta como antigo se as duas datas forem antigas
        return max(criado_em(st), st.st_mtime)
    return st.st_mtime


def casa_algum(rel: str, nome: str, padroes: list[str]) -> str | None:
    rel = rel.replace("\\", "/")
    for p in padroes:
        p2 = p.replace("\\", "/")
        if fnmatch.fnmatch(nome, p2) or fnmatch.fnmatch(rel, p2) or fnmatch.fnmatch("/" + rel, p2):
            return p
    return None


def diretorio_perigoso(path: Path) -> bool:
    resolved = path.resolve()
    if resolved == Path(resolved.anchor):
        return True
    perigosos = {Path.home().resolve()}
    for env in ("SystemRoot", "ProgramFiles", "ProgramFiles(x86)", "WINDIR"):
        if os.environ.get(env):
            perigosos.add(Path(os.environ[env]).resolve())
    for d in ("/bin", "/boot", "/dev", "/etc", "/lib", "/proc", "/sbin", "/sys", "/usr", "/var", "/System", "/Library"):
        perigosos.add(Path(d))
    return resolved in perigosos


def classificar(path: Path, base: Path, st: os.stat_result, args, agora: float) -> Item:
    rel = path.relative_to(base).as_posix()
    idade = (agora - referencia(st, args.criterio)) / 86400
    item = Item(
        caminho=str(path),
        tamanho=st.st_size,
        criado_em=datetime.fromtimestamp(criado_em(st)).isoformat(timespec="seconds"),
        modificado_em=datetime.fromtimestamp(st.st_mtime).isoformat(timespec="seconds"),
        idade_dias=round(idade, 1),
        acao="manter",
        motivo="",
    )
    protegidas = {e.lower() if e.startswith(".") else "." + e.lower() for e in args.proteger_ext}
    if path.suffix.lower() in protegidas:
        item.acao, item.motivo = "protegido", f"extensão protegida ({path.suffix.lower()})"
    elif (p := casa_algum(rel, path.name, args.excluir)):
        item.acao, item.motivo = "excluido", f"padrão de exclusão ({p})"
    elif args.incluir and not casa_algum(rel, path.name, args.incluir):
        item.acao, item.motivo = "manter", "fora dos padrões de inclusão"
    elif idade < args.dias:
        item.acao, item.motivo = "manter", f"{idade:.0f} dia(s) < {args.dias}"
    else:
        item.acao = "quarentena" if args.quarentena else "remover"
        item.motivo = f"{idade:.0f} dia(s) ≥ {args.dias}"
    return item


# --------------------------------------------------------------------------
# Execução
# --------------------------------------------------------------------------
def varrer(base: Path):
    """Percorre o diretório sem seguir links simbólicos."""
    for raiz, pastas, arquivos in os.walk(base, followlinks=False):
        pastas[:] = [p for p in pastas if not os.path.islink(os.path.join(raiz, p))]
        for nome in arquivos:
            yield Path(raiz) / nome


def aplicar(item: Item, base: Path, args) -> None:
    path = Path(item.caminho)
    try:
        if item.acao == "quarentena":
            destino = Path(args.quarentena).resolve() / base.name / path.relative_to(base)
            destino.parent.mkdir(parents=True, exist_ok=True)
            if destino.exists():
                destino = destino.with_name(f"{destino.stem}_{int(time.time())}{destino.suffix}")
            shutil.move(str(path), str(destino))
            item.motivo += f" → {destino}"
        else:
            path.unlink()
        item.resultado = "ok"
    except OSError as exc:
        item.resultado, item.erro = "erro", str(exc)


def remover_pastas_vazias(base: Path) -> int:
    total = 0
    for raiz, pastas, arquivos in os.walk(base, topdown=False, followlinks=False):
        p = Path(raiz)
        if p == base or os.path.islink(p):
            continue
        try:
            if not any(p.iterdir()):
                p.rmdir()
                total += 1
        except OSError:
            pass
    return total


def executar(args) -> Relatorio:
    agora = time.time()
    rel = Relatorio(
        inicio=datetime.now().isoformat(timespec="seconds"),
        modo=("quarentena" if args.quarentena else "exclusao") if args.executar else "simulacao",
        dias=args.dias,
        criterio=args.criterio,
    )
    quarentena = Path(args.quarentena).resolve() if args.quarentena else None
    for d in args.diretorios:
        base = Path(d).expanduser()
        if not base.is_dir():
            print(f"[aviso] diretório não encontrado: {base}", file=sys.stderr)
            continue
        if diretorio_perigoso(base) and not args.permitir_raiz:
            print(f"[recusado] {base.resolve()} é um diretório de sistema/raiz. Use uma subpasta.", file=sys.stderr)
            continue
        base = base.resolve()
        rel.diretorios.append(str(base))
        for path in varrer(base):
            if path.is_symlink():
                continue
            if quarentena and quarentena in path.resolve().parents:
                continue  # nunca reprocessa a própria quarentena
            try:
                st = path.stat()
            except OSError as exc:
                rel.erros += 1
                rel.itens.append(Item(str(path), 0, "", "", 0, "manter", "sem acesso", "erro", str(exc)))
                continue
            rel.analisados += 1
            item = classificar(path, base, st, args, agora)
            if item.acao in ("remover", "quarentena"):
                rel.candidatos += 1
                if args.executar:
                    aplicar(item, base, args)
                    if item.resultado == "ok":
                        rel.processados += 1
                        rel.bytes_liberados += item.tamanho
                    else:
                        rel.erros += 1
                else:
                    rel.bytes_liberados += item.tamanho
            else:
                item.resultado = "ignorado"
            rel.itens.append(item)
        if args.executar and args.remover_pastas_vazias:
            rel.pastas_vazias_removidas += remover_pastas_vazias(base)
    rel.fim = datetime.now().isoformat(timespec="seconds")
    return rel


def salvar_auditoria(rel: Relatorio, pasta: Path, todos: bool) -> tuple[Path, Path]:
    pasta.mkdir(parents=True, exist_ok=True)
    carimbo = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
    itens = rel.itens if todos else [i for i in rel.itens if i.acao in ("remover", "quarentena") or i.resultado == "erro"]
    json_path = pasta / f"limpeza_{carimbo}.json"
    dados = asdict(rel)
    dados["itens"] = [asdict(i) for i in itens]
    json_path.write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")
    csv_path = pasta / f"limpeza_{carimbo}.csv"
    with open(csv_path, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=list(Item.__dataclass_fields__), delimiter=";")
        w.writeheader()
        for i in itens:
            w.writerow(asdict(i))
    return json_path, csv_path


def humano(n: float) -> str:
    for unidade in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024 or unidade == "TB":
            return f"{n:.1f} {unidade}" if unidade != "B" else f"{int(n)} B"
        n /= 1024
    return f"{n:.1f} TB"


def parse_args(argv=None):
    ap = argparse.ArgumentParser(description="Remove (ou põe em quarentena) arquivos mais antigos que a retenção.")
    ap.add_argument("diretorios", nargs="+", help="diretórios a varrer")
    ap.add_argument("--dias", type=int, default=30, help="retenção em dias (padrão 30)")
    ap.add_argument("--criterio", choices=["modificacao", "criacao", "ambos"], default="modificacao",
                    help="data usada na regra (padrão: modificação)")
    ap.add_argument("--incluir", nargs="*", default=[], metavar="GLOB", help='só considera estes padrões (ex.: "*.log")')
    ap.add_argument("--excluir", nargs="*", default=[], metavar="GLOB", help='nunca toca nestes padrões (ex.: "*/manter/*")')
    ap.add_argument("--proteger-ext", nargs="*", default=EXTENSOES_PROTEGIDAS_PADRAO, metavar="EXT",
                    help="extensões que nunca são removidas")
    ap.add_argument("--executar", action="store_true", help="aplica as ações (sem isso, apenas simula)")
    ap.add_argument("--quarentena", metavar="PASTA", help="move para esta pasta em vez de excluir")
    ap.add_argument("--remover-pastas-vazias", action="store_true", help="apaga subpastas que ficarem vazias")
    ap.add_argument("--auditoria", default="auditoria", metavar="PASTA", help="onde gravar os logs JSON/CSV")
    ap.add_argument("--auditoria-completa", action="store_true", help="registra também os arquivos mantidos")
    ap.add_argument("--permitir-raiz", action="store_true", help=argparse.SUPPRESS)
    args = ap.parse_args(argv)
    if args.dias < 1:
        ap.error("--dias deve ser pelo menos 1")
    return args


def main(argv=None) -> int:
    args = parse_args(argv)
    rel = executar(args)
    j, c = salvar_auditoria(rel, Path(args.auditoria), args.auditoria_completa)

    titulo = {"simulacao": "SIMULAÇÃO (nada foi alterado)", "exclusao": "EXCLUSÃO", "quarentena": "QUARENTENA"}[rel.modo]
    print(f"\n== Limpeza de arquivos · {titulo} ==")
    print(f"Regra: {rel.criterio} há {rel.dias}+ dias · diretórios: {len(rel.diretorios)}")
    for i in rel.itens:
        if i.acao in ("remover", "quarentena"):
            marca = {"simulado": "~", "ok": "✓", "erro": "✗"}.get(i.resultado, "?")
            print(f"  {marca} {i.caminho}  ({humano(i.tamanho)}, {i.idade_dias:.0f} dias){'  ERRO: ' + i.erro if i.erro else ''}")
    rotulo = "Espaço que seria liberado" if rel.modo == "simulacao" else "Espaço liberado"
    print(f"\nAnalisados: {rel.analisados} · candidatos: {rel.candidatos} · processados: {rel.processados} · erros: {rel.erros}")
    print(f"{rotulo}: {humano(rel.bytes_liberados)}")
    if rel.pastas_vazias_removidas:
        print(f"Pastas vazias removidas: {rel.pastas_vazias_removidas}")
    print(f"Auditoria: {j}\n           {c}")
    if rel.modo == "simulacao" and rel.candidatos:
        print("\nPara aplicar, rode novamente com --executar (ou --executar --quarentena PASTA).")
    if not rel.diretorios:
        return 2
    return 1 if rel.erros else 0


if __name__ == "__main__":
    sys.exit(main())
