"""
test_engine.py
==============
Testes automatizados do motor de fatiamento.
"""
from __future__ import annotations

import os
import shutil
import sys

import pytest

# Garante import do pacote src/
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))

from engine import (  # noqa: E402
    DEFAULT_LIMIT_MB,
    MB,
    PDFSplitterEngine,
    PdfInfo,
)


@pytest.fixture(scope="module")
def sample_dir(tmp_path_factory) -> str:
    """Gera PDFs de amostra em um diretório temporário."""
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    out = tmp_path_factory.mktemp("samples")
    path = out / "amostra_grande.pdf"

    c = canvas.Canvas(str(path), pagesize=A4)
    for p in range(80):
        c.setFont("Helvetica", 10)
        for line in range(60):
            c.drawString(40, 800 - line * 12, f"Linha {line} — página {p + 1} " + "x" * 80)
        c.showPage()
    c.save()

    return str(out)


@pytest.fixture()
def engine() -> PDFSplitterEngine:
    logs = []
    return PDFSplitterEngine(log_cb=logs.append, progress_cb=lambda p: None)


def test_scan_folder_finds_pdfs(engine, sample_dir):
    infos = engine.scan_folder(sample_dir)
    assert len(infos) == 1
    assert infos[0].pages == 80
    assert infos[0].ok


def test_read_metadata(engine, sample_dir):
    pdf = os.path.join(sample_dir, "amostra_grande.pdf")
    info = engine.read_metadata(pdf)
    assert info.pages == 80
    assert info.size_bytes > 0
    assert info.estimated_parts >= 1


def test_estimate_parts_small_file(engine, tmp_path):
    # PDF "pequeno" fictício
    fake = PdfInfo(path="x.pdf", name="x.pdf", size_bytes=2 * MB, pages=10)
    assert engine.estimate_parts(fake, limit_mb=3.8) == 1


def test_estimate_parts_large_file(engine):
    fake = PdfInfo(path="x.pdf", name="x.pdf", size_bytes=30 * MB, pages=300)
    parts = engine.estimate_parts(fake, limit_mb=3.8)
    assert parts >= 8  # 30 MB / 3.8 MB ≈ 8


def test_split_file_respects_limit(engine, sample_dir, tmp_path):
    pdf = os.path.join(sample_dir, "amostra_grande.pdf")
    info = engine.read_metadata(pdf)

    parts = engine.split_file(info, str(tmp_path), limit_mb=0.5)
    assert len(parts) >= 2
    for p in parts:
        assert os.path.getsize(p) <= 0.5 * MB * 1.05  # tolerância 5%
        assert os.path.basename(p).startswith("amostra_grande_parte_")


def test_naming_convention(engine, sample_dir, tmp_path):
    pdf = os.path.join(sample_dir, "amostra_grande.pdf")
    info = engine.read_metadata(pdf)
    parts = engine.split_file(info, str(tmp_path), limit_mb=1.0)
    for idx, p in enumerate(parts, start=1):
        assert f"_parte_{idx:03d}.pdf" in p


def test_split_folder(engine, sample_dir, tmp_path):
    out = tmp_path / "saida"
    parts = engine.split_folder(sample_dir, str(out), limit_mb=0.8)
    assert len(parts) >= 1
    for p in parts:
        assert os.path.exists(p)


def test_invalid_folder(engine):
    with pytest.raises(NotADirectoryError):
        engine.scan_folder("/caminho/que/nao/existe")
