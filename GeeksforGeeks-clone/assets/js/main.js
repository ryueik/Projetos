/* GFG Clone — script compartilhado por todas as páginas.
   - Cabeçalho: menu mobile, tema claro/escuro, sessão do usuário
   - Blog: posts padrão + posts criados (localStorage), busca e filtro
   - Post: leitura, comentários (localStorage)
   - Editor: validação, rascunho automático e publicação
   - Tutoriais: filtro, busca e progresso
   - Fórum: tópicos e respostas (localStorage)
   - Login/Cadastro: validação e contas de demonstração (localStorage)
   Todo conteúdo digitado pelo usuário é inserido com textContent (nunca innerHTML). */
(function () {
  'use strict';

  /* =========================================================
     Utilidades
     ========================================================= */
  var KEY = {
    theme: 'gfg:theme', posts: 'gfg:posts', comments: 'gfg:comments', topics: 'gfg:topics',
    replies: 'gfg:replies', users: 'gfg:users', session: 'gfg:session', draft: 'gfg:draft', done: 'gfg:tutorials-done'
  };
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      var v = JSON.parse(raw);
      return v === null || v === undefined ? fallback : v;
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k === 'dataset') Object.keys(attrs[k]).forEach(function (d) { node.dataset[d] = attrs[k][d]; });
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); }).join('') || '?';
  }
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function param(name) { return new URLSearchParams(location.search).get(name); }

  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 3200);
  }

  /* ---------- Validação de formulários ---------- */
  function setError(input, msg) {
    var field = input.closest('.field');
    if (!field) return;
    field.classList.toggle('is-invalid', !!msg);
    var e = field.querySelector('.field__error');
    if (e) e.textContent = msg || '';
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  // rules: { nomeDoCampo: function(valor, form) -> mensagem de erro ou '' }
  function bindValidation(form, rules) {
    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      if (!input) return;
      input.addEventListener('blur', function () { setError(input, rules[name](input.value, form)); });
      input.addEventListener('input', function () {
        if (input.closest('.field') && input.closest('.field').classList.contains('is-invalid')) {
          setError(input, rules[name](input.value, form));
        }
      });
    });
    return function validate() {
      var first = null;
      Object.keys(rules).forEach(function (name) {
        var input = form.elements[name];
        if (!input) return;
        var msg = rules[name](input.value, form);
        setError(input, msg);
        if (msg && !first) first = input;
      });
      if (first) first.focus();
      return !first;
    };
  }
  var isEmail = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()); };

  /* =========================================================
     Dados padrão
     ========================================================= */
  var CATS = {
    'Web': { cls: 'web', glyph: '</>' },
    'Algoritmos': { cls: 'algo', glyph: 'O(n)' },
    'IA & Dados': { cls: 'ia', glyph: 'AI' },
    'Carreira': { cls: 'career', glyph: '↗' }
  };
  function catInfo(c) { return CATS[c] || { cls: 'career', glyph: '#' }; }

  var DAY = 86400000;
  var SEED_POSTS = [
    {
      id: 'flexbox-grid', title: 'Flexbox ou Grid? Quando usar cada um', category: 'Web', author: 'Equipe GFG Clone',
      date: Date.UTC(2025, 4, 1, 12), seed: true,
      excerpt: 'Os dois resolvem layout, mas brilham em situações diferentes. Veja um guia prático para escolher sem dúvida.',
      content: 'Flexbox e CSS Grid são as duas ferramentas modernas de layout do CSS. A regra prática: Flexbox organiza itens em UMA direção; Grid organiza em DUAS.\n\n## Quando usar Flexbox\n- Barras de navegação e menus\n- Alinhar ícone e texto dentro de um botão\n- Distribuir itens com espaço entre eles\n\n```\n.menu {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n```\n\n## Quando usar Grid\n- Layout geral da página (cabeçalho, conteúdo, rodapé)\n- Galerias e grades de cards\n- Quando linhas e colunas precisam se alinhar\n\n```\n.cards {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));\n  gap: 16px;\n}\n```\n\nNa prática, você vai combinar os dois: Grid para a estrutura, Flexbox para os detalhes dentro de cada bloco.'
    },
    {
      id: 'big-o', title: 'Notação Big O explicada sem complicação', category: 'Algoritmos', author: 'Equipe GFG Clone',
      date: Date.UTC(2025, 3, 25, 12), seed: true,
      excerpt: 'Entenda como medir a eficiência de um algoritmo e por que O(log n) é tão melhor que O(n²).',
      content: 'A notação Big O descreve como o tempo (ou a memória) de um algoritmo cresce quando a entrada aumenta.\n\n## As complexidades mais comuns\n- O(1): constante — acessar um item de um array pelo índice\n- O(log n): logarítmica — busca binária\n- O(n): linear — percorrer uma lista\n- O(n log n): ordenações eficientes, como merge sort\n- O(n²): dois laços aninhados\n\n```\n// O(n²): compara todos com todos\nfor (const a of lista) {\n  for (const b of lista) {\n    if (a === b) contar++;\n  }\n}\n```\n\nCom 1.000 itens, um algoritmo O(n²) faz cerca de 1 milhão de operações, enquanto um O(log n) faz cerca de 10. Por isso escolher a estrutura de dados certa faz tanta diferença.'
    },
    {
      id: 'primeiros-passos-ia', title: 'Primeiros passos em Inteligência Artificial', category: 'IA & Dados', author: 'Equipe GFG Clone',
      date: Date.UTC(2025, 3, 18, 12), seed: true,
      excerpt: 'Um roteiro para começar a estudar IA e aprendizado de máquina sem se perder em teoria.',
      content: 'Inteligência Artificial parece intimidadora, mas dá para começar com passos pequenos.\n\n## Roteiro sugerido\n- Aprenda Python e bibliotecas como Pandas e NumPy\n- Revise estatística básica: média, variância e probabilidade\n- Treine um primeiro modelo com scikit-learn\n- Entenda como avaliar um modelo (acurácia, precisão, recall)\n\n```\nfrom sklearn.linear_model import LogisticRegression\nmodelo = LogisticRegression()\nmodelo.fit(X_treino, y_treino)\nprint(modelo.score(X_teste, y_teste))\n```\n\nO mais importante é praticar com dados reais: escolha um conjunto de dados que te interesse e tente responder uma pergunta com ele.'
    }
  ];
  var SEED_COMMENTS = {
    'flexbox-grid': [
      { name: 'João Silva', text: 'Ótimo post! Muito útil, aprendi bastante!', date: Date.UTC(2025, 4, 2, 12) },
      { name: 'Maria Oliveira', text: 'Excelente explicação! Vou tentar aplicar no meu projeto.', date: Date.UTC(2025, 4, 3, 12) }
    ]
  };

  var TUTORIALS = [
    { id: 'js-intro', cat: 'web', title: 'Introdução ao JavaScript', level: 'Iniciante', time: '45 min',
      desc: 'Explore os fundamentos de JavaScript e como aplicar em seu dia a dia como desenvolvedor.',
      topics: ['Variáveis: let, const e var', 'Tipos de dados e operadores', 'Funções e arrow functions', 'Arrays e métodos map/filter/reduce', 'Manipulando o DOM'] },
    { id: 'html-css', cat: 'web', title: 'Desenvolvimento Web com HTML5 e CSS3', level: 'Iniciante', time: '1h 10min',
      desc: 'Construa sites incríveis com HTML5 e CSS3, e aprenda os conceitos de design responsivo.',
      topics: ['Estrutura semântica do HTML5', 'Seletores e especificidade', 'Flexbox e Grid', 'Media queries e mobile first', 'Acessibilidade básica'] },
    { id: 'react', cat: 'web', title: 'React para Iniciantes', level: 'Intermediário', time: '1h 30min',
      desc: 'Domine a biblioteca React e crie aplicações web modernas e eficientes.',
      topics: ['Componentes e JSX', 'Props e estado com useState', 'Efeitos com useEffect', 'Listas e formulários', 'Organizando um projeto'] },
    { id: 'algo-ds', cat: 'algoritmos', title: 'Algoritmos e Estruturas de Dados', level: 'Intermediário', time: '2h',
      desc: 'Aprenda a manipular dados de forma eficiente utilizando algoritmos e estruturas adequadas.',
      topics: ['Arrays, pilhas e filas', 'Listas ligadas', 'Árvores e grafos', 'Busca binária', 'Notação Big O'] },
    { id: 'sorting', cat: 'algoritmos', title: 'Algoritmos de Ordenação', level: 'Intermediário', time: '50 min',
      desc: 'Bubble, insertion, merge e quick sort: como funcionam e quando usar cada um.',
      topics: ['Bubble sort e insertion sort', 'Merge sort (dividir para conquistar)', 'Quick sort e pivôs', 'Comparando complexidades'] },
    { id: 'recursion', cat: 'algoritmos', title: 'Recursão na Prática', level: 'Avançado', time: '40 min',
      desc: 'Entenda casos base, pilha de chamadas e memoização com exemplos clássicos.',
      topics: ['Caso base e passo recursivo', 'Pilha de chamadas', 'Fibonacci com memoização', 'Backtracking'] },
    { id: 'python-dados', cat: 'ia', title: 'Python para Análise de Dados', level: 'Iniciante', time: '1h 20min',
      desc: 'Use Pandas e NumPy para limpar, transformar e analisar conjuntos de dados reais.',
      topics: ['Introdução ao Pandas', 'Leitura de CSV e Excel', 'Filtros e agrupamentos', 'Gráficos com Matplotlib'] },
    { id: 'ml-intro', cat: 'ia', title: 'Machine Learning: o primeiro modelo', level: 'Intermediário', time: '1h 40min',
      desc: 'Treine e avalie seu primeiro modelo de classificação com scikit-learn.',
      topics: ['Treino e teste', 'Regressão logística', 'Métricas de avaliação', 'Evitando overfitting'] }
  ];
  var TUT_CAT_LABEL = { web: 'Web', algoritmos: 'Algoritmos', ia: 'IA & Dados' };

  var SEED_TOPICS = [
    { id: 't1', title: 'Qual a melhor linguagem para aprendizado?', body: 'O que você acha sobre começar a aprender Python ou JavaScript? Compartilhe suas experiências!', author: 'Lucas M.', date: Date.UTC(2025, 4, 6, 12), seed: true },
    { id: 't2', title: 'Desafios de Algoritmos', body: 'Venha compartilhar desafios de algoritmos e resoluções com a comunidade.', author: 'Ana P.', date: Date.UTC(2025, 4, 4, 12), seed: true },
    { id: 't3', title: 'Inteligência Artificial no Mercado', body: 'Como você vê o impacto da inteligência artificial no futuro da tecnologia?', author: 'Carlos R.', date: Date.UTC(2025, 4, 2, 12), seed: true },
    { id: 't4', title: 'Desenvolvimento Web Responsivo', body: 'Troque dicas sobre como criar designs responsivos e otimizar a experiência do usuário.', author: 'Beatriz S.', date: Date.UTC(2025, 3, 28, 12), seed: true }
  ];
  var SEED_REPLIES = {
    t1: [{ name: 'Rafa', text: 'Comecei com Python e achei a sintaxe bem amigável. Depois foi tranquilo aprender JS.', date: Date.UTC(2025, 4, 6, 15) }],
    t4: [{ name: 'Diego', text: 'Mobile first salvou meus projetos. Comece pelo layout do celular e vá adicionando media queries.', date: Date.UTC(2025, 3, 29, 12) }]
  };

  /* ---------- Acesso aos dados ---------- */
  function migrateLegacyPost() {
    // Versão antiga salvava um único post (com HTML do TinyMCE) na chave "post".
    var legacy = read('post', null);
    if (!legacy || !legacy.title) return;
    var text = '';
    try { text = new DOMParser().parseFromString(String(legacy.content || ''), 'text/html').body.textContent || ''; } catch (e) { text = ''; }
    var posts = read(KEY.posts, []);
    posts.unshift({ id: uid(), title: clean(legacy.title).slice(0, 120), category: 'Web', author: 'Você', date: Date.now(),
      excerpt: clean(text).slice(0, 160), content: text.trim() || clean(legacy.title) });
    write(KEY.posts, posts);
    try { localStorage.removeItem('post'); } catch (e) { /* ignore */ }
  }
  function getPosts() {
    var mine = read(KEY.posts, []);
    if (!Array.isArray(mine)) mine = [];
    mine = mine.filter(function (p) { return p && p.id && p.title && p.content; });
    return mine.concat(SEED_POSTS).sort(function (a, b) { return b.date - a.date; });
  }
  function getComments(postId) {
    var all = read(KEY.comments, {});
    var mine = (all && Array.isArray(all[postId])) ? all[postId] : [];
    return (SEED_COMMENTS[postId] || []).concat(mine);
  }
  function addComment(postId, c) {
    var all = read(KEY.comments, {});
    if (!all || typeof all !== 'object') all = {};
    all[postId] = (Array.isArray(all[postId]) ? all[postId] : []).concat([c]);
    write(KEY.comments, all);
  }
  function session() { var s = read(KEY.session, null); return s && s.name ? s : null; }

  /* =========================================================
     Cabeçalho, tema, menu, sessão
     ========================================================= */
  function initHeader() {
    var page = document.body.dataset.page;
    var map = { post: 'blog' };
    var active = map[page] || page;
    $$('[data-nav]').forEach(function (a) {
      if (a.dataset.nav === active) a.setAttribute('aria-current', 'page');
    });

    var root = document.documentElement;
    var themeBtn = $('#themeBtn');
    if (themeBtn) themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(KEY.theme, next); } catch (e) { /* ignore */ }
    });

    var nav = $('#nav'), menuBtn = $('#menuBtn');
    function setMenu(open) {
      nav.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      document.body.classList.toggle('menu-open', open);
    }
    if (menuBtn && nav) {
      menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
      nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
      window.addEventListener('resize', function () { if (window.innerWidth > 900) setMenu(false); });
    }

    var header = $('.site-header');
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 6); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var user = session();
    var auth = $('#navAuth');
    if (user && auth) {
      auth.textContent = '';
      var who = el('span', { class: 'nav__user' }, [el('span', { class: 'avatar avatar--sm', text: initials(user.name) }), el('span', { text: user.name })]);
      var out = el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Sair' });
      out.addEventListener('click', function () {
        try { localStorage.removeItem(KEY.session); } catch (e) { /* ignore */ }
        toast('Você saiu da sua conta.');
        setTimeout(function () { location.reload(); }, 600);
      });
      auth.append(who, out);
    }

    $$('[data-year]').forEach(function (n) { n.textContent = String(new Date().getFullYear()); });
  }

  /* =========================================================
     Componentes de post
     ========================================================= */
  function cover(category, cls) {
    var info = catInfo(category);
    return el('div', { class: (cls || 'cover') + ' cover--' + info.cls, 'aria-hidden': 'true' }, [el('span', { text: info.glyph })]);
  }
  function postCard(p) {
    var link = 'post-details.html?id=' + encodeURIComponent(p.id);
    var comments = getComments(p.id).length;
    return el('article', { class: 'post-card' }, [
      el('a', { href: link, class: 'post-card__media', tabindex: '-1', 'aria-hidden': 'true' }, [cover(p.category)]),
      el('div', { class: 'post-info' }, [
        el('div', { class: 'post-card__meta' }, [
          el('span', { class: 'tag tag--' + catInfo(p.category).cls, text: p.category }),
          el('span', { class: 'muted small', text: fmtDate(p.date) })
        ]),
        el('h3', { class: 'post-title' }, [el('a', { href: link, text: p.title })]),
        el('p', { class: 'post-description', text: p.excerpt || clean(p.content).slice(0, 140) + '…' }),
        el('div', { class: 'post-card__foot' }, [
          el('span', { class: 'author' }, [el('span', { class: 'avatar avatar--sm', text: initials(p.author) }), el('span', { text: p.author })]),
          el('span', { class: 'muted small', text: comments + (comments === 1 ? ' comentário' : ' comentários') })
        ])
      ])
    ]);
  }

  // Converte o texto do post (markdown simples) em elementos DOM seguros.
  function renderProse(container, text) {
    container.textContent = '';
    var lines = String(text).replace(/\r\n/g, '\n').split('\n');
    var para = [], list = null, code = null;
    function flushPara() { if (para.length) { container.appendChild(el('p', { text: para.join(' ') })); para = []; } }
    function flushList() { if (list) { container.appendChild(list); list = null; } }
    lines.forEach(function (line) {
      if (code) {
        if (/^```/.test(line.trim())) { container.appendChild(el('pre', null, [el('code', { text: code.join('\n') })])); code = null; }
        else code.push(line);
        return;
      }
      var t = line.trim();
      if (/^```/.test(t)) { flushPara(); flushList(); code = []; return; }
      if (!t) { flushPara(); flushList(); return; }
      if (/^#{2,3}\s+/.test(t)) { flushPara(); flushList(); container.appendChild(el('h2', { text: t.replace(/^#{2,3}\s+/, '') })); return; }
      if (/^[-*]\s+/.test(t)) { flushPara(); if (!list) list = el('ul'); list.appendChild(el('li', { text: t.replace(/^[-*]\s+/, '') })); return; }
      flushList(); para.push(t);
    });
    if (code) container.appendChild(el('pre', null, [el('code', { text: code.join('\n') })]));
    flushPara(); flushList();
  }

  /* =========================================================
     Páginas
     ========================================================= */
  function pageHome() {
    var box = $('#latestPosts');
    if (!box) return;
    getPosts().slice(0, 3).forEach(function (p) { box.appendChild(postCard(p)); });
  }

  function pageBlog() {
    var list = $('#blogList'), chips = $('#blogChips'), search = $('#blogSearch'), empty = $('#blogEmpty');
    var posts = getPosts();
    var current = 'all';
    var cats = ['all'].concat(Object.keys(CATS));
    cats.forEach(function (c, i) {
      var b = el('button', { class: 'chip' + (i === 0 ? ' is-active' : ''), type: 'button', role: 'tab', 'aria-selected': String(i === 0), text: c === 'all' ? 'Todos' : c });
      b.addEventListener('click', function () {
        current = c;
        $$('.chip', chips).forEach(function (x) { x.classList.toggle('is-active', x === b); x.setAttribute('aria-selected', String(x === b)); });
        draw();
      });
      chips.appendChild(b);
    });
    function draw() {
      var q = clean(search.value).toLowerCase();
      var items = posts.filter(function (p) {
        return (current === 'all' || p.category === current) &&
          (!q || (p.title + ' ' + p.excerpt + ' ' + p.content).toLowerCase().indexOf(q) !== -1);
      });
      list.textContent = '';
      items.forEach(function (p) { list.appendChild(postCard(p)); });
      empty.hidden = items.length > 0;
    }
    search.addEventListener('input', draw);
    draw();
  }

  function pagePost() {
    var id = param('id');
    var posts = getPosts();
    var post = id ? posts.find(function (p) { return p.id === id; }) : posts[0];
    if (!post) {
      $('#post').hidden = true;
      $('#notFound').hidden = false;
      document.title = 'Post não encontrado · GFG Clone';
      return;
    }
    document.title = post.title + ' · GFG Clone';
    $('#post-title').textContent = post.title;
    $('#post-date').textContent = 'Publicado em ' + fmtDate(post.date) + ' · por ' + post.author;
    var catEl = $('#postCategory');
    catEl.textContent = post.category;
    catEl.className = 'tag tag--' + catInfo(post.category).cls;
    $('#postCover').appendChild(cover(post.category, 'cover cover--wide'));
    renderProse($('#post-content'), post.content);

    $('#copyLink').addEventListener('click', function () {
      var url = location.href;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(function () { toast('Link copiado!'); }, function () { toast('Não foi possível copiar o link.'); });
      } else { toast('Copie o endereço na barra do navegador.'); }
    });

    var box = $('#comments'), count = $('#commentCount');
    function drawComments() {
      var items = getComments(post.id);
      box.textContent = '';
      if (!items.length) box.appendChild(el('p', { class: 'muted', text: 'Ainda não há comentários. Seja o primeiro!' }));
      items.forEach(function (c) {
        box.appendChild(el('div', { class: 'comment' }, [
          el('span', { class: 'avatar', text: initials(c.name) }),
          el('div', null, [
            el('p', { class: 'comment__head' }, [el('strong', { text: c.name }), el('span', { class: 'muted small', text: fmtDate(c.date) })]),
            el('p', { class: 'comment__text', text: c.text })
          ])
        ]));
      });
      count.textContent = String(items.length);
    }
    drawComments();

    var form = $('#commentForm');
    var user = session();
    if (user) form.elements.name.value = user.name;
    var validate = bindValidation(form, {
      name: function (v) { return clean(v).length >= 2 ? '' : 'Informe seu nome.'; },
      comment: function (v) { return clean(v).length >= 3 ? '' : 'Escreva um comentário (mínimo 3 caracteres).'; }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) return;
      addComment(post.id, { name: clean(form.elements.name.value).slice(0, 40), text: String(form.elements.comment.value).trim().slice(0, 800), date: Date.now() });
      form.elements.comment.value = '';
      drawComments();
      toast('Comentário publicado!');
    });
  }

  function pageWrite() {
    var form = $('#postForm');
    var f = form.elements;
    var user = session();
    var draft = read(KEY.draft, null);
    if (draft && typeof draft === 'object') {
      ['title', 'category', 'author', 'excerpt', 'content'].forEach(function (k) { if (typeof draft[k] === 'string') f[k].value = draft[k]; });
    }
    if (!f.author.value && user) f.author.value = user.name;

    var validate = bindValidation(form, {
      title: function (v) { return clean(v).length >= 5 ? '' : 'O título precisa de pelo menos 5 caracteres.'; },
      category: function (v) { return v ? '' : 'Escolha uma categoria.'; },
      author: function (v) { return clean(v).length >= 2 ? '' : 'Informe o nome do autor.'; },
      excerpt: function (v) { return clean(v).length > 180 ? 'Resumo muito longo (máx. 180).' : ''; },
      content: function (v) { return String(v).trim().length >= 40 ? '' : 'Escreva pelo menos 40 caracteres de conteúdo.'; }
    });

    var pvCover = $('#previewCover'), pvCat = $('#previewCat');
    function preview() {
      var cat = f.category.value;
      $('#previewHeading').textContent = clean(f.title.value) || 'Título do post';
      $('#previewExcerpt').textContent = clean(f.excerpt.value) || (clean(f.content.value).slice(0, 140) || 'O resumo do seu post aparecerá aqui.');
      pvCat.textContent = cat || 'Categoria';
      pvCover.className = 'preview__cover cover--' + (cat ? catInfo(cat).cls : 'web');
      $('#contentCount').textContent = String(f.content.value.length) + ' caracteres';
    }
    var saveTimer;
    form.addEventListener('input', function () {
      preview();
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        write(KEY.draft, { title: f.title.value, category: f.category.value, author: f.author.value, excerpt: f.excerpt.value, content: f.content.value });
      }, 400);
    });
    form.addEventListener('change', preview);
    preview();

    // Barra de formatação (insere marcações de texto simples)
    $$('[data-md]').forEach(function (b) {
      b.addEventListener('click', function () {
        var ta = f.content;
        var start = ta.selectionStart, end = ta.selectionEnd;
        var pre = b.dataset.md.replace(/\\n/g, '\n');
        var post = (b.dataset.mdEnd || '').replace(/\\n/g, '\n');
        var before = ta.value.slice(0, start);
        if (before && !/\n$/.test(before)) pre = '\n' + pre;
        ta.value = before + pre + ta.value.slice(start, end) + post + ta.value.slice(end);
        ta.focus();
        var pos = (before + pre).length + (end - start);
        ta.setSelectionRange(pos, pos);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    $('#clearDraft').addEventListener('click', function () {
      if (!confirm('Descartar o rascunho atual?')) return;
      form.reset();
      try { localStorage.removeItem(KEY.draft); } catch (e) { /* ignore */ }
      if (user) f.author.value = user.name;
      $$('.field', form).forEach(function (fl) { fl.classList.remove('is-invalid'); var er = fl.querySelector('.field__error'); if (er) er.textContent = ''; });
      preview();
      toast('Rascunho descartado.');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) { toast('Confira os campos destacados.'); return; }
      var content = String(f.content.value).trim().slice(0, 20000);
      var post = {
        id: uid(), title: clean(f.title.value).slice(0, 120), category: f.category.value,
        author: clean(f.author.value).slice(0, 40),
        excerpt: clean(f.excerpt.value).slice(0, 180) || clean(content.replace(/[#`*-]/g, '')).slice(0, 160),
        content: content, date: Date.now()
      };
      var posts = read(KEY.posts, []);
      if (!Array.isArray(posts)) posts = [];
      posts.unshift(post);
      if (!write(KEY.posts, posts)) { toast('Não foi possível salvar: armazenamento indisponível.'); return; }
      try { localStorage.removeItem(KEY.draft); } catch (err) { /* ignore */ }
      toast('Post publicado com sucesso!');
      setTimeout(function () { location.href = 'post-details.html?id=' + encodeURIComponent(post.id); }, 700);
    });
  }

  function pageTutorials() {
    var list = $('#tutList'), search = $('#tutSearch'), chips = $('#tutChips'), countEl = $('#tutCount');
    var done = read(KEY.done, []);
    if (!Array.isArray(done)) done = [];
    var cat = param('cat');
    if (!TUT_CAT_LABEL[cat]) cat = 'all';
    var q0 = param('q');
    if (q0) search.value = q0.slice(0, 60);

    $$('.chip', chips).forEach(function (b) {
      var on = b.dataset.cat === cat;
      b.classList.toggle('is-active', on); b.setAttribute('aria-selected', String(on));
      b.addEventListener('click', function () {
        cat = b.dataset.cat;
        $$('.chip', chips).forEach(function (x) { x.classList.toggle('is-active', x === b); x.setAttribute('aria-selected', String(x === b)); });
        draw();
      });
    });

    function draw() {
      var q = clean(search.value).toLowerCase();
      var items = TUTORIALS.filter(function (t) {
        return (cat === 'all' || t.cat === cat) &&
          (!q || (t.title + ' ' + t.desc + ' ' + t.topics.join(' ') + ' ' + TUT_CAT_LABEL[t.cat]).toLowerCase().indexOf(q) !== -1);
      });
      countEl.textContent = items.length + (items.length === 1 ? ' tutorial encontrado' : ' tutoriais encontrados') +
        ' · ' + done.length + ' concluído' + (done.length === 1 ? '' : 's');
      list.textContent = '';
      if (!items.length) {
        list.appendChild(el('div', { class: 'empty' }, [el('h2', { text: 'Nenhum tutorial encontrado' }), el('p', { class: 'muted', text: 'Tente outro termo de busca ou categoria.' })]));
        return;
      }
      items.forEach(function (t, i) {
        var isDone = done.indexOf(t.id) !== -1;
        var panelId = 'tut-' + t.id;
        var toggle = el('button', { class: 'btn btn--ghost btn--sm', type: 'button', 'aria-expanded': 'false', 'aria-controls': panelId, text: 'Ver tutorial' });
        var mark = el('button', { class: 'btn btn--sm ' + (isDone ? 'btn--done' : 'btn--primary'), type: 'button', text: isDone ? '✓ Concluído' : 'Marcar como concluído' });
        var panel = el('div', { class: 'tutorial__panel', id: panelId, hidden: '' }, [
          el('h4', { text: 'O que você vai aprender' }),
          el('ol', null, t.topics.map(function (x) { return el('li', { text: x }); })),
          mark
        ]);
        toggle.addEventListener('click', function () {
          var open = panel.hidden;
          panel.hidden = !open;
          toggle.setAttribute('aria-expanded', String(open));
          toggle.textContent = open ? 'Fechar' : 'Ver tutorial';
        });
        mark.addEventListener('click', function () {
          var idx = done.indexOf(t.id);
          if (idx === -1) done.push(t.id); else done.splice(idx, 1);
          write(KEY.done, done);
          var now = done.indexOf(t.id) !== -1;
          mark.className = 'btn btn--sm ' + (now ? 'btn--done' : 'btn--primary');
          mark.textContent = now ? '✓ Concluído' : 'Marcar como concluído';
          art.classList.toggle('is-done', now);
          countEl.textContent = items.length + (items.length === 1 ? ' tutorial encontrado' : ' tutoriais encontrados') +
            ' · ' + done.length + ' concluído' + (done.length === 1 ? '' : 's');
          if (now) toast('Boa! Tutorial concluído.');
        });
        var art = el('article', { class: 'tutorial-item' + (isDone ? ' is-done' : '') }, [
          el('div', { class: 'tutorial__num', text: String(i + 1).padStart(2, '0') }),
          el('div', { class: 'tutorial__body' }, [
            el('div', { class: 'tutorial__meta' }, [
              el('span', { class: 'tag tag--' + ({ web: 'web', algoritmos: 'algo', ia: 'ia' })[t.cat], text: TUT_CAT_LABEL[t.cat] }),
              el('span', { class: 'muted small', text: t.level + ' · ' + t.time })
            ]),
            el('h3', { text: t.title }),
            el('p', { class: 'muted', text: t.desc }),
            panel
          ]),
          el('div', { class: 'tutorial__actions' }, [toggle])
        ]);
        list.appendChild(art);
      });
    }
    search.addEventListener('input', draw);
    draw();
  }

  function pageForum() {
    var list = $('#topicList');
    var user = session();
    function topics() {
      var mine = read(KEY.topics, []);
      if (!Array.isArray(mine)) mine = [];
      return mine.filter(function (t) { return t && t.id && t.title; }).concat(SEED_TOPICS);
    }
    function replies(id) {
      var all = read(KEY.replies, {});
      return (SEED_REPLIES[id] || []).concat(all && Array.isArray(all[id]) ? all[id] : []);
    }
    function addReply(id, r) {
      var all = read(KEY.replies, {});
      if (!all || typeof all !== 'object') all = {};
      all[id] = (Array.isArray(all[id]) ? all[id] : []).concat([r]);
      write(KEY.replies, all);
    }
    var openId = null;

    function draw() {
      list.textContent = '';
      topics().forEach(function (t) {
        var reps = replies(t.id);
        var panelId = 'disc-' + t.id;
        var isOpen = openId === t.id;
        var btn = el('button', { class: 'btn btn--ghost btn--sm', type: 'button', 'aria-expanded': String(isOpen), 'aria-controls': panelId, text: isOpen ? 'Fechar discussão' : 'Ver discussão' });
        var panel = el('div', { class: 'discussion__panel', id: panelId });
        panel.hidden = !isOpen;
        if (isOpen) fillPanel(panel, t, reps);
        btn.addEventListener('click', function () { openId = isOpen ? null : t.id; draw(); if (!isOpen) { var p = document.getElementById(panelId); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } });
        list.appendChild(el('article', { class: 'discussion-item' + (isOpen ? ' is-open' : '') }, [
          el('div', { class: 'discussion__head' }, [
            el('span', { class: 'avatar', text: initials(t.author) }),
            el('div', { class: 'discussion__title' }, [
              el('h3', { text: t.title }),
              el('p', { class: 'muted small', text: t.author + ' · ' + fmtDate(t.date) })
            ]),
            el('span', { class: 'pill', title: 'Respostas' }, [String(reps.length), el('span', { class: 'sr-only', text: ' respostas' })])
          ]),
          el('p', { class: 'discussion__body', text: t.body }),
          el('div', { class: 'discussion__foot' }, [btn]),
          panel
        ]));
      });
    }

    function fillPanel(panel, t, reps) {
      if (!reps.length) panel.appendChild(el('p', { class: 'muted', text: 'Nenhuma resposta ainda. Que tal começar a conversa?' }));
      reps.forEach(function (r) {
        panel.appendChild(el('div', { class: 'comment' }, [
          el('span', { class: 'avatar avatar--sm', text: initials(r.name) }),
          el('div', null, [
            el('p', { class: 'comment__head' }, [el('strong', { text: r.name }), el('span', { class: 'muted small', text: fmtDate(r.date) })]),
            el('p', { class: 'comment__text', text: r.text })
          ])
        ]));
      });
      var nameIn = el('input', { type: 'text', name: 'name', maxlength: '40', placeholder: 'Seu nome', 'aria-label': 'Seu nome' });
      if (user) nameIn.value = user.name;
      var textIn = el('textarea', { name: 'text', rows: '3', maxlength: '800', placeholder: 'Escreva sua resposta…', 'aria-label': 'Resposta' });
      var form = el('form', { class: 'reply-form', novalidate: '' }, [
        el('div', { class: 'field' }, [nameIn, el('small', { class: 'field__error' })]),
        el('div', { class: 'field' }, [textIn, el('small', { class: 'field__error' })]),
        el('button', { class: 'btn btn--primary btn--sm', type: 'submit', text: 'Responder' })
      ]);
      var validate = bindValidation(form, {
        name: function (v) { return clean(v).length >= 2 ? '' : 'Informe seu nome.'; },
        text: function (v) { return clean(v).length >= 3 ? '' : 'Escreva uma resposta (mínimo 3 caracteres).'; }
      });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validate()) return;
        addReply(t.id, { name: clean(nameIn.value).slice(0, 40), text: String(textIn.value).trim().slice(0, 800), date: Date.now() });
        draw();
        toast('Resposta publicada!');
      });
      panel.appendChild(form);
    }

    var form = $('#novoTopico');
    if (user) form.elements.author.value = user.name;
    var validate = bindValidation(form, {
      title: function (v) { return clean(v).length >= 8 ? '' : 'Use um título com pelo menos 8 caracteres.'; },
      body: function (v) { return clean(v).length >= 15 ? '' : 'Descreva com pelo menos 15 caracteres.'; },
      author: function (v) { return clean(v).length >= 2 ? '' : 'Informe seu nome.'; }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) return;
      var mine = read(KEY.topics, []);
      if (!Array.isArray(mine)) mine = [];
      var t = { id: uid(), title: clean(form.elements.title.value).slice(0, 120), body: String(form.elements.body.value).trim().slice(0, 1500), author: clean(form.elements.author.value).slice(0, 40), date: Date.now() };
      mine.unshift(t);
      write(KEY.topics, mine);
      form.elements.title.value = ''; form.elements.body.value = '';
      openId = t.id;
      draw();
      list.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast('Tópico publicado!');
    });
    draw();
  }

  /* ---------- Contas (demonstração local) ---------- */
  function hash(text) {
    var data = 'gfg-clone::' + text;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(data)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      });
    }
    var h = 5381;
    for (var i = 0; i < data.length; i++) h = ((h << 5) + h + data.charCodeAt(i)) >>> 0;
    return Promise.resolve('djb2-' + h.toString(16));
  }
  function bindPassToggles() {
    $$('[data-toggle-pass]').forEach(function (b) {
      b.addEventListener('click', function () {
        var input = document.getElementById(b.dataset.togglePass);
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        b.textContent = show ? 'Ocultar' : 'Mostrar';
        b.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
      });
    });
  }

  function pageLogin() {
    bindPassToggles();
    var form = $('#loginForm'), msg = $('#loginMsg');
    var validate = bindValidation(form, {
      email: function (v) { return isEmail(v) ? '' : 'Informe um e-mail válido.'; },
      password: function (v) { return v.length >= 6 ? '' : 'A senha tem pelo menos 6 caracteres.'; }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.textContent = '';
      if (!validate()) return;
      var email = clean(form.elements.email.value).toLowerCase();
      var users = read(KEY.users, []);
      if (!Array.isArray(users)) users = [];
      var u = users.find(function (x) { return x.email === email; });
      hash(form.elements.password.value).then(function (h) {
        if (!u || u.hash !== h) { msg.textContent = 'E-mail ou senha incorretos.'; return; }
        write(KEY.session, { name: u.name, email: u.email });
        toast('Bem-vindo de volta, ' + u.name + '!');
        setTimeout(function () { location.href = 'index.html'; }, 800);
      });
    });
  }

  function pageRegister() {
    bindPassToggles();
    var form = $('#registerForm'), msg = $('#registerMsg');
    var bar = $('#strengthBar');
    form.elements.password.addEventListener('input', function () {
      var v = form.elements.password.value, s = 0;
      if (v.length >= 6) s++;
      if (v.length >= 10) s++;
      if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
      if (/\d/.test(v)) s++;
      if (/[^A-Za-z0-9]/.test(v)) s++;
      bar.style.width = (s / 5 * 100) + '%';
      bar.dataset.level = s <= 2 ? 'fraca' : s <= 3 ? 'media' : 'forte';
    });
    var validate = bindValidation(form, {
      username: function (v) { return /^[\p{L}\p{N} ._-]{3,30}$/u.test(clean(v)) ? '' : 'Use de 3 a 30 caracteres (letras, números, espaço, . _ -).'; },
      email: function (v) { return isEmail(v) ? '' : 'Informe um e-mail válido.'; },
      password: function (v) { return v.length >= 6 ? '' : 'A senha precisa ter pelo menos 6 caracteres.'; },
      'confirm-password': function (v, f) { return v && v === f.elements.password.value ? '' : 'As senhas não conferem.'; }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.textContent = '';
      var ok = validate();
      var terms = form.elements.terms;
      $('#termsError').textContent = terms.checked ? '' : 'Você precisa aceitar para continuar.';
      if (!ok || !terms.checked) return;
      var email = clean(form.elements.email.value).toLowerCase();
      var users = read(KEY.users, []);
      if (!Array.isArray(users)) users = [];
      if (users.some(function (x) { return x.email === email; })) {
        setError(form.elements.email, 'Já existe uma conta com este e-mail.');
        form.elements.email.focus();
        return;
      }
      var name = clean(form.elements.username.value);
      hash(form.elements.password.value).then(function (h) {
        users.push({ name: name, email: email, hash: h, created: Date.now() });
        if (!write(KEY.users, users)) { msg.textContent = 'Não foi possível salvar a conta neste navegador.'; return; }
        write(KEY.session, { name: name, email: email });
        toast('Conta criada! Bem-vindo, ' + name + '.');
        setTimeout(function () { location.href = 'index.html'; }, 900);
      });
    });
  }

  /* =========================================================
     Animação de entrada (substitui o antigo efeito de scroll)
     ========================================================= */
  function initReveal() {
    var items = $$('.feature, .post-card, .tutorial-item, .discussion-item');
    if (!('IntersectionObserver' in window)) return;
    items.forEach(function (n) { n.classList.add('reveal'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); } });
    }, { threshold: 0.1 });
    items.forEach(function (n) { io.observe(n); });
  }

  /* =========================================================
     Início
     ========================================================= */
  function start() {
    migrateLegacyPost();
    initHeader();
    var page = document.body.dataset.page;
    var pages = { home: pageHome, blog: pageBlog, post: pagePost, write: pageWrite, tutorials: pageTutorials, forum: pageForum, login: pageLogin, register: pageRegister };
    if (pages[page]) pages[page]();
    initReveal();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
