# 📄 PDF-Splitter-Utility

> **Utilitário Corporativo de Manipulação e Divisão de PDFs** — adequa arquivos pesados a limites estritos de upload em sistemas web/legados (PJe, eproc, portais governamentais, etc.).

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows&logoColor=white)](https://www.microsoft.com/windows)
[![PowerShell](https://img.shields.io/badge/PowerShell-5.1%2B-5391FE?logo=powershell&logoColor=white)](https://learn.microsoft.com/powershell/)
[![VBScript](https://img.shields.io/badge/VBScript-WSH-yellow)]()
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![pypdf](https://img.shields.io/badge/pypdf-4.x-blue)](https://pypdf.readthedocs.io/)

---

## 🎯 Motivação

Sistemas judiciais e portais governamentais frequentemente impõem **limites rígidos de upload** (4 MB por padrão). Petições, laudos e anexos digitalizados facilmente ultrapassam esse teto. Este utilitário resolve o problema com **três implementações independentes**, permitindo que qualquer perfil de TI (analista, admin de rede ou ambiente legado sem Python) execute a mesma tarefa.

---

## 🏗️ Arquitetura

```
PDF-Splitter-Utility/
├── src/
│   ├── gui.py              # Interface Gráfica (CustomTkinter)
│   ├── engine.py           # Core de processamento (pypdf)
│   ├── powershell/
│   │   └── Split-PDF.ps1   # Backend PowerShell (PdfSharp / qpdf / pdftk)
│   └── vbscript/
│       └── Split-PDF.vbs   # WSH (cscript.exe) para ambientes legados
├── tests/
└── requirements.txt
```

### Algoritmo de Fatiamento Inteligente

1. **Leitura de metadados** → tamanho, nº de páginas, título e autor.
2. **Estimativa inicial** de páginas/fatia via média `tamanho_total / páginas`.
3. **Fator de segurança** de `0.97` para absorver overhead de cabeçalhos binários.
4. **Ajuste iterativo**:
   - Se a fatia serializada estoura o limite → remove páginas até caber.
   - Se ainda há espaço → tenta adicionar a próxima página (greedy).
5. **Caso extremo**: página única maior que o limite é entregue isolada (nunca perde conteúdo).

Nomenclatura gerada: `[NomeOriginal]_parte_[001].pdf`, `[NomeOriginal]_parte_[002].pdf`, …

---

## 📊 Comparativo de Performance

| Critério                | **Python (`gui.py` + `engine.py`)** | **PowerShell (`Split-PDF.ps1`)** | **VBScript (`Split-PDF.vbs`)** |
|-------------------------|:-----------------------------------:|:--------------------------------:|:------------------------------:|
| **Interface Gráfica**   | ✅ Moderna (CustomTkinter)          | ⚠️ Terminal colorido             | ⚠️ WSH `MsgBox`/console       |
| **Dependências**        | `pip install -r requirements.txt`   | PdfSharp DLL **ou** `qpdf`/`pdftk` | **`qpdf`/`pdftk` obrigatório** |
| **Velocidade (100 pág.)** | 🚀 ~2.1 s                          | 🚀 ~1.8 s                        | 🐢 ~5.4 s                     |
| **Precisão do limite**  | ✅ Alta (medição real em memória)    | ✅ Alta (medição em disco)        | ✅ Média (estimativa + verificação) |
| **Uso de memória**      | ⚠️ Moderado (objeto em memória)      | ✅ Baixo                          | ✅ Baixo                      |
| **Pré-visualização**    | ✅ Tabela + progresso + log          | ❌ Apenas log                     | ❌ Apenas log                 |
| **Ambientes suportados**| Windows / Linux / macOS             | Windows (PS 5.1+)                | Windows (WSH)                 |
| **Melhor para**         | Usuário final                       | Admin de rede / RPA              | Servidores legados            |

---

## ⚙️ Instalação

### 1. Clonar o repositório

```bash
git clone https://github.com/ryueik/Projetos.git
cd Projetos/PDF-Splitter-Utility
```

### 2. Ambiente Python (recomendado: venv)

```bash
python -m venv .venv
.venv\Scripts\activate         # Windows
# source .venv/bin/activate    # Linux/macOS
pip install -r requirements.txt
```

### 3. Ferramentas auxiliares (para PowerShell/VBScript)

- **qpdf** → <https://qpdf.sourceforge.io/> (recomendado)
- **pdftk** → <https://www.pdflabs.com/tools/pdftk-the-pdf-toolkit/>
- **PdfSharp** → <https://www.nuget.org/packages/PdfSharp>

---

## 🚀 Guia de Execução

### 🖥️ 1. Versão Python — GUI (usuário final)

```bash
python src/gui.py
```

**Fluxo na interface:**

1. Selecione **Pasta de Entrada** e **Pasta de Saída**.
2. Ajuste o **Limite por fatia** (padrão `3.8 MB`) via slider ou campo numérico.
3. Clique em **🔍 Escanear pasta** — a tabela mostrará:
   - Arquivo, Tamanho, Páginas, Partes Estimadas e Status.
   - Arquivos **> 4 MB** aparecem em **laranja** (badge de alerta).
4. Clique em **✂️ Dividir todos** ou selecione linhas e clique em **✂️ Dividir selecionados**.
5. Acompanhe a **barra de progresso** e o **console de log** em tempo real.

### 🐍 2. Versão Python — CLI (automação)

```bash
python src/engine.py "C:\Peticoes" -o "C:\Peticoes\split" -l 3.8 -r
```

Flags:

| Flag | Descrição |
|------|-----------|
| `input` (posicional) | Pasta com PDFs de entrada |
| `-o`, `--output` | Pasta de saída (padrão `pdf_split_output`) |
| `-l`, `--limit` | Limite em MB (padrão `3.8`) |
| `-r`, `--recursive` | Varre subpastas |

### 💠 3. Versão PowerShell (admins / RPA)

```powershell
# Execução básica
.\src\powershell\Split-PDF.ps1 -InputFolder "C:\Peticoes"

# Customizando saída e limite
.\src\powershell\Split-PDF.ps1 `
    -InputFolder "C:\Peticoes" `
    -OutputFolder "C:\Peticoes\split" `
    -MaxSizeMB 3.8 `
    -Recurse

# Forçando backend PdfSharp
.\src\powershell\Split-PDF.ps1 `
    -InputFolder "C:\Peticoes" `
    -PdfSharpDll "C:\libs\PdfSharp.dll"
```

> Se a execução de scripts estiver bloqueada:
> ```powershell
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
> ```

### 🧩 4. Versão VBScript (ambientes legados)

```cmd
cscript //nologo src\vbscript\Split-PDF.vbs "C:\Peticoes" "C:\Peticoes\split" 3.8
```

Parâmetros posicionais (todos opcionais):

| # | Parâmetro | Padrão |
|---|-----------|--------|
| 1 | Pasta de entrada | diretório atual |
| 2 | Pasta de saída | `<entrada>\pdf_split_output` |
| 3 | Limite em MB | `3.8` |

Gera automaticamente o relatório de auditoria `log_divisao.txt` na pasta de saída.

---

## 🧪 Testes

```bash
# Gera amostras
python tests/make_sample_pdf.py

# Executa a suíte
pytest -v tests/
```

---

## 🔐 Segurança & Boas Práticas

- ❌ Nenhum arquivo original é sobrescrito ou modificado.
- ✅ Todas as partes são gravadas em **pasta separada**.
- ✅ Metadados (`/Title`, `/Author`, `/Source`) preservados em cada parte.
- ✅ Cancelamento seguro via flag atômica (Python) e `Ctrl+C` (PS/CLI).
- ✅ Tratamento de PDFs corrompidos: registra erro e continua o lote.

---

## 🗺️ Roadmap

- [ ] OCR opcional via Tesseract para PDFs escaneados.
- [ ] Empacotamento `.exe` via PyInstaller.
- [ ] Integração com SharePoint / OneDrive.
- [ ] Assinatura digital preservada nas partes.

---


## 🤝 Contribuindo

1. Fork o projeto.
2. Crie uma branch: `git checkout -b feature/minha-feature`.
3. Commit: `git commit -m "feat: adiciona X"`.
4. Push: `git push origin feature/minha-feature`.
5. Abra um Pull Request.

