# ⏱️ Registro de Ponto Híbrido

Controle de jornada com duas interfaces que falam o mesmo formato de arquivo:

- **Web** (`index.html`): relógio em tempo real, botões de entrada/saída, jornada do dia, gráfico da semana e exportação/importação de CSV. Os dados ficam no `localStorage` do navegador.
- **Desktop** (`ponto.py`): linha de comando em Python puro (sem dependências) que grava em `ponto.csv`.

## Uso

```bash
python ponto.py entrada
python ponto.py saida
python ponto.py resumo --jornada 8
python ponto.py importar ponto-web.csv   # junta registros exportados do navegador
```

Formato do CSV: `data;entrada;saida;origem` (ex.: `2026-10-16;08:02;12:01;web`).
