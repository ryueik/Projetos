/* TechBlack · núcleo compartilhado (catálogo, carrinho, pedidos, cabeçalho, rodapé, UI).
 * Tudo roda no navegador e é salvo em localStorage: é uma loja DEMONSTRATIVA. */
(function () {
  "use strict";

  var KEYS = {
    theme: "techblack-theme",
    cart: "techblack-cart",
    overrides: "techblack-produtos-admin",
    orders: "techblack-pedidos",
    checkout: "techblack-checkout",
  };
  var WHATSAPP = "5512974117747";
  var FRETE_GRATIS = 1500;
  var CUPONS = { TECH10: { pct: 10, label: "TECH10 · 10% off" } };

  /* ----------------------------------------------------------- utilidades -- */
  function read(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  var brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  function money(n) { return brl.format(Math.round(n * 100) / 100); }
  function round2(n) { return Math.round(n * 100) / 100; }

  /** Cria elemento com props e filhos (strings viram texto, nunca HTML). */
  function el(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v == null || v === false) return;
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k === "html") node.innerHTML = v; // somente marcação ESTÁTICA (ícones)
        else if (k.slice(0, 2) === "on") node.addEventListener(k.slice(2), v);
        else if (k === "dataset") Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
        else node.setAttribute(k, v === true ? "" : v);
      });
    }
    [].concat(children || []).forEach(function (c) {
      if (c == null || c === false) return;
      node.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    });
    return node;
  }

  /* ------------------------------------------------------------------ ícones -- */
  var I = {
    bolt: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 7H6"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    moon: '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    sun: '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 4h14v12H1zM15 9h4l4 4v3h-8"/><circle cx="6" cy="18.5" r="2"/><circle cx="18" cy="18.5" r="2"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>',
    pix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 4.5 4.5L12 11 7.5 6.5zM12 13l4.5 4.5L12 22l-4.5-4.5zM2 12l4.5-4.5L11 12l-4.5 4.5zM13 12l4.5-4.5L22 12l-4.5 4.5z"/></svg>',
    barcode: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 5v14M6 5v14M10 5v14M13 5v14M17 5v14M21 5v14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 1.9 17.7L.5 23.5l5.9-1.5A11.8 11.8 0 0 0 20.5 3.5zM12 21.4a9.6 9.6 0 0 1-4.9-1.3l-.4-.2-3.5.9.9-3.4-.2-.4A9.6 9.6 0 1 1 12 21.4zm5.3-7.2c-.3-.1-1.7-.9-2-1s-.5-.1-.7.2-.8 1-.9 1.1-.3.2-.6.1a7.9 7.9 0 0 1-3.9-3.4c-.3-.5.3-.5.8-1.6a.5.5 0 0 0 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1.1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.4 13.4 0 0 0 5.2 4.6c1.9.8 2.7.9 3.6.7a3.1 3.1 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3z"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 5h18M6 12h12M10 19h4"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 15v2M12 10v7M17 6v11"/></svg>',
  };
  function icon(name, cls) { return el("span", { class: "ic-wrap" + (cls ? " " + cls : ""), html: I[name], style: "display:contents" }); }

  /* ----------------------------------------------------------------- tema -- */
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(KEYS.theme, t); } catch (e) {}
  }

  /* -------------------------------------------------------------- catálogo -- */
  function overrides() { return read(KEYS.overrides, {}); }
  function produtos() {
    var ov = overrides();
    return (window.PRODUTOS || []).map(function (p) {
      var o = ov[p.id] || {};
      var c = Object.assign({}, p);
      if (typeof o.preco === "number") c.preco = o.preco;
      if (typeof o.estoque === "number") c.estoque = o.estoque;
      if (typeof o.destaque === "boolean") c.destaque = o.destaque;
      if (c.precoAntigo && c.precoAntigo <= c.preco) delete c.precoAntigo;
      return c;
    });
  }
  function produto(id) { return produtos().filter(function (p) { return p.id === id; })[0] || null; }
  function setOverride(id, patch) {
    var ov = overrides();
    ov[id] = Object.assign({}, ov[id] || {}, patch);
    write(KEYS.overrides, ov);
  }
  function categorias() { return window.CATEGORIAS || {}; }
  function desconto(p) { return p.precoAntigo ? Math.round((1 - p.preco / p.precoAntigo) * 100) : 0; }
  function parcela(p) { return p.preco / p.parcelas; }

  /* -------------------------------------------------------------- carrinho -- */
  function cart() {
    var c = read(KEYS.cart, []);
    return Array.isArray(c) ? c.filter(function (i) { return i && produto(i.id) && i.qty > 0; }) : [];
  }
  function saveCart(c) {
    write(KEYS.cart, c);
    updateBadge(true);
    document.dispatchEvent(new CustomEvent("cart:change"));
  }
  function cartAdd(id, qty) {
    var p = produto(id);
    if (!p || p.estoque <= 0) return false;
    var c = cart();
    var item = c.filter(function (i) { return i.id === id; })[0];
    var want = (item ? item.qty : 0) + (qty || 1);
    if (want > p.estoque) want = p.estoque;
    if (item) item.qty = want; else c.push({ id: id, qty: want });
    saveCart(c);
    return true;
  }
  function cartSet(id, qty) {
    var p = produto(id);
    var c = cart();
    c.forEach(function (i) { if (i.id === id) i.qty = Math.max(1, Math.min(qty, p ? p.estoque : qty)); });
    saveCart(c);
  }
  function cartRemove(id) { saveCart(cart().filter(function (i) { return i.id !== id; })); }
  function cartCount() { return cart().reduce(function (s, i) { return s + i.qty; }, 0); }
  function cartLines() {
    return cart().map(function (i) { var p = produto(i.id); return { p: p, qty: i.qty, total: p.preco * i.qty }; });
  }

  /* ---------------------------------------------------------- frete/cupom -- */
  function checkoutState() { return read(KEYS.checkout, {}); }
  function setCheckoutState(patch) { write(KEYS.checkout, Object.assign(checkoutState(), patch)); }
  function freteOpcoes(cep, subtotal) {
    var d = String(cep || "").replace(/\D/g, "");
    if (d.length !== 8) return null;
    var r = +d[0];
    var base = r <= 1 ? 19.9 : r <= 3 ? 24.9 : r <= 6 ? 32.9 : 39.9;
    var dias = r <= 1 ? [2, 4] : r <= 3 ? [3, 5] : r <= 6 ? [5, 8] : [6, 10];
    var gratis = subtotal >= FRETE_GRATIS;
    return [
      { id: "padrao", nome: "Entrega padrão", prazo: dias[0] + " a " + dias[1] + " dias úteis", valor: gratis ? 0 : base },
      { id: "expressa", nome: "Entrega expressa", prazo: Math.max(1, dias[0] - 1) + " a " + Math.max(2, dias[0]) + " dias úteis", valor: round2(base * 1.9 + 9) },
    ];
  }
  /** Totais do carrinho com cupom/frete salvos. pagamento "pix" aplica 5% off. */
  function totals(pagamento) {
    var lines = cartLines();
    var subtotal = lines.reduce(function (s, l) { return s + l.total; }, 0);
    var st = checkoutState();
    var cupom = st.cupom && CUPONS[st.cupom] ? st.cupom : null;
    var desc = cupom ? round2(subtotal * CUPONS[cupom].pct / 100) : 0;
    var opts = freteOpcoes(st.cep, subtotal - desc);
    var frete = null;
    if (opts) {
      var o = opts.filter(function (x) { return x.id === st.frete; })[0] || opts[0];
      frete = o;
    }
    var base = subtotal - desc + (frete ? frete.valor : 0);
    var pix = pagamento === "pix" ? round2((subtotal - desc) * 0.05) : 0;
    return {
      lines: lines, subtotal: subtotal, cupom: cupom, desconto: desc, frete: frete, opcoesFrete: opts,
      descontoPix: pix, total: round2(base - pix), faltaFreteGratis: Math.max(0, FRETE_GRATIS - (subtotal - desc)),
    };
  }

  /* --------------------------------------------------------------- pedidos -- */
  function pedidos() { var o = read(KEYS.orders, []); return Array.isArray(o) ? o : []; }
  function savePedidos(list) { write(KEYS.orders, list); }
  function novoNumero() {
    var n = "TB-" + new Date().getFullYear().toString().slice(2) + "-";
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (var i = 0; i < 6; i++) n += chars[Math.floor(Math.random() * chars.length)];
    return n;
  }
  function waLink(text) { return "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(text); }

  /* ---------------------------------------------------------------- toast -- */
  function toast(msg, opts) {
    opts = opts || {};
    var wrap = document.querySelector(".toast-wrap");
    if (!wrap) { wrap = el("div", { class: "toast-wrap", role: "status", "aria-live": "polite" }); document.body.appendChild(wrap); }
    var t = el("div", { class: "toast" }, [
      opts.img ? el("img", { src: opts.img, alt: "" }) : null,
      el("span", { style: "flex:1" }, msg),
      opts.link ? el("a", { href: opts.link.href }, opts.link.text) : null,
    ]);
    wrap.appendChild(t);
    setTimeout(function () { t.classList.add("out"); setTimeout(function () { t.remove(); }, 320); }, opts.ms || 3200);
  }

  /* ------------------------------------------------------------ cabeçalho -- */
  var NAV = [
    ["index.html", "Início", "home"],
    ["produtos.html", "Produtos", "produtos"],
    ["produtos.html?ofertas=1", "Ofertas", "ofertas"],
    ["carrinho.html", "Carrinho", "carrinho"],
    ["painel.html", "Painel", "painel"],
  ];
  function renderHeader() {
    var page = document.body.getAttribute("data-page") || "";
    var top = el("div", { class: "topbar" }, ["Frete grátis acima de " + money(FRETE_GRATIS) + " · Cupom ", el("strong", { text: "TECH10" }), " = 10% off ", el("span", { text: "· Loja demonstrativa" })]);
    var navLinks = NAV.map(function (n) {
      var cur = n[2] === page || (n[2] === "produtos" && page === "produto");
      if (n[2] === "ofertas") cur = page === "produtos" && /ofertas=1/.test(location.search);
      if (n[2] === "produtos" && /ofertas=1/.test(location.search)) cur = false;
      return el("a", { href: n[0], "aria-current": cur ? "page" : null }, n[1]);
    });
    var themeBtn = el("button", { class: "icon-btn theme-toggle", type: "button", "aria-label": "Alternar tema claro/escuro", html: I.moon + I.sun });
    themeBtn.addEventListener("click", function () {
      setTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light");
    });
    var badge = el("span", { class: "cart-badge", "data-count": "0", "aria-hidden": "true" }, "0");
    var cartBtn = el("a", { class: "icon-btn", href: "carrinho.html", "aria-label": "Carrinho", id: "cart-link", html: I.cart });
    cartBtn.appendChild(badge);
    var menuBtn = el("button", { class: "icon-btn menu-toggle", type: "button", "aria-label": "Abrir menu", "aria-expanded": "false", "aria-controls": "mobile-nav", html: I.menu });
    var mobile = el("nav", { class: "mobile-nav", id: "mobile-nav", "aria-label": "Menu" }, NAV.map(function (n, i) {
      var a = navLinks[i].cloneNode(true);
      a.appendChild(el("span", { html: I.arrow, style: "width:18px;height:18px;display:inline-grid", "aria-hidden": "true" }));
      return a;
    }));
    menuBtn.addEventListener("click", function () {
      var open = mobile.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.innerHTML = open ? I.close : I.menu;
      menuBtn.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && mobile.classList.contains("open")) menuBtn.click(); });

    var header = el("header", { class: "site-header" }, el("div", { class: "container" }, [
      el("a", { class: "brand", href: "index.html", "aria-label": "TechBlack, página inicial" }, [
        el("span", { class: "brand-mark", html: I.bolt }), el("span", null, ["Tech", el("b", { text: "Black" })]),
      ]),
      el("nav", { class: "main-nav", "aria-label": "Principal" }, navLinks),
      el("div", { class: "header-actions" }, [
        el("a", { class: "icon-btn hide-xs", href: "produtos.html#busca", "aria-label": "Buscar produtos", html: I.search }),
        themeBtn, cartBtn, menuBtn,
      ]),
    ]));
    var slot = document.getElementById("tb-header");
    if (slot) { slot.replaceWith(top, header, mobile); }
    updateBadge(false);
  }
  function updateBadge(bump) {
    var b = document.querySelector(".cart-badge");
    if (!b) return;
    var n = cartCount();
    b.textContent = n > 99 ? "99+" : String(n);
    b.setAttribute("data-count", String(n));
    var link = document.getElementById("cart-link");
    if (link) link.setAttribute("aria-label", "Carrinho, " + n + (n === 1 ? " item" : " itens"));
    if (bump) { b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); setTimeout(function () { b.classList.remove("bump"); }, 250); }
  }

  function renderFooter() {
    var slot = document.getElementById("tb-footer");
    if (!slot) return;
    var cats = categorias();
    var f = el("footer", { class: "site-footer" }, el("div", { class: "container" }, [
      el("div", { class: "footer-grid" }, [
        el("div", null, [
          el("a", { class: "brand", href: "index.html" }, [el("span", { class: "brand-mark", html: I.bolt }), el("span", null, ["Tech", el("b", { text: "Black" })])]),
          el("p", { text: "Loja high-tech demonstrativa: catálogo, carrinho, checkout e painel administrativo funcionando 100% no navegador." }),
        ]),
        el("div", null, [el("h4", { text: "Categorias" }), el("ul", null, Object.keys(cats).slice(0, 6).map(function (k) {
          return el("li", null, el("a", { href: "produtos.html?cat=" + k }, cats[k]));
        }))]),
        el("div", null, [el("h4", { text: "Atendimento" }), el("ul", null, [
          el("li", null, el("a", { href: "carrinho.html" }, "Meu carrinho")),
          el("li", null, el("a", { href: "checkout.html" }, "Finalizar compra")),
          el("li", null, el("a", { href: "painel.html" }, "Painel administrativo")),
          el("li", null, el("a", { href: waLink("Olá! Vim pela loja TechBlack e gostaria de tirar uma dúvida."), target: "_blank", rel: "noopener" }, "WhatsApp")),
        ])]),
        el("div", null, [el("h4", { text: "Pagamento (simulado)" }), el("div", { class: "pay-icons" }, ["Pix", "Visa", "Master", "Elo", "Boleto"].map(function (x) { return el("span", { text: x }); })),
          el("p", { text: "Nenhuma cobrança real é feita. Os dados ficam apenas neste navegador." })]),
      ]),
      el("div", { class: "footer-bottom" }, [
        el("span", { text: "© " + new Date().getFullYear() + " TechBlack · Projeto demonstrativo de Matheus Macário" }),
        el("span", null, [el("a", { href: "https://dev-matheus-macario.vercel.app/", target: "_blank", rel: "noopener" }, "Portfólio"), " · ", el("a", { href: "../index.html" }, "Todos os projetos")]),
      ]),
    ]));
    slot.replaceWith(f);
  }

  /* -------------------------------------------------------- card produto -- */
  function stars(p) {
    var full = Math.round(p.avaliacao);
    return el("span", { class: "stars", "aria-label": "Avaliação " + p.avaliacao.toFixed(1).replace(".", ",") + " de 5" }, [
      el("i", { "aria-hidden": "true", text: "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full) }),
      p.avaliacao.toFixed(1).replace(".", ",") + " (" + p.avaliacoes.toLocaleString("pt-BR") + ")",
    ]);
  }
  function badges(p) {
    var b = el("div", { class: "pc-badges" });
    if (p.estoque <= 0) b.appendChild(el("span", { class: "badge badge-out", text: "Esgotado" }));
    else {
      if (desconto(p)) b.appendChild(el("span", { class: "badge badge-off", text: "-" + desconto(p) + "%" }));
      if (p.destaque) b.appendChild(el("span", { class: "badge badge-hot", text: "Destaque" }));
      if (p.estoque <= 6) b.appendChild(el("span", { class: "badge badge-low", text: "Últimas " + p.estoque }));
    }
    return b;
  }
  function addAndNotify(p, qty) {
    if (cartAdd(p.id, qty || 1)) toast(p.nome + " adicionado ao carrinho", { img: p.imagem, link: { href: "carrinho.html", text: "Ver carrinho" } });
    else toast("Produto sem estoque no momento.");
  }
  function productCard(p) {
    var url = "produto.html?id=" + encodeURIComponent(p.id);
    var out = p.estoque <= 0;
    return el("article", { class: "product-card reveal" }, [
      el("a", { class: "pc-media", href: url, "aria-label": p.nome }, [
        el("img", { src: p.imagem, alt: p.nome, loading: "lazy", width: "600", height: "450" }),
        badges(p),
      ]),
      el("button", { class: "icon-btn pc-quick", type: "button", "aria-label": "Visualização rápida de " + p.nome, html: I.eye, onclick: function () { quickView(p.id); } }),
      el("div", { class: "pc-body" }, [
        el("span", { class: "pc-cat", text: p.categoriaNome }),
        el("h3", { class: "pc-name" }, el("a", { href: url, text: p.nome })),
        stars(p),
        p.precoAntigo ? el("span", { class: "price-old", text: money(p.precoAntigo) }) : null,
        el("span", { class: "price", text: money(p.preco) }),
        el("span", { class: "price-sub" }, ["ou " + p.parcelas + "x de " + money(parcela(p)) + " sem juros"]),
        el("div", { class: "pc-foot" }, [
          el("button", { class: "btn btn-primary btn-sm", type: "button", disabled: out, html: I.cart + "<span>" + (out ? "Esgotado" : "Adicionar") + "</span>", onclick: function () { addAndNotify(produto(p.id)); } }),
        ]),
      ]),
    ]);
  }

  /* ---------------------------------------------------- visualização rápida -- */
  var lastFocus = null;
  function closeModal() {
    var m = document.getElementById("tb-modal");
    if (m) m.remove();
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  function quickView(id) {
    var p = produto(id);
    if (!p) return;
    lastFocus = document.activeElement;
    closeModal();
    var qtyInput = el("input", { type: "number", min: "1", max: String(Math.max(1, p.estoque)), value: "1", "aria-label": "Quantidade", inputmode: "numeric" });
    var out = p.estoque <= 0;
    var box = el("div", { class: "modal-box", role: "dialog", "aria-modal": "true", "aria-labelledby": "qv-title" }, [
      el("button", { class: "icon-btn modal-close", type: "button", "aria-label": "Fechar", html: I.close, onclick: closeModal }),
      el("img", { src: p.imagem, alt: p.nome }),
      el("div", { class: "modal-body" }, [
        el("span", { class: "pc-cat", text: p.categoriaNome }),
        el("h2", { id: "qv-title", text: p.nome }),
        stars(p),
        el("p", { class: "muted", text: p.descricao }),
        el("div", null, [
          p.precoAntigo ? el("div", { class: "price-old", text: money(p.precoAntigo) }) : null,
          el("div", { class: "price", style: "font-size:1.9rem", text: money(p.preco) }),
          el("div", { class: "price-sub" }, ["ou " + p.parcelas + "x de " + money(parcela(p)) + " · ", el("b", { text: money(p.preco * 0.95) + " no Pix" })]),
        ]),
        el("ul", { class: "spec-list", style: "grid-template-columns:1fr" }, p.specs.slice(0, 4).map(function (s) { return el("li", { text: s }); })),
        el("div", { class: "buy-row" }, [
          qtyStepper(qtyInput, p.estoque),
          el("button", { class: "btn btn-primary", type: "button", disabled: out, html: I.cart + "<span>" + (out ? "Esgotado" : "Adicionar ao carrinho") + "</span>",
            onclick: function () { addAndNotify(p, Math.max(1, parseInt(qtyInput.value, 10) || 1)); closeModal(); } }),
        ]),
        el("a", { class: "link-arrow", href: "produto.html?id=" + encodeURIComponent(p.id), html: "Ver detalhes completos " + I.arrow }),
      ]),
    ]);
    var modal = el("div", { class: "modal", id: "tb-modal" }, [el("div", { class: "modal-backdrop", onclick: closeModal }), box]);
    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";
    box.querySelector(".modal-close").focus();
    modal.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
      if (e.key === "Tab") { // mantém o foco dentro do modal
        var f = box.querySelectorAll("button:not([disabled]), a, input");
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  function qtyStepper(input, max, onChange) {
    function clamp() {
      var v = parseInt(input.value, 10);
      if (isNaN(v) || v < 1) v = 1;
      if (max && v > max) v = max;
      input.value = String(v);
      if (onChange) onChange(v);
    }
    input.addEventListener("change", clamp);
    return el("div", { class: "qty" }, [
      el("button", { type: "button", "aria-label": "Diminuir quantidade", text: "−", onclick: function () { input.value = String((parseInt(input.value, 10) || 1) - 1); clamp(); } }),
      input,
      el("button", { type: "button", "aria-label": "Aumentar quantidade", text: "+", onclick: function () { input.value = String((parseInt(input.value, 10) || 1) + 1); clamp(); } }),
    ]);
  }

  /* -------------------------------------------------------------- reveal -- */
  var io = null;
  function reveal(root) {
    var items = (root || document).querySelectorAll(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) { items.forEach(function (n) { n.classList.add("in"); }); return; }
    if (!io) io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -6% 0px" });
    items.forEach(function (n) { io.observe(n); });
  }

  /* --------------------------------------------------------------- export -- */
  window.TB = {
    KEYS: KEYS, CUPONS: CUPONS, FRETE_GRATIS: FRETE_GRATIS, I: I,
    read: read, write: write, money: money, round2: round2, el: el, icon: icon,
    produtos: produtos, produto: produto, setOverride: setOverride, categorias: categorias, desconto: desconto, parcela: parcela,
    cart: cart, cartAdd: cartAdd, cartSet: cartSet, cartRemove: cartRemove, cartCount: cartCount, cartLines: cartLines, saveCart: saveCart,
    checkoutState: checkoutState, setCheckoutState: setCheckoutState, freteOpcoes: freteOpcoes, totals: totals,
    pedidos: pedidos, savePedidos: savePedidos, novoNumero: novoNumero, waLink: waLink,
    toast: toast, productCard: productCard, quickView: quickView, qtyStepper: qtyStepper, stars: stars, badges: badges,
    addAndNotify: addAndNotify, reveal: reveal, updateBadge: updateBadge,
  };

  renderHeader();
  renderFooter();
  // Sincroniza entre abas
  window.addEventListener("storage", function (e) { if (e.key === KEYS.cart) { updateBadge(false); document.dispatchEvent(new CustomEvent("cart:change")); } });
  document.addEventListener("DOMContentLoaded", function () { reveal(); });
})();
