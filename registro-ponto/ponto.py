"""
ponto.py — versão desktop do Registro de Ponto Híbrido.

Grava entradas e saídas em ``ponto.csv`` no mesmo formato da versão web
(``data;entrada;saida;origem``), então os dois lados podem trocar arquivos.

Uso:
    python ponto.py entrada
    python ponto.py saida
    python ponto.py resumo [--jornada 8]
    python ponto.py importar outro.csv
"""
from __future__ import annotations

import argparse
import csv
import sys
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path

ARQUIVO = Path(__file__).with_name("ponto.csv")
CAMPOS = ["data", "entrada", "saida", "origem"]


@dataclass
class Registro:
    data: str
    entrada: str
    saida: str = ""
    origem: str = "desktop"

    @property
    def inicio(self) -> datetime:
        return datetime.fromisoformat(f"{self.data}T{self.entrada}")

    def duracao(self, agora: datetime | None = None) -> timedelta:
        fim = datetime.fromisoformat(f"{self.data}T{self.saida}") if self.saida else (agora or datetime.now())
        return max(fim - self.inicio, timedelta(0))


def carregar(caminho: Path | None = None) -> list[Registro]:
    caminho = caminho or ARQUIVO
    if not caminho.exists():
        return []
    with caminho.open(encoding="utf-8", newline="") as f:
        return [Registro(**{k: (r.get(k) or "") for k in CAMPOS}) for r in csv.DictReader(f, delimiter=";")]


def salvar(registros: list[Registro], caminho: Path | None = None) -> None:
    caminho = caminho or ARQUIVO
    unicos = {(r.data, r.entrada): r for r in registros}
    ordenados = sorted(unicos.values(), key=lambda r: r.inicio)
    with caminho.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=CAMPOS, delimiter=";")
        w.writeheader()
        for r in ordenados:
            w.writerow(r.__dict__)


def em_aberto(registros: list[Registro]) -> Registro | None:
    return next((r for r in registros if not r.saida), None)


def fmt(td: timedelta) -> str:
    minutos = int(abs(td.total_seconds()) // 60)
    sinal = "-" if td.total_seconds() < 0 else ""
    return f"{sinal}{minutos // 60}h{minutos % 60:02d}"


def cmd_entrada(_: argparse.Namespace) -> int:
    regs = carregar()
    aberto = em_aberto(regs)
    if aberto:
        print(f"Já existe uma entrada aberta desde {aberto.entrada} de {aberto.data}.")
        return 1
    agora = datetime.now()
    regs.append(Registro(agora.strftime("%Y-%m-%d"), agora.strftime("%H:%M")))
    salvar(regs)
    print(f"Entrada registrada às {agora:%H:%M}.")
    return 0


def cmd_saida(_: argparse.Namespace) -> int:
    regs = carregar()
    aberto = em_aberto(regs)
    if not aberto:
        print("Nenhuma entrada aberta.")
        return 1
    agora = datetime.now()
    aberto.saida = agora.strftime("%H:%M")
    salvar(regs)
    print(f"Saída registrada às {agora:%H:%M} ({fmt(aberto.duracao())} neste período).")
    return 0


def cmd_resumo(args: argparse.Namespace) -> int:
    regs = carregar()
    jornada = timedelta(hours=args.jornada)
    hoje = date.today()
    print(f"{'Dia':<12}{'Trabalhado':>12}{'Saldo':>10}")
    total_saldo = timedelta(0)
    for i in range(6, -1, -1):
        dia = (hoje - timedelta(days=i)).isoformat()
        trabalhado = sum((r.duracao() for r in regs if r.data == dia), timedelta(0))
        if not trabalhado:
            continue
        saldo = trabalhado - jornada
        total_saldo += saldo
        print(f"{dia:<12}{fmt(trabalhado):>12}{fmt(saldo):>10}")
    print(f"\nSaldo da semana: {fmt(total_saldo)}")
    return 0


def cmd_importar(args: argparse.Namespace) -> int:
    novos = carregar(Path(args.arquivo))
    regs = carregar()
    antes = len({(r.data, r.entrada) for r in regs})
    salvar(regs + novos)
    depois = len(carregar())
    print(f"{depois - antes} registro(s) novo(s) importado(s).")
    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Registro de ponto (desktop)")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("entrada").set_defaults(fn=cmd_entrada)
    sub.add_parser("saida").set_defaults(fn=cmd_saida)
    r = sub.add_parser("resumo")
    r.add_argument("--jornada", type=float, default=8.0)
    r.set_defaults(fn=cmd_resumo)
    i = sub.add_parser("importar")
    i.add_argument("arquivo")
    i.set_defaults(fn=cmd_importar)
    args = p.parse_args(argv)
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
