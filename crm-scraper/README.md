# 🕷️ Web Scraper e Extrator Cadastral de Médicos (CRM)

Robô que navega pelo portal médico, percorre a paginação de cada UF, extrai a situação cadastral com **XPath** e gera um CSV por estado mais um **CSV consolidado**.

- `scraper.py`: robô em Python (`requests` + `lxml`), com atraso entre requisições, tentativas com backoff e modo offline.
- `config.json`: URL do portal (com `{uf}` e `{pagina}`), seletores XPath e limites.
- `exemplo/pagina_resultado.html` e `exemplo/pagina_resultado_2.html`: páginas de exemplo com dados fictícios, para rodar sem rede.
- `pad/fluxo.txt`: o mesmo fluxo em Power Automate Desktop, para portais que só renderizam com JavaScript.
- `index.html`: simulação da coleta (progresso por UF, log, KPIs, gráfico, tabela filtrável, download do CSV) e um playground de XPath.
- `tests/test_scraper.py`: testes de parsing e da execução offline.

## Uso

```bash
pip install -r requirements.txt

python scraper.py --offline               # usa exemplo/, não acessa a rede
python scraper.py --offline --ufs SP RS   # só algumas UFs
python scraper.py --ufs SP RJ MG          # portal configurado em config.json
python -m unittest discover -s tests
```

Saída (pasta `saida/`, configurável com `--saida`):

```
saida/medicos_SP.csv
saida/medicos_RJ.csv
...
saida/medicos_consolidado.csv
```

Colunas (separador `;`, UTF-8 com BOM para abrir direto no Excel):
`uf;crm;nome;situacao;especialidades;inscricao;data_inscricao;pagina;coletado_em`

No fim, o terminal mostra um resumo Regular/Irregular por UF.

## Adaptando ao portal real

1. Troque `base_url` em `config.json` pela URL de busca, mantendo os marcadores `{uf}` e `{pagina}`.
2. Abra o HTML de uma página de resultado no **XPath playground** do `index.html` e ajuste cada seletor até retornar o campo certo.
3. Mantenha `atraso_segundos` alto o bastante para não sobrecarregar o site e respeite os termos de uso e o `robots.txt` do portal.

Se o portal só monta a lista via JavaScript (sem HTML no servidor), use o fluxo do Power Automate Desktop em `pad/fluxo.txt`, que extrai os dados do navegador já renderizado.

> Os nomes e números em `exemplo/` são fictícios.
