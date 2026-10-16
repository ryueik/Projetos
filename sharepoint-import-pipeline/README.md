# Pipeline de Importação Automática para SharePoint

Fluxo **Power Automate Cloud** agendado que consome os arquivos gerados pelas rotinas desktop (PAD), converte cada linha em item e insere em lote numa lista do SharePoint pelo **Microsoft Graph `$batch`**, com tratamento de erro (try/catch), retry com `Retry-After` e dead-letter.

**Tags:** Power Automate Cloud · SharePoint REST API · Graph API · Error Handling

## Estrutura

| Arquivo | O que é |
| --- | --- |
| `flow/definition.json` | Definição do fluxo (esquema Logic Apps / Power Automate): Recurrence → listar pasta → parse → `chunk` em lotes → HTTP `$batch` → reenvio do que tomou 429 → dead-letter, tudo dentro de escopos Try/Catch |
| `python/importer.py` | Mesmo pipeline em Python: MSAL (client credentials) + `requests`, lotes de até 20, backoff exponencial com jitter, `Retry-After`, dead-letter CSV e modo `--dry-run` offline |
| `exemplo/patrimonio_lote.csv` | 57 itens no formato de saída do [ETL de planilhas](../sharepoint-planilhas-etl/) |
| `index.html` | Simulador visual do pipeline (não chama a API real) |

## Rodando o importador

Offline, sem dependências (Graph simulado, tempo não é esperado de verdade):

```bash
cd python
python importer.py ../exemplo/patrimonio_lote.csv --dry-run --falhas 0.2 --permanentes 0.03 -v
```

Contra o Graph:

```bash
pip install msal requests
export AZURE_TENANT_ID=<tenant> AZURE_CLIENT_ID=<app> AZURE_CLIENT_SECRET=<segredo>
export SP_SITE_ID="contoso.sharepoint.com,<guid-site>,<guid-web>"
export SP_LIST_ID=InventarioPatrimonial
python importer.py ../exemplo/patrimonio_lote.csv --lote 20 --dead-letter erros.csv
```

O app registration precisa da permissão de aplicativo `Sites.Selected` (recomendado, concedida só ao site) ou `Sites.ReadWrite.All`.

Saída: resumo JSON (inseridas, dead-letter, lotes, chamadas, retries, duração). Código `0` quando tudo entrou, `3` quando há itens no dead-letter.

## Tratamento de erros

- **Throttling (429/503/504)** no `$batch` inteiro ou em sub-requisições: espera o maior `Retry-After` devolvido; sem cabeçalho, usa backoff exponencial `2^n` (máx. 60 s) com jitter. Só os itens que falharam são reenviados.
- **Erros permanentes (4xx)**: vão direto para o dead-letter com a mensagem do Graph, sem retry.
- **Tentativas esgotadas**: o item vai para o dead-letter com o último erro visto.
- **No fluxo Cloud**: o escopo `Catch` roda se `Try` falhar ou expirar, move o arquivo para `Erro/` e envia e-mail com `result('Try')`. Os itens com erro são gravados como `dead_letter_aaaaMMdd_HHmm.csv` na mesma pasta.

## Importando o fluxo

`flow/definition.json` segue o esquema `workflowdefinition.json` (2016-06-01). Para usar num Logic App, cole em *Code view*; no Power Automate, use como referência ao montar as ações (os conectores `sharepointonline` e `office365` precisam ser criados no ambiente). Ajuste os parâmetros `siteUrl`, `siteId`, `listId` e pastas.
