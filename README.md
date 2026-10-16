<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:1a1b27,50:414868,100:7aa2f7&height=200&section=header&text=Meus%20Projetos&fontSize=50&fontColor=ffffff&fontAlignY=40&desc=Portf%C3%B3lio%20de%20Desenvolvimento%20%7C%20Development%20Portfolio&descAlignY=60&descSize=18" width="100%"/>
</div>

<div align="center">
  <h3>📂 Coleção de projetos de automação, web e utilitários</h3>
  <img src="https://img.shields.io/badge/Projetos-20-e3b341?style=for-the-badge&labelColor=1a1b27" />
  <img src="https://img.shields.io/badge/Status-Em%20constante%20evolu%C3%A7%C3%A3o-7aa2f7?style=for-the-badge&labelColor=1a1b27" />
</div>

---

## 📖 Sobre este Repositório

Este repositório reúne todos os meus projetos de estudo e desenvolvimento pessoal. Cada pasta contém um projeto independente com seu próprio código-fonte e, quando aplicável, um README específico com instruções de instalação e uso.

---

## 🖥️ Painel de Projetos

Abra o **`index.html`** da raiz: é um painel com todos os projetos deste repositório (com foto, filtros por área e busca) e os destaques **Automatizer** e **OmniLicit**. Cada projeto tem o seu próprio `index.html` com uma demonstração funcionando, tema claro/escuro e link para o código.

```bash
python -m http.server 8000   # depois abra http://localhost:8000
```

Os dados do painel ficam em `assets/js/catalog.js`; `node scripts/build-catalog.mjs` gera o `projects.json` que o portfólio pode consumir, e `node scripts/screenshots.mjs` refaz as fotos em `assets/thumbs/`.

## 📋 Índice de Projetos

### Do portfólio

| 📁 Projeto | 📝 Descrição | 🛠 Tecnologias |
|:---|:---|:---|
| [**Planilhas para SharePoint (ETL)**](sharepoint-planilhas-etl) | Higieniza dados brutos e gera a planilha pronta para ingestão no SharePoint | `Power Automate Desktop` `Python` |
| [**Pipeline de Importação SharePoint**](sharepoint-import-pipeline) | Fluxo Cloud que faz parse e insere em lote via Graph API, com tratamento de erros | `Power Automate Cloud` `Graph API` |
| [**Consulta de Médicos via API**](consulta-medicos-api) | Microsserviço que recebe Nome, CRM e UF e devolve o cadastro formatado | `Python` `REST` `JSON` |
| [**Scraper Cadastral (CRM)**](crm-scraper) | Robô de scraping com XPath que consolida a situação cadastral por UF em CSV | `Python` `XPath` `PAD` |
| [**PDF Splitter Utility**](PDF-Splitter-Utility) | Divide PDFs grandes para caber no limite de upload (também no navegador) | `Python` `PowerShell` `VBScript` |
| [**Limpeza Automática de Arquivos**](limpeza-arquivos) | Retenção de 30 dias com simulação, quarentena e log de auditoria | `Python` `PowerShell` |
| [**Deleção em Lote SharePoint**](sharepoint-delecao-lote) | Expurgo de até 5.000 itens por lote com controle de rate limit | `Power Automate Cloud` `Graph API` |
| [**Registro de Ponto Híbrido**](registro-ponto) | Ponto web + desktop trocando o mesmo CSV, com jornada e saldo em tempo real | `JavaScript` `Python` |
| [**Portal Produtora Monteiro**](produtora-monteiro) | Versão demonstrativa do site institucional ([site real](https://produtoramonteiro.com/)) | `HTML` `CSS` `SEO` |

### Estudos e outros projetos

| 📁 Projeto | 📝 Descrição | 🛠 Tecnologias |
|:---|:---|:---|
| [**CodeQuest**](CodeQuest) | Jogo de desafios de programação web | `JavaScript` |
| [**PYTHON POWERUP**](PYTHON%20POWERUP) | Robô de cadastro com pyautogui (com simulação no navegador) | `Python` |
| [**PYTHON INSIGHTS**](PYTHON%20INSIGHTS) | Análise de cancelamento de clientes (com painel interativo) | `Python` `Pandas` |
| [**Weather App**](Weather%20App) | Previsão do tempo | `JavaScript` `API REST` |
| [**Cria Web**](Cria%20Web) | Landing page de agência | `HTML` `CSS` `JS` |
| [**GeeksforGeeks-clone**](GeeksforGeeks-clone) | Clone do site GeeksforGeeks | `HTML` `CSS` |
| [**to-do up**](to-do%20up) | Lista de tarefas | `JavaScript` |
| [**loja-high-tech**](loja-high-tech) | Simulação de loja virtual | `HTML` `CSS` `JS` |
| [**brecho**](brecho) | Vitrine de brechó | `HTML` `CSS` |

### Em outros repositórios

| 📁 Projeto | 📝 Descrição |
|:---|:---|
| [**Automatizer**](https://github.com/ryueik/automatizer) | Plataforma visual de automação com agentes de IA |
| [**OmniLicit**](https://omnilicit.vercel.app) | Suíte de contratações públicas (Lei 14.133/2021) |

---

## 🚀 Como Navegar

1. **Explore a tabela:** Encontre um projeto de seu interesse.
2. **Clique no link:** Você será direcionado para a pasta do projeto.
3. **Leia o README:** A maioria dos projetos tem um README com detalhes de instalação e uso.

Se quiser ver meu perfil completo com experiência, certificações e stack, visite meu portfólio.

---

## 🔗 Conecte-se Comigo

[![Portfólio](https://img.shields.io/badge/Portf%C3%B3lio-1a1b27?style=for-the-badge&logo=vercel&logoColor=7aa2f7)](https://dev-matheus-macario.vercel.app/)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-1a1b27?style=for-the-badge&logo=linkedin&logoColor=7aa2f7)](https://www.linkedin.com/in/dev-matheus-macario/)
[![GitHub](https://img.shields.io/badge/Perfil-ryueik-1a1b27?style=for-the-badge&logo=github&logoColor=7aa2f7)](https://github.com/ryueik)

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:7aa2f7,50:414868,100:1a1b27&height=100&section=footer" width="100%"/>
