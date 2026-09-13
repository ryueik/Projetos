"""
gui.py
======
Interface gráfica do PDF-Splitter-Utility (CustomTkinter).

Recursos
--------
* Dark / Light mode automático.
* Seleção de pasta de entrada e saída.
* Slider + entrada numérica para o limite de tamanho por fatia.
* Grid (Treeview) com Arquivo, Tamanho, Páginas, Partes Estimadas e Status.
* Badge de alerta visual para arquivos > 4 MB.
* Barra de progresso + console de log com auto-scroll.

Autor  : Equipe PDF-Splitter-Utility
Licença: MIT
"""

from __future__ import annotations

import os
import queue
import sys
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from typing import List, Optional

import customtkinter as ctk

# Garante import local do engine quando executado diretamente
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine import DEFAULT_LIMIT_MB, MB, PDFSplitterEngine, PdfInfo  # noqa: E402

# ---------------------------------------------------------------------------
# Aparência global
# ---------------------------------------------------------------------------
ctk.set_appearance_mode("System")          # System | Dark | Light
ctk.set_default_color_theme("blue")        # blue | green | dark-blue

CORES = {
    "bg_dark": "#111418",
    "bg_panel": "#1b1f24",
    "bg_panel_alt": "#23272e",
    "txt": "#e6e6e6",
    "txt_dim": "#9aa0a6",
    "ok": "#22c55e",
    "warn": "#f59e0b",
    "err": "#ef4444",
    "info": "#38bdf8",
    "accent": "#3b82f6",
}


# ---------------------------------------------------------------------------
# Aplicação principal
# ---------------------------------------------------------------------------
class PDFSplitterApp(ctk.CTk):
    """Janela principal do utilitário."""

    def __init__(self) -> None:
        super().__init__()

        self.title("PDF Splitter Utility — Corporativo")
        self.geometry("1200x820")
        self.minsize(1040, 700)

        # Estado interno
        self.files: List[PdfInfo] = []
        self.output_dir: str = os.path.join(os.getcwd(), "pdf_split_output")
        self.input_dir: str = os.getcwd()
        self._worker: Optional[threading.Thread] = None

        # Filas thread-safe para atualização da UI
        self._log_q: "queue.Queue[tuple[str, str]]" = queue.Queue()
        self._progress_q: "queue.Queue[float]" = queue.Queue()

        # Engine
        self.engine = PDFSplitterEngine(
            log_cb=lambda msg: self._log_q.put((msg, self._classify(msg))),
            progress_cb=lambda pct: self._progress_q.put(pct),
        )

        # Layout
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(2, weight=1)
        self.grid_rowconfigure(4, weight=0)

        self._build_header()
        self._build_controls()
        self._build_table()
        self._build_actions()
        self._build_log()

        # Loop de polling das filas
        self._pump_queues()

    # ------------------------------------------------------------------ #
    # Construção da UI — Header                                          #
    # ------------------------------------------------------------------ #
    def _build_header(self) -> None:
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", padx=16, pady=(14, 6))
        header.grid_columnconfigure(1, weight=1)

        title = ctk.CTkLabel(
            header,
            text="📄  PDF Splitter Utility",
            font=ctk.CTkFont(size=22, weight="bold"),
        )
        title.grid(row=0, column=0, sticky="w")

        subtitle = ctk.CTkLabel(
            header,
            text="Divisão inteligente de PDFs para PJe / eproc / portais com limite estrito de upload",
            font=ctk.CTkFont(size=12),
            text_color=CORES["txt_dim"],
        )
        subtitle.grid(row=1, column=0, sticky="w")

        self.appearance_menu = ctk.CTkOptionMenu(
            header,
            values=["System", "Dark", "Light"],
            width=110,
            command=self._change_appearance,
        )
        self.appearance_menu.set("System")
        self.appearance_menu.grid(row=0, column=2, rowspan=2, sticky="e")

    def _change_appearance(self, mode: str) -> None:
        ctk.set_appearance_mode(mode)
        self._apply_tree_style()

    # ------------------------------------------------------------------ #
    # Construção da UI — Painel de Controle                              #
    # ------------------------------------------------------------------ #
    def _build_controls(self) -> None:
        panel = ctk.CTkFrame(self, fg_color=("gray90", CORES["bg_panel"]), corner_radius=10)
        panel.grid(row=1, column=0, sticky="ew", padx=16, pady=6)
        panel.grid_columnconfigure(1, weight=1)
        panel.grid_columnconfigure(3, weight=1)

        # --- Entrada ------------------------------------------------------
        ctk.CTkLabel(panel, text="Pasta de entrada:", anchor="w").grid(
            row=0, column=0, padx=(14, 6), pady=(12, 6), sticky="w"
        )
        self.entry_input = ctk.CTkEntry(panel, placeholder_text="Selecione a pasta com os PDFs…")
        self.entry_input.insert(0, self.input_dir)
        self.entry_input.grid(row=0, column=1, padx=6, pady=(12, 6), sticky="ew")
        ctk.CTkButton(panel, text="📂 Procurar", width=110, command=self._pick_input).grid(
            row=0, column=2, padx=(6, 14), pady=(12, 6)
        )

        # --- Saída --------------------------------------------------------
        ctk.CTkLabel(panel, text="Pasta de saída:", anchor="w").grid(
            row=1, column=0, padx=(14, 6), pady=6, sticky="w"
        )
        self.entry_output = ctk.CTkEntry(panel, placeholder_text="Onde salvar as partes…")
        self.entry_output.insert(0, self.output_dir)
        self.entry_output.grid(row=1, column=1, padx=6, pady=6, sticky="ew")
        ctk.CTkButton(panel, text="📁 Procurar", width=110, command=self._pick_output).grid(
            row=1, column=2, padx=(6, 14), pady=6
        )

        # --- Limite / Slider ---------------------------------------------
        limit_frame = ctk.CTkFrame(panel, fg_color="transparent")
        limit_frame.grid(row=2, column=0, columnspan=4, sticky="ew", padx=14, pady=(6, 12))
        limit_frame.grid_columnconfigure(2, weight=1)

        ctk.CTkLabel(limit_frame, text="Limite por fatia (MB):").grid(row=0, column=0, sticky="w")

        self.entry_limit = ctk.CTkEntry(limit_frame, width=80)
        self.entry_limit.insert(0, f"{DEFAULT_LIMIT_MB:.1f}")
        self.entry_limit.grid(row=0, column=1, padx=(8, 12))

        self.slider_limit = ctk.CTkSlider(
            limit_frame,
            from_=0.5,
            to=20.0,
            number_of_steps=195,
            command=self._on_slider_change,
        )
        self.slider_limit.set(DEFAULT_LIMIT_MB)
        self.slider_limit.grid(row=0, column=2, sticky="ew")

        self.lbl_limit_value = ctk.CTkLabel(
            limit_frame,
            text=f"{DEFAULT_LIMIT_MB:.1f} MB",
            width=90,
            font=ctk.CTkFont(weight="bold"),
        )
        self.lbl_limit_value.grid(row=0, column=3, padx=(10, 0))

        self.entry_limit.bind("<FocusOut>", self._on_entry_limit_change)
        self.entry_limit.bind("<Return>", self._on_entry_limit_change)

        # --- Botões --------------------------------------------------------
        btn_frame = ctk.CTkFrame(panel, fg_color="transparent")
        btn_frame.grid(row=3, column=0, columnspan=4, sticky="ew", padx=14, pady=(0, 12))

        self.btn_scan = ctk.CTkButton(
            btn_frame, text="🔍  Escanear pasta", width=170, command=self._on_scan
        )
        self.btn_scan.pack(side="left", padx=(0, 8))

        self.btn_split_all = ctk.CTkButton(
            btn_frame,
            text="✂️  Dividir todos",
            width=170,
            fg_color=CORES["ok"],
            hover_color="#16a34a",
            command=self._on_split_all,
        )
        self.btn_split_all.pack(side="left", padx=8)

        self.btn_split_selected = ctk.CTkButton(
            btn_frame,
            text="✂️  Dividir selecionados",
            width=200,
            fg_color=CORES["accent"],
            command=self._on_split_selected,
        )
        self.btn_split_selected.pack(side="left", padx=8)

        self.btn_cancel = ctk.CTkButton(
            btn_frame,
            text="⏹  Cancelar",
            width=120,
            fg_color=CORES["err"],
            hover_color="#b91c1c",
            state="disabled",
            command=self._on_cancel,
        )
        self.btn_cancel.pack(side="right")

    def _on_slider_change(self, value: float) -> None:
        value = round(float(value), 1)
        self.lbl_limit_value.configure(text=f"{value:.1f} MB")
        self.entry_limit.delete(0, "end")
        self.entry_limit.insert(0, f"{value:.1f}")

    def _on_entry_limit_change(self, _event=None) -> None:
        try:
            value = float(self.entry_limit.get().replace(",", "."))
            value = max(0.5, min(20.0, value))
        except ValueError:
            value = DEFAULT_LIMIT_MB
        self.slider_limit.set(value)
        self.lbl_limit_value.configure(text=f"{value:.1f} MB")
        self.entry_limit.delete(0, "end")
        self.entry_limit.insert(0, f"{value:.1f}")

    # ------------------------------------------------------------------ #
    # Construção da UI — Grid de arquivos                                #
    # ------------------------------------------------------------------ #
    def _build_table(self) -> None:
        table_frame = ctk.CTkFrame(self, fg_color=("gray90", CORES["bg_panel"]), corner_radius=10)
        table_frame.grid(row=2, column=0, sticky="nsew", padx=16, pady=6)
        table_frame.grid_rowconfigure(0, weight=1)
        table_frame.grid_columnconfigure(0, weight=1)

        columns = ("arquivo", "tamanho", "paginas", "partes", "status")
        self.tree = ttk.Treeview(
            table_frame,
            columns=columns,
            show="headings",
            selectmode="extended",
            height=14,
        )
        self.tree.heading("arquivo", text="Arquivo")
        self.tree.heading("tamanho", text="Tamanho Original")
        self.tree.heading("paginas", text="Páginas")
        self.tree.heading("partes", text="Partes Estimadas")
        self.tree.heading("status", text="Status")

        self.tree.column("arquivo", width=520, anchor="w")
        self.tree.column("tamanho", width=140, anchor="center")
        self.tree.column("paginas", width=100, anchor="center")
        self.tree.column("partes", width=140, anchor="center")
        self.tree.column("status", width=180, anchor="center")

        vsb = ttk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)

        self.tree.grid(row=0, column=0, sticky="nsew", padx=(8, 0), pady=8)
        vsb.grid(row=0, column=1, sticky="ns", pady=8, padx=(0, 8))

        # Tags de cor (badges)
        self.tree.tag_configure("ok", foreground=CORES["ok"])
        self.tree.tag_configure("alert", foreground=CORES["warn"])
        self.tree.tag_configure("err", foreground=CORES["err"])
        self.tree.tag_configure("done", foreground=CORES["info"])

        self._apply_tree_style()

    def _apply_tree_style(self) -> None:
        style = ttk.Style()
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass

        dark = ctk.get_appearance_mode() == "Dark"
        bg = CORES["bg_panel"] if dark else "#ffffff"
        fg = CORES["txt"] if dark else "#111418"
        head_bg = CORES["bg_panel_alt"] if dark else "#e5e7eb"

        style.configure(
            "Treeview",
            background=bg,
            fieldbackground=bg,
            foreground=fg,
            rowheight=26,
            borderwidth=0,
        )
        style.configure(
            "Treeview.Heading",
            background=head_bg,
            foreground=fg,
            font=("Segoe UI", 10, "bold"),
            relief="flat",
        )
        style.map("Treeview", background=[("selected", CORES["accent"])])

    # ------------------------------------------------------------------ #
    # Construção da UI — Barra de ações + progresso                      #
    # ------------------------------------------------------------------ #
    def _build_actions(self) -> None:
        frame = ctk.CTkFrame(self, fg_color="transparent")
        frame.grid(row=3, column=0, sticky="ew", padx=16, pady=(4, 4))
        frame.grid_columnconfigure(0, weight=1)

        self.progress = ctk.CTkProgressBar(frame, height=14)
        self.progress.set(0.0)
        self.progress.grid(row=0, column=0, sticky="ew", padx=(0, 10))

        self.lbl_progress = ctk.CTkLabel(frame, text="0%", width=60)
        self.lbl_progress.grid(row=0, column=1, sticky="e")

    # ------------------------------------------------------------------ #
    # Construção da UI — Console de log                                  #
    # ------------------------------------------------------------------ #
    def _build_log(self) -> None:
        frame = ctk.CTkFrame(self, fg_color=("gray90", CORES["bg_panel"]), corner_radius=10)
        frame.grid(row=4, column=0, sticky="nsew", padx=16, pady=(6, 14))
        frame.grid_columnconfigure(0, weight=1)
        frame.grid_rowconfigure(1, weight=1)

        top = ctk.CTkFrame(frame, fg_color="transparent")
        top.grid(row=0, column=0, sticky="ew", padx=12, pady=(10, 0))
        top.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(top, text="Console de Log", font=ctk.CTkFont(weight="bold")).grid(
            row=0, column=0, sticky="w"
        )
        ctk.CTkButton(top, text="🧹 Limpar", width=90, command=self._clear_log).grid(
            row=0, column=1, sticky="e"
        )

        self.log_box = ctk.CTkTextbox(
            frame,
            wrap="word",
            font=ctk.CTkFont(family="Consolas", size=12),
            height=170,
        )
        self.log_box.grid(row=1, column=0, sticky="nsew", padx=12, pady=10)
        self.log_box.configure(state="disabled")

        # Configuração das tags coloridas no widget interno
        self.log_box.tag_config("INFO", foreground=CORES["txt_dim"])
        self.log_box.tag_config("OK", foreground=CORES["ok"])
        self.log_box.tag_config("WARN", foreground=CORES["warn"])
        self.log_box.tag_config("ERR", foreground=CORES["err"])
        self.log_box.tag_config("SCAN", foreground=CORES["info"])

    # ------------------------------------------------------------------ #
    # Helpers de UI                                                      #
    # ------------------------------------------------------------------ #
    @staticmethod
    def _classify(msg: str) -> str:
        up = msg.upper()
        if "[ERRO]" in up or "ERRO" in up:
            return "ERR"
        if "[AVISO]" in up or "AVISO" in up:
            return "WARN"
        if "[SCAN]" in up:
            return "SCAN"
        if "[OK]" in up or "SUCESSO" in up:
            return "OK"
        return "INFO"

    def _append_log(self, msg: str, tag: str = "INFO") -> None:
        self.log_box.configure(state="normal")
        self.log_box.insert("end", msg + "\n", tag)
        self.log_box.see("end")
        self.log_box.configure(state="disabled")

    def _clear_log(self) -> None:
        self.log_box.configure(state="normal")
        self.log_box.delete("1.0", "end")
        self.log_box.configure(state="disabled")

    # ------------------------------------------------------------------ #
    # Polling das filas (thread → UI)                                    #
    # ------------------------------------------------------------------ #
    def _pump_queues(self) -> None:
        # Log
        try:
            while True:
                msg, tag = self._log_q.get_nowait()
                self._append_log(msg, tag)
        except queue.Empty:
            pass

        # Progresso
        try:
            last = None
            while True:
                last = self._progress_q.get_nowait()
            if last is not None:
                self.progress.set(last)
                self.lbl_progress.configure(text=f"{int(last * 100)}%")
        except queue.Empty:
            pass

        self.after(120, self._pump_queues)

    # ------------------------------------------------------------------ #
    # Seletores de pasta                                                 #
    # ------------------------------------------------------------------ #
    def _pick_input(self) -> None:
        folder = filedialog.askdirectory(title="Selecione a pasta de entrada")
        if folder:
            self.entry_input.delete(0, "end")
            self.entry_input.insert(0, folder)

    def _pick_output(self) -> None:
        folder = filedialog.askdirectory(title="Selecione a pasta de saída")
        if folder:
            self.entry_output.delete(0, "end")
            self.entry_output.insert(0, folder)

    # ------------------------------------------------------------------ #
    # Ações principais                                                   #
    # ------------------------------------------------------------------ #
    def _current_limit(self) -> float:
        try:
            return float(self.entry_limit.get().replace(",", "."))
        except ValueError:
            return DEFAULT_LIMIT_MB

    def _refresh_tree(self) -> None:
        for item in self.tree.get_children():
            self.tree.delete(item)

        for info in self.files:
            tag = "ok"
            if info.error:
                tag = "err"
            elif info.is_alert:
                tag = "alert"

            status = "OK"
            if info.error:
                status = f"⚠ {info.error[:40]}"
            elif info.is_alert:
                status = "⚠ Acima de 4 MB"
            elif not info.estimated_parts > 1:
                status = "Dentro do limite"

            self.tree.insert(
                "",
                "end",
                iid=info.path,
                values=(
                    info.name,
                    f"{info.size_mb:.2f} MB",
                    info.pages,
                    info.estimated_parts,
                    status,
                ),
                tags=(tag,),
            )

    def _on_scan(self) -> None:
        folder = self.entry_input.get().strip()
        if not os.path.isdir(folder):
            messagebox.showerror("Pasta inválida", f"A pasta de entrada não existe:\n{folder}")
            return

        self.btn_scan.configure(state="disabled", text="⏳ Escaneando…")
        self._append_log(f"\n[SCAN] Iniciando varredura em {folder}", "SCAN")
        self.progress.set(0.0)
        self.lbl_progress.configure(text="0%")

        def worker() -> None:
            try:
                self.files = self.engine.scan_folder(folder)
                self.after(0, self._refresh_tree)
            except Exception as exc:  # noqa: BLE001
                self._log_q.put((f"[ERRO] Falha na varredura: {exc}", "ERR"))
            finally:
                self.after(0, lambda: self.btn_scan.configure(state="normal", text="🔍  Escanear pasta"))

        threading.Thread(target=worker, daemon=True).start()

    def _run_split(self, infos: List[PdfInfo]) -> None:
        if not infos:
            messagebox.showwarning("Nada a fazer", "Nenhum PDF válido selecionado.")
            return

        output_dir = self.entry_output.get().strip() or self.output_dir
        os.makedirs(output_dir, exist_ok=True)
        limit = self._current_limit()

        self.btn_split_all.configure(state="disabled")
        self.btn_split_selected.configure(state="disabled")
        self.btn_scan.configure(state="disabled")
        self.btn_cancel.configure(state="normal")
        self.progress.set(0.0)

        self._append_log(
            f"\n[INÍCIO] Dividindo {len(infos)} arquivo(s) — limite {limit:.2f} MB → {output_dir}",
            "SCAN",
        )

        def worker() -> None:
            self.engine.reset_cancel()
            total = len(infos)
            try:
                for idx, info in enumerate(infos, start=1):
                    if self.engine._cancel:
                        break
                    self._log_q.put((f"\n=== ({idx}/{total}) {info.name} ===", "SCAN"))
                    self.engine.split_file(info, output_dir, limit_mb=limit)
                    self.after(0, lambda p=idx / total: self.progress.set(p))
            except Exception as exc:  # noqa: BLE001
                self._log_q.put((f"[ERRO] Falha durante a divisão: {exc}", "ERR"))
            finally:
                self._log_q.put((f"[FIM] Operação concluída. Saída em: {output_dir}", "OK"))
                self.after(0, self._finish_split)

        self._worker = threading.Thread(target=worker, daemon=True)
        self._worker.start()

    def _finish_split(self) -> None:
        self.btn_split_all.configure(state="normal")
        self.btn_split_selected.configure(state="normal")
        self.btn_scan.configure(state="normal")
        self.btn_cancel.configure(state="disabled")
        self.progress.set(1.0)
        self.lbl_progress.configure(text="100%")

    def _on_split_all(self) -> None:
        valid = [f for f in self.files if f.ok]
        self._run_split(valid)

    def _on_split_selected(self) -> None:
        selection = self.tree.selection()
        if not selection:
            messagebox.showinfo("Seleção vazia", "Selecione ao menos um arquivo na tabela.")
            return
        by_path = {f.path: f for f in self.files}
        selected = [by_path[p] for p in selection if p in by_path and by_path[p].ok]
        self._run_split(selected)

    def _on_cancel(self) -> None:
        self.engine.cancel()
        self._append_log("[CANCEL] Cancelamento solicitado…", "WARN")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main() -> None:
    app = PDFSplitterApp()
    app.mainloop()


if __name__ == "__main__":
    main()
