# Módulo de Deleção em Lote para SharePoint

Expurgo automatizado de dados de listas do SharePoint com loops condicionais e controle de rate limit: apaga **até 5.000 itens por execução** sem estourar a cota da API e retoma de onde parou na execução seguinte.

**Tags:** Power Automate Cloud · API Rate Limit Control · Batching Loops

## Estrutura

| Arquivo | O que é |
| --- | --- |
| `flow/definition.json` | Fluxo Cloud (esquema Logic Apps / Power Automate): recorrência noturna → **Do until** (sem itens ou teto de 5.000) → *Get items* com `$filter`/`$top` → *Apply to each* com concorrência limitada → em 429, espera o `Retry-After` e tenta de novo → dobra a pausa entre páginas → e-mail de relatório |
| `python/purge.py` | Mesmo expurgo pelo Microsoft Graph: pagina IDs com filtro, `DELETE` em `$batch` de 20, token bucket no cliente, respeita `Retry-After`, teto de 5.000, checkpoint retomável e `--dry-run` offline |
| `index.html` | Simulador: throughput e 429 ao longo do tempo, comparando "com controle" e "sem controle" |

## Uso

Offline (lista e servidor simulados, tempo virtual: termina na hora):

```bash
cd python
python purge.py --dry-run --itens 12000 --proporcao 0.4 --rpm 540 --limite-servidor 600
python purge.py --dry-run --sem-controle        # para comparar quantos 429 aparecem
```

Contra o Graph:

```bash
pip install msal requests
export AZURE_TENANT_ID=... AZURE_CLIENT_ID=... AZURE_CLIENT_SECRET=...
export SP_SITE_ID="contoso.sharepoint.com,<guid-site>,<guid-web>" SP_LIST_ID=InventarioPatrimonial
python purge.py --filtro "fields/Status eq 'Baixado'" --rpm 540 --max 5000
```

Se a execução for interrompida, `purge_checkpoint.json` guarda os IDs pendentes; rodar de novo com o mesmo filtro continua dali. Ao terminar, o checkpoint é apagado.

## Controle de ritmo

- **Token bucket**: `--rpm` fichas por minuto (cada sub-requisição do `$batch` gasta uma), rajada máxima de 5 s. Deixe uns 10% abaixo da cota real.
- **Retry-After**: um 429 pausa *todos* os envios pelo tempo pedido; só os itens recusados são reenviados.
- **Sem controle** (`--sem-controle`): sem bucket e com backoff cego. No modelo, assim como no SharePoint Online, insistir durante o bloqueio estende a punição.
- **Teto por execução**: `--max` (no máximo 5.000) limita o raio de impacto de um filtro errado e mantém a execução dentro da janela noturna.

Filtrar por coluna não indexada em listas grandes exige o cabeçalho `Prefer: HonorNonIndexedQueriesWarningMayFailRandomly`, que o script já envia. Para listas acima de 5.000 itens, indexe a coluna usada no filtro.
