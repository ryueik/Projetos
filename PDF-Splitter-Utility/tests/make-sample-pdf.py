"""
make_sample_pdf.py
==================
Gera PDFs de amostra para os testes automatizados.

Uso:
    python tests/make_sample_pdf.py
"""
from __future__ import annotations

import os
import random
import string

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples")


def _random_text(n: int = 80) -> str:
    words = [
        "petição", "processo", "requerente", "requerido", "excelentíssimo",
        "liminar", "mérito", "tutela", "antecipada", "fundamentação",
        "conclusão", "requerimento", "custas", "procuração", "documento",
    ]
    return " ".join(random.choice(words) for _ in range(n))


def make_pdf(path: str, pages: int, heavy: bool = False) -> None:
    c = canvas.Canvas(path, pagesize=A4)
    for p in range(pages):
        c.setFont("Helvetica", 11)
        y = 800
        c.drawString(60, y, f"Documento de Teste — Página {p + 1}/{pages}")
        y -= 20
        for _ in range(35):
            c.drawString(60, y, _random_text(12))
            y -= 18
            if y < 60:
                break

        if heavy:
            # "ruído" textual para inchar a página (útil para forçar divisão)
            c.setFont("Courier", 6)
            for _ in range(60):
                c.drawString(60, y, "".join(random.choices(string.ascii_letters, k=120)))
                y -= 8
                if y < 40:
                    break
        c.showPage()
    c.save()


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    small = os.path.join(OUT_DIR, "amostra_pequena.pdf")
    big = os.path.join(OUT_DIR, "amostra_grande.pdf")

    make_pdf(small, pages=10, heavy=False)
    make_pdf(big, pages=120, heavy=True)

    print(f"Gerado: {small}  ({os.path.getsize(small) / 1024:.1f} KB)")
    print(f"Gerado: {big}    ({os.path.getsize(big) / 1024 / 1024:.2f} MB)")


if __name__ == "__main__":
    main()
