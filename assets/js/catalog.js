/* Catálogo de projetos exibidos no painel (index.html da raiz).
 * Fonte única: scripts/build-catalog.mjs gera projects.json a partir deste arquivo,
 * para o portfólio (dev-matheus-macario.vercel.app) consumir os mesmos dados.
 *
 * Campos: slug, title, desc, category, tags, path (pasta neste repo ou null),
 * url (link externo), code (repositório), thumb, origin ("portfolio" | "repo" | "externo"), featured.
 */
window.PROJECTS = [
  {
    slug: "automatizer",
    title: "Automatizer",
    desc: "Plataforma visual para automatizar tarefas, inspirada no n8n e no Power Automate: blocos ligados, 15+ conectores (Google, WhatsApp, e-mail), mini-apps, agentes de IA e RPA de navegador.",
    category: "rpa",
    tags: ["Node.js", "TypeScript", "IA / Agentes", "RPA", "PostgreSQL"],
    path: null,
    url: "https://github.com/ryueik/automatizer",
    code: "https://github.com/ryueik/automatizer",
    thumb: "assets/thumbs/automatizer.jpg",
    gallery: ["assets/thumbs/automatizer.jpg", "assets/thumbs/automatizer-editor.jpg"],
    origin: "externo",
    featured: true
  },
  {
    slug: "omnilicit",
    title: "OmniLicit",
    desc: "Suíte de contratações públicas (Lei 14.133/2021): gera DFD, ETP e Termo de Referência em PDF com selo digital e hash SHA-256, audita documentos e reúne 34 normas.",
    category: "web",
    tags: ["JavaScript", "PWA", "pdfMake", "IA (Gemini/Groq)", "Vercel"],
    path: null,
    url: "https://omnilicit.vercel.app",
    code: "https://github.com/ryueik/omnilicit",
    thumb: "assets/thumbs/omnilicit.jpg",
    origin: "externo",
    featured: true
  },
  {
    slug: "sharepoint-planilhas-etl",
    title: "Gerador e Formatador de Planilhas para SharePoint",
    desc: "ETL em Power Automate Desktop e Python que higieniza dados brutos e gera a planilha pronta para ingestão no SharePoint (Inventário Patrimonial).",
    category: "rpa",
    tags: ["Power Automate Desktop", "Python", "Excel/CSV Engine", "Data Transformation"],
    path: "sharepoint-planilhas-etl/",
    thumb: "assets/thumbs/sharepoint-planilhas-etl.jpg",
    origin: "portfolio"
  },
  {
    slug: "sharepoint-import-pipeline",
    title: "Pipeline de Importação Automática para SharePoint",
    desc: "Fluxo Cloud agendado que lê arquivos de rotinas desktop, faz o parse e insere em lote nas listas via REST/Graph API com tratamento de erros.",
    category: "rpa",
    tags: ["Power Automate Cloud", "SharePoint REST API", "Graph API", "Error Handling"],
    path: "sharepoint-import-pipeline/",
    thumb: "assets/thumbs/sharepoint-import-pipeline.jpg",
    origin: "portfolio"
  },
  {
    slug: "consulta-medicos-api",
    title: "Microsserviço de Consulta de Médicos",
    desc: "API que recebe Nome, CRM e UF, consulta a validação médica externa e devolve o payload formatado em tempo real.",
    category: "web",
    tags: ["REST APIs", "JSON Parsing", "HTTP Requests", "Cloud Integration"],
    path: "consulta-medicos-api/",
    thumb: "assets/thumbs/consulta-medicos-api.jpg",
    origin: "portfolio"
  },
  {
    slug: "crm-scraper",
    title: "Web Scraper e Extrator Cadastral (CRM)",
    desc: "Robô de scraping em Python/PAD que navega no portal, extrai a situação cadastral por estado com XPath e consolida tudo em CSV.",
    category: "rpa",
    tags: ["Web Scraping", "DOM Parsing", "XPath", "CSV Automation", "Python"],
    path: "crm-scraper/",
    thumb: "assets/thumbs/crm-scraper.jpg",
    origin: "portfolio"
  },
  {
    slug: "pdf-splitter",
    title: "Utilitário de Divisão de PDFs",
    desc: "Divide PDFs acima de 4 MB em partes que cabem no limite de upload. Versões em Python (GUI), PowerShell, VBScript e agora direto no navegador.",
    category: "scripts",
    tags: ["Python", "PowerShell", "VBScript", "pdf-lib"],
    path: "PDF-Splitter-Utility/",
    thumb: "assets/thumbs/pdf-splitter.jpg",
    origin: "portfolio"
  },
  {
    slug: "limpeza-arquivos",
    title: "Governança e Limpeza Automática de Arquivos",
    desc: "Varre diretórios, lê datas de criação/modificação e remove com segurança arquivos com mais de 30 dias, com simulação, quarentena e log de auditoria.",
    category: "scripts",
    tags: ["OS Layer Automation", "PowerShell", "Python", "File Retention Rules"],
    path: "limpeza-arquivos/",
    thumb: "assets/thumbs/limpeza-arquivos.jpg",
    origin: "portfolio"
  },
  {
    slug: "sharepoint-delecao-lote",
    title: "Deleção em Lote para SharePoint",
    desc: "Expurgo de listas com laços condicionais e controle de rate limit para apagar até 5.000 itens por lote sem estourar a cota da API.",
    category: "rpa",
    tags: ["Power Automate Cloud", "API Rate Limit Control", "Batching Loops"],
    path: "sharepoint-delecao-lote/",
    thumb: "assets/thumbs/sharepoint-delecao-lote.jpg",
    origin: "portfolio"
  },
  {
    slug: "registro-ponto",
    title: "Registro de Ponto Híbrido",
    desc: "Entrada e saída em um clique, jornada e saldo calculados em tempo real, com versão web e desktop (Python) trocando o mesmo CSV.",
    category: "rpa",
    tags: ["Cloud & Desktop Integration", "DateTime Logic", "Dynamic Data Binding"],
    path: "registro-ponto/",
    thumb: "assets/thumbs/registro-ponto.jpg",
    origin: "portfolio"
  },
  {
    slug: "produtora-monteiro",
    title: "Portal Produtora Monteiro",
    desc: "Versão demonstrativa do site institucional que desenvolvi de ponta a ponta: SEO, banco de dados, segurança e infraestrutura.",
    category: "web",
    tags: ["Full Stack", "SEO", "Banco de Dados", "Segurança"],
    path: "produtora-monteiro/",
    url: "https://produtoramonteiro.com/",
    thumb: "assets/thumbs/produtora-monteiro.jpg",
    origin: "portfolio"
  },
  {
    slug: "python-insights",
    title: "Python Insights · Cancelamento de Clientes",
    desc: "Análise de 50 mil clientes para entender o cancelamento, com painel interativo e simulador das ações sugeridas pela análise.",
    category: "dados",
    tags: ["Python", "Pandas", "Plotly", "Análise de Dados"],
    path: "PYTHON INSIGHTS/",
    thumb: "assets/thumbs/python-insights.jpg",
    origin: "repo"
  },
  {
    slug: "python-powerup",
    title: "Python PowerUp · Robô de Cadastro",
    desc: "Automação com pyautogui que lê uma base de produtos e cadastra item por item num sistema web, sem intervenção humana.",
    category: "rpa",
    tags: ["Python", "pyautogui", "Pandas", "RPA"],
    path: "PYTHON POWERUP/",
    thumb: "assets/thumbs/python-powerup.jpg",
    origin: "repo"
  },
  {
    slug: "codequest",
    title: "CodeQuest",
    desc: "Jogo de desafios de programação web (HTML, CSS e JavaScript) com fases e pontuação.",
    category: "jogos",
    tags: ["JavaScript", "HTML", "CSS"],
    path: "CodeQuest/",
    thumb: "assets/thumbs/codequest.jpg",
    origin: "repo"
  },
  {
    slug: "loja-high-tech",
    title: "TechBlack · Loja High-Tech",
    desc: "Simulação de loja virtual com catálogo, carrinho, checkout e painel administrativo.",
    category: "ecommerce",
    tags: ["HTML", "CSS", "JavaScript"],
    path: "loja-high-tech/",
    thumb: "assets/thumbs/loja-high-tech.jpg",
    origin: "repo"
  },
  {
    slug: "brecho",
    title: "Brechó da Família Guimarães",
    desc: "Vitrine de brechó vintage com página de produtos.",
    category: "ecommerce",
    tags: ["HTML", "CSS"],
    path: "brecho/",
    thumb: "assets/thumbs/brecho.jpg",
    origin: "repo"
  },
  {
    slug: "cria-web",
    title: "CriaWeb · Criação de Sites",
    desc: "Landing page de agência de criação de sites.",
    category: "web",
    tags: ["HTML", "CSS", "JavaScript"],
    path: "Cria Web/",
    thumb: "assets/thumbs/cria-web.jpg",
    origin: "repo"
  },
  {
    slug: "geeksforgeeks-clone",
    title: "GeeksforGeeks Clone",
    desc: "Clone do portal com tutoriais, blog, fórum, login e cadastro.",
    category: "web",
    tags: ["HTML", "CSS", "JavaScript"],
    path: "GeeksforGeeks-clone/",
    thumb: "assets/thumbs/geeksforgeeks-clone.jpg",
    origin: "repo"
  },
  {
    slug: "to-do-up",
    title: "To-Do Up",
    desc: "Lista de tarefas com animações e armazenamento local.",
    category: "web",
    tags: ["JavaScript"],
    path: "to-do up/",
    thumb: "assets/thumbs/to-do-up.jpg",
    origin: "repo"
  },
  {
    slug: "weather-app",
    title: "Weather App",
    desc: "Previsão do tempo por cidade consumindo a API do OpenWeather.",
    category: "web",
    tags: ["JavaScript", "API REST", "Python"],
    path: "Weather App/",
    thumb: "assets/thumbs/weather-app.jpg",
    origin: "repo"
  }
];

window.PROJECT_CATEGORIES = {
  rpa: "RPA & Automação",
  web: "Web",
  scripts: "Scripts",
  dados: "Dados",
  ecommerce: "E-commerce",
  jogos: "Jogos"
};
