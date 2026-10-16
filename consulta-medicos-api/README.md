# 🩺 Microsserviço de Consulta de Médicos via API

Integração parametrizada que recebe **Nome**, **CRM** e **UF**, consulta um provedor de validação médica e devolve um JSON normalizado em tempo real.

- `app.py`: microsserviço HTTP em Python puro (só biblioteca padrão).
- `api/medicos.js`: a mesma rota como função serverless da Vercel.
- `lib/medicos-core.js`: validação e provedor mock em JavaScript (usados pela página e pela função serverless).
- `index.html`: interface de teste com formulário, resposta JSON, latência e exemplo de `curl`.
- `tests/test_app.py`: testes de validação, normalização, cache e HTTP.

## Rodando

```bash
python app.py                         # http://localhost:8000, provedor mock
PROVIDER=cfm python app.py            # consulta o portal do CFM
python -m unittest discover -s tests  # testes
```

```bash
curl "http://localhost:8000/health"
curl "http://localhost:8000/api/medicos?crm=123456&uf=SP"
curl "http://localhost:8000/api/medicos?nome=Maria%20Souza&uf=RJ"
```

Para usar a página com o serviço local, abra `index.html` e preencha **URL da API** com `http://localhost:8000`. Com o campo vazio, a página roda em modo demonstração, com a mesma lógica do provedor mock.

## Configuração

| Variável      | Padrão                                                            | Descrição                                    |
|---------------|-------------------------------------------------------------------|----------------------------------------------|
| `PROVIDER`    | `mock`                                                            | `mock` (dados fictícios) ou `cfm`            |
| `CFM_URL`     | `https://portal.cfm.org.br/api_rest_php/api/v1/medicos/buscar_medicos` | Endpoint de busca do portal do CFM      |
| `CFM_TIMEOUT` | `10`                                                              | Timeout da chamada externa (segundos)        |
| `CACHE_TTL`   | `300`                                                             | Cache em memória (segundos; `0` desliga)     |
| `PORT`        | `8000`                                                            | Porta HTTP                                   |
| `CORS_ORIGIN` | `*`                                                               | Valor do `Access-Control-Allow-Origin`       |

## Contrato

`GET /api/medicos?nome=&crm=&uf=`: `uf` é obrigatória e é preciso informar `crm` ou `nome`.

```json
{
  "ok": true,
  "provider": "mock",
  "consulta": { "nome": "", "crm": "123456", "uf": "SP" },
  "total": 1,
  "medicos": [{
    "nome": "Renata Carvalho Nunes",
    "crm": "123456",
    "uf": "SP",
    "situacao": "Regular",
    "regular": true,
    "detalhe_situacao": "Ativo",
    "especialidades": ["Clínica Médica"],
    "tipo_inscricao": "Principal",
    "data_inscricao": "1990-01-18",
    "fonte": "mock"
  }],
  "cache": false,
  "gerado_em": "2026-10-16T12:00:00Z"
}
```

Erros usam sempre o mesmo formato: `{"ok": false, "erro": {"codigo": "...", "mensagem": "...", "campos": {...}}}`.

| HTTP | `codigo`         | Quando                                    |
|------|------------------|-------------------------------------------|
| 400  | `VALIDACAO`      | UF inválida, CRM com letras, falta CRM/nome |
| 404  | `NAO_ENCONTRADO` | Nenhum médico encontrado                  |
| 502  | `PROVEDOR`       | Portal externo fora do ar ou mudou o contrato |

## Observações sobre o provedor CFM

O portal do CFM pode exigir captcha ou mudar o formato da resposta sem aviso. Por isso a URL é configurável, a normalização aceita as variações de nome de campo conhecidas (`NM_MEDICO`/`NOME`, `NU_CRM`/`CRM`, ...) e qualquer falha vira um erro 502 claro em vez de derrubar o serviço. Os dados do modo `mock` são fictícios e servem para testes e demonstrações.
