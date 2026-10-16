# 🧹 Sistema de Governança e Limpeza Automática de Arquivos

Script de manutenção que varre diretórios, lê as datas de **criação** e **modificação** de cada arquivo e remove com segurança o que passou da retenção (30 dias por padrão).

- `limpeza.py`: versão Python (só biblioteca padrão).
- `Limpeza-Arquivos.ps1`: versão PowerShell, com `-WhatIf` / `-Confirm`.
- `agendar.md`: como agendar no Agendador de Tarefas do Windows e no cron.
- `index.html`: simulador com uma árvore de diretórios fictícia, controles da regra, histograma de idades e exportação da auditoria.
- `tests/test_limpeza.py`: testes (simulação, exclusão, quarentena, padrões, links simbólicos).

## Segurança por padrão

- **Simulação** é o padrão: nada é alterado sem `--executar` (Python) ou sem tirar o `-WhatIf` (PowerShell).
- `--quarentena PASTA` move os arquivos mantendo a estrutura de pastas, em vez de excluir.
- Extensões protegidas (`.db`, `.sqlite`, `.mdf`, `.ldf`, `.pst`, `.key`, `.pem`, `.kdbx`) nunca são tocadas.
- Links simbólicos e junções não são seguidos; a raiz do disco, a pasta do usuário e pastas de sistema são recusadas.
- Toda execução grava um log de auditoria em JSON e CSV.

## Python

```bash
python limpeza.py D:\Exportacoes                                  # simula com 30 dias
python limpeza.py D:\Exportacoes --dias 15 --executar             # exclui
python limpeza.py D:\Exportacoes --executar --quarentena D:\Quarentena --remover-pastas-vazias
python limpeza.py ./downloads --incluir "*.log" "*.tmp" --excluir "*/manter/*"
python -m unittest discover -s tests
```

| Opção | Descrição |
|-------|-----------|
| `--dias N` | retenção em dias (padrão 30) |
| `--criterio modificacao\|criacao\|ambos` | data usada na regra; `ambos` exige que as duas sejam antigas |
| `--incluir GLOB...` | só considera esses padrões |
| `--excluir GLOB...` | nunca toca nesses padrões |
| `--proteger-ext EXT...` | substitui a lista de extensões protegidas |
| `--executar` | aplica as ações |
| `--quarentena PASTA` | move em vez de excluir |
| `--remover-pastas-vazias` | apaga subpastas que ficarem vazias |
| `--auditoria PASTA` | onde gravar `limpeza_AAAAMMDD_HHMMSS.json/.csv` (padrão `auditoria/`) |
| `--auditoria-completa` | registra também os arquivos mantidos |

Código de saída: `0` sucesso, `1` houve erros em algum arquivo, `2` nenhum diretório válido.

> No Linux não existe data de criação confiável; o script usa a menor entre `ctime` e `mtime`. No Windows e no macOS usa a data de criação real.

## PowerShell

```powershell
.\Limpeza-Arquivos.ps1 -Path D:\Exportacoes -WhatIf
.\Limpeza-Arquivos.ps1 -Path D:\Exportacoes, C:\Temp -Days 15 -Include *.log, *.tmp
.\Limpeza-Arquivos.ps1 -Path D:\Exportacoes -QuarantinePath D:\Quarentena -RemoveEmptyFolders -Confirm:$false
```

## Agendamento

Veja [agendar.md](agendar.md).
