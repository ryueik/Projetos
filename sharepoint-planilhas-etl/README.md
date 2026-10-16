# Gerador e Formatador de Planilhas para Ingestão SharePoint

ETL que limpa, padroniza e valida planilhas brutas de inventário patrimonial antes da ingestão na lista do SharePoint usada pelo **App Inventário Patrimonial**. O Power Automate Desktop (PAD) orquestra e o Python faz a transformação.

**Tags:** Power Automate Desktop · Python · Excel/CSV Engine · Data Transformation

## Estrutura

| Arquivo | O que é |
| --- | --- |
| `etl.py` | ETL em Python (somente stdlib; `openpyxl` opcional para `.xlsx`) |
| `pad/fluxo.txt` | Fluxo do PAD em Robin: cole no editor do PAD para recriar as ações |
| `exemplo/inventario_bruto.csv` | 41 linhas sujas para testar (datas mistas, R$, duplicados, status inválido…) |
| `index.html` | Versão web: mesmo ETL rodando no navegador, com mapeamento de colunas e download |

## Uso

```bash
python etl.py exemplo/inventario_bruto.csv -o saida
# Lidas: 41 | válidas: 33 | rejeitadas: 8 (duplicadas: 2) | vazias ignoradas: 1

pip install openpyxl            # só se for ler .xlsx
python etl.py inventario.xlsx -o saida --aba "Bens"
python etl.py bruto.csv -o saida --mapa minhas_colunas.json
```

Saídas em `saida/`:

- `inventario_sharepoint.csv`: UTF-8 com BOM, vírgula, colunas com os **nomes internos** da lista (`Title, Descricao, Categoria, Localizacao, Responsavel, DataAquisicao, ValorAquisicao, Status`)
- `rejeitados.csv`: número da linha original, motivo e os valores brutos
- `resumo.json`: contagens e o mapeamento de cabeçalhos usado

Código de saída: `0` tudo válido · `2` há rejeitados (o PAD manda o relatório por e-mail) · outro valor indica falha.

## Regras

1. **Cabeçalhos**: acento, caixa, `º` e pontuação são ignorados; cada coluna casa com um apelido (`"Nº Patrimônio "` → `Title`, `"Valor (R$)"` → `ValorAquisicao`).
2. **Texto**: trim e espaços duplicados removidos; responsáveis em Title Case.
3. **Categoria**: grafias diferentes da mesma categoria (`informatica`, `INFORMÁTICA`) viram a mais frequente, dando preferência à acentuada.
4. **Datas**: `dd/mm/aaaa`, `dd-mm-aa`, `aaaa-mm-dd`, `aaaa/mm/dd` → `aaaa-mm-dd`. Datas inexistentes (31/02) são rejeitadas.
5. **Números**: `R$ 5.899,90`, `1780,5`, `5899.90` → `5899.90`. Valores negativos ou texto são rejeitados.
6. **Status**: precisa estar entre as opções da coluna Choice (`Ativo, Em manutenção, Inativo, Baixado`).
7. **Chave**: `Title` em maiúsculas; repetições ficam só na primeira ocorrência.

## Fluxo no PAD

`pad/fluxo.txt` lista os arquivos da pasta de entrada, roda `etl.py` com *Run DOS command*, move o original para `Processados/` ou `Erro/`, copia o CSV limpo para a pasta sincronizada com a biblioteca do SharePoint e, quando há rejeitados, envia o relatório por Outlook. Ajuste o bloco **CONFIGURAÇÃO** com seus caminhos.
