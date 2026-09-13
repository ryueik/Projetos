"""
engine.py
=========
Núcleo de processamento do PDF-Splitter-Utility.

Responsabilidades
-----------------
* Varredura de diretórios em busca de arquivos PDF.
* Leitura de metadados (título, autor, nº de páginas, tamanho).
* Cálculo do fatiamento "inteligente" respeitando um limite em MB.
* Geração das partes no padrão ``[NomeOriginal]_parte_[001].pdf``.
* Callbacks de log e progresso para integração com a GUI ou CLI.

Autor  : Equipe PDF-Splitter-Utility
Licença: MIT
"""

from __future__ import annotations

import glob
import io
import math
import os
from dataclasses import dataclass
from typing import Callable, List, Optional

from pypdf import PdfReader, PdfWriter
from pypdf.errors import PdfReadError

# ---------------------------------------------------------------------------
# Constantes globais
# ---------------------------------------------------------------------------
MB: int = 1024 * 1024
DEFAULT_LIMIT_MB: float = 3.8          # Padrão corporativo (PJe / eproc)
ALERT_LIMIT_MB: float = 4.0            # Limite "vermelho" para destaque na GUI
PART_FMT: str = "_parte_{:03d}"        # Sufixo de cada parte gerada
SAFETY_FACTOR: float = 0.97            # Margem de segurança no cálculo de fatias

LogCallback = Callable[[str], None]
ProgressCallback = Callable[[float], None]
PartCallback = Callable[[int, str], None]


# ---------------------------------------------------------------------------
# Estrutura de dados de um PDF analisado
# ---------------------------------------------------------------------------
@dataclass
class PdfInfo:
    """Representa um arquivo PDF descoberto na varredura."""

    path: str
    name: str
    size_bytes: int
    pages: int = 0
    title: str = ""
    author: str = ""
    estimated_parts: int = 1
    error: str = ""

    # -- Propriedades utilitárias ------------------------------------------
    @property
    def size_mb(self) -> float:
        return self.size_bytes / MB

    @property
    def is_alert(self) -> bool:
        """True se ultrapassa o limite de alerta (> 4 MB)."""
        return self.size_mb > ALERT_LIMIT_MB

    @property
    def ok(self) -> bool:
        """True se o PDF foi lido sem erros e possui páginas."""
        return (not self.error) and self.pages > 0


# ---------------------------------------------------------------------------
# Motor principal
# ---------------------------------------------------------------------------
class PDFSplitterEngine:
    """
    Motor de fatiamento de PDFs.

    Uso típico::

        eng = PDFSplitterEngine(log_cb=print, progress_cb=print)
        infos = eng.scan_folder(r"C:\\Docs")
        for info in infos:
            eng.split_file(info, r"C:\\Docs\\saida", limit_mb=3.8)
    """

    def __init__(
        self,
        log_cb: Optional[LogCallback] = None,
        progress_cb: Optional[ProgressCallback] = None,
    ) -> None:
        self._log: LogCallback = log_cb or (lambda msg: None)
        self._progress: ProgressCallback = progress_cb or (lambda pct: None)
        self._cancel: bool = False

    # ------------------------------------------------------------------ #
    # Controle de cancelamento                                           #
    # ------------------------------------------------------------------ #
    def cancel(self) -> None:
        """Solicita o cancelamento da operação em andamento."""
        self._cancel = True

    def reset_cancel(self) -> None:
        """Reinicia a flag de cancelamento antes de uma nova tarefa."""
        self._cancel = False

    # ------------------------------------------------------------------ #
    # Varredura de diretório                                             #
    # ------------------------------------------------------------------ #
    def scan_folder(self, folder: str, recursive: bool = False) -> List[PdfInfo]:
        """
        Varre ``folder`` em busca de arquivos ``*.pdf`` e retorna a lista
        de :class:`PdfInfo` com metadados preenchidos.
        """
        if not os.path.isdir(folder):
            raise NotADirectoryError(f"Pasta de entrada inválida: {folder}")

        self._log(f"[SCAN] Varrendo: {folder} (recursivo={recursive})")

        results: List[PdfInfo] = []
        pattern = os.path.join(folder, "**", "*.pdf") if recursive else os.path.join(folder, "*.pdf")

        for pdf_path in sorted(glob.glob(pattern, recursive=recursive)):
            info = self.read_metadata(pdf_path)
            results.append(info)
            if info.error:
                self._log(f"[ERRO] {info.name}: {info.error}")
            else:
                self._log(
                    f"[OK] {info.name}  |  {info.size_mb:.2f} MB  |  "
                    f"{info.pages} pág.  |  ~{info.estimated_parts} parte(s)"
                )

        self._log(f"[SCAN] Total de PDFs encontrados: {len(results)}")
        return results

    # ------------------------------------------------------------------ #
    # Leitura de metadados                                               #
    # ------------------------------------------------------------------ #
    def read_metadata(self, path: str) -> PdfInfo:
        """
        Abre o PDF, extrai metadados básicos e calcula o número estimado
        de partes para o limite padrão (:data:`DEFAULT_LIMIT_MB`).
        """
        try:
            size = os.path.getsize(path)
        except OSError as exc:
            return PdfInfo(
                path=path,
                name=os.path.basename(path),
                size_bytes=0,
                error=f"Falha ao acessar arquivo: {exc}",
            )

        info = PdfInfo(path=path, name=os.path.basename(path), size_bytes=size)

        try:
            reader = PdfReader(path, strict=False)
            info.pages = len(reader.pages)

            meta = reader.metadata or {}
            # pypdf devolve chaves no formato "/Title", "/Author"
            info.title = (meta.get("/Title") or "").strip()
            info.author = (meta.get("/Author") or "").strip()

        except PdfReadError as exc:
            info.error = f"PDF corrompido ou ilegível: {exc}"
        except Exception as exc:  # noqa: BLE001 — queremos capturar tudo aqui
            info.error = f"Erro inesperado na leitura: {exc}"

        info.estimated_parts = self.estimate_parts(info, DEFAULT_LIMIT_MB)
        return info

    # ------------------------------------------------------------------ #
    # Estimativa de partes                                               #
    # ------------------------------------------------------------------ #
    @staticmethod
    def estimate_parts(info: PdfInfo, limit_mb: float = DEFAULT_LIMIT_MB) -> int:
        """
        Estima quantas partes serão geradas a partir do tamanho médio por
        página. Utiliza um fator de segurança para evitar estouro do limite.
        """
        if not info.ok:
            return 1

        limit_bytes = limit_mb * MB
        if info.size_bytes <= limit_bytes:
            return 1

        avg_page_bytes = info.size_bytes / max(info.pages, 1)
        # Quantas páginas cabem com margem de segurança
        pages_per_part = max(1, int((limit_bytes * SAFETY_FACTOR) / avg_page_bytes))
        return max(1, math.ceil(info.pages / pages_per_part))

    # ------------------------------------------------------------------ #
    # Fatiamento de um arquivo                                           #
    # ------------------------------------------------------------------ #
    def split_file(
        self,
        info: PdfInfo,
        output_dir: str,
        limit_mb: float = DEFAULT_LIMIT_MB,
        part_cb: Optional[PartCallback] = None,
    ) -> List[str]:
        """
        Divide ``info.path`` em partes que respeitem ``limit_mb``.

        Retorna a lista de caminhos gerados.
        """
        if not info.ok:
            self._log(f"[SKIP] {info.name}: {info.error or 'PDF sem páginas'}")
            return []

        limit_bytes = int(limit_mb * MB)
        os.makedirs(output_dir, exist_ok=True)

        reader = PdfReader(info.path, strict=False)
        total_pages = len(reader.pages)
        base_name = os.path.splitext(info.name)[0]

        generated: List[str] = []
        start = 0
        part_no = 1

        # Dica inicial de páginas por parte (média) para acelerar convergência
        avg_page_bytes = info.size_bytes / max(total_pages, 1)
        hint = max(1, int((limit_bytes * SAFETY_FACTOR) / avg_page_bytes))

        self._log(f"[SPLIT] {info.name} — {total_pages} páginas / {info.size_mb:.2f} MB")

        while start < total_pages:
            if self._cancel:
                self._log("[CANCEL] Operação interrompida pelo usuário.")
                break

            count, size = self._fit_pages(reader, start, total_pages, limit_bytes, hint)
            if count <= 0:
                count = 1  # salvaguarda: garante progresso

            writer = PdfWriter()
            for idx in range(start, start + count):
                writer.add_page(reader.pages[idx])

            # Preserva/atualiza metadados nas partes
            writer.add_metadata(
                {
                    "/Title": f"{info.title or base_name} — Parte {part_no:03d}",
                    "/Author": info.author or "PDF-Splitter-Utility",
                    "/Producer": "PDF-Splitter-Utility (pypdf)",
                    "/Source": info.name,
                }
            )

            out_name = f"{base_name}{PART_FMT.format(part_no)}.pdf"
            out_path = os.path.join(output_dir, out_name)

            try:
                with open(out_path, "wb") as fh:
                    writer.write(fh)
            except OSError as exc:
                self._log(f"[ERRO] Falha ao gravar {out_name}: {exc}")
                break

            actual_size = os.path.getsize(out_path)
            generated.append(out_path)

            self._log(
                f"   -> {out_name}  |  {actual_size / MB:.2f} MB  |  "
                f"págs. {start + 1}–{start + count}"
            )

            if part_cb:
                part_cb(part_no, out_path)

            start += count
            part_no += 1
            self._progress(min(1.0, start / total_pages))

        self._progress(1.0)
        self._log(f"[SPLIT] {info.name}: {len(generated)} parte(s) geradas.")
        return generated

    # ------------------------------------------------------------------ #
    # Conveniência: dividir todos os PDFs de uma pasta                   #
    # ------------------------------------------------------------------ #
    def split_folder(
        self,
        input_dir: str,
        output_dir: str,
        limit_mb: float = DEFAULT_LIMIT_MB,
        recursive: bool = False,
    ) -> List[str]:
        """Varre ``input_dir`` e divide todos os PDFs encontrados."""
        self.reset_cancel()
        infos = self.scan_folder(input_dir, recursive=recursive)
        all_parts: List[str] = []

        candidates = [i for i in infos if i.ok]
        if not candidates:
            self._log("[AVISO] Nenhum PDF válido encontrado.")
            return []

        for pos, info in enumerate(candidates, start=1):
            if self._cancel:
                break
            self._log(f"\n=== ({pos}/{len(candidates)}) {info.name} ===")
            parts = self.split_file(info, output_dir, limit_mb=limit_mb)
            all_parts.extend(parts)
            self._progress(pos / len(candidates))

        return all_parts

    # ------------------------------------------------------------------ #
    # Algoritmo interno: quantas páginas cabem na próxima fatia?         #
    # ------------------------------------------------------------------ #
    @classmethod
    def _fit_pages(
        cls,
        reader: PdfReader,
        start: int,
        total: int,
        limit_bytes: int,
        hint: int = 1,
    ) -> tuple[int, int]:
        """
        Determina o maior número de páginas (a partir de ``start``) cujo
        sub-PDF serializado não ultrapassa ``limit_bytes``.

        Retorna ``(num_paginas, tamanho_bytes)``.
        """
        available = total - start
        if available <= 0:
            return 0, 0

        hint = max(1, min(hint, available))

        # 1) Ajusta o "hint" para baixo caso ele já estoure o limite.
        size = cls._measure(reader, start, hint)
        if size > limit_bytes:
            ratio = limit_bytes / max(size, 1)
            hint = max(1, int(hint * ratio * 0.95))
            size = cls._measure(reader, start, hint)
            while hint > 1 and size > limit_bytes:
                hint -= 1
                size = cls._measure(reader, start, hint)

        # 2) Cresce enquanto couber (incremento linear — barato em geral).
        count = hint
        while count < available:
            new_size = cls._measure(reader, start, count + 1)
            if new_size > limit_bytes:
                break
            count += 1
            size = new_size

        # Caso especial: página única maior que o limite → entrega sozinha.
        if count == 0:
            count = 1
            size = cls._measure(reader, start, 1)

        return count, size

    # ------------------------------------------------------------------ #
    # Mede em bytes o sub-PDF resultante de "count" páginas              #
    # ------------------------------------------------------------------ #
    @staticmethod
    def _measure(reader: PdfReader, start: int, count: int) -> int:
        """Serializa um sub-PDF em memória e retorna seu tamanho em bytes."""
        writer = PdfWriter()
        end = min(start + count, len(reader.pages))
        for idx in range(start, end):
            writer.add_page(reader.pages[idx])

        buf = io.BytesIO()
        writer.write(buf)
        return buf.tell()


# ---------------------------------------------------------------------------
# Execução direta pela linha de comando (uso rápido / testes)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="PDF Splitter Utility — Engine CLI")
    parser.add_argument("input", help="Pasta com PDFs de entrada")
    parser.add_argument("-o", "--output", default="pdf_split_output", help="Pasta de saída")
    parser.add_argument("-l", "--limit", type=float, default=DEFAULT_LIMIT_MB, help="Limite em MB")
    parser.add_argument("-r", "--recursive", action="store_true", help="Varrer subpastas")
    args = parser.parse_args()

    engine = PDFSplitterEngine(log_cb=print, progress_cb=lambda p: None)
    parts = engine.split_folder(args.input, args.output, limit_mb=args.limit, recursive=args.recursive)
    print(f"\nTotal de arquivos gerados: {len(parts)}")
