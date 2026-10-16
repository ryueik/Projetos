/* Brechó da Família Guimarães · núcleo compartilhado
   Cabeçalho, rodapé, tema, sacola (localStorage), modal de produto e WhatsApp. */
(function () {
  "use strict";

  var WHATS = "5512974117747";
  var BAG_KEY = "brecho-sacola";
  var THEME_KEY = "brecho-tema";
  var PRODUTOS = Array.isArray(window.PRODUTOS) ? window.PRODUTOS : [];
  var page = document.body.getAttribute("data-page") || "";

  var ICON = {
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true" width="18" height="18" style="flex:none;margin-top:2px"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>'
  };

  /* ---------- utilidades ---------- */
  var BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  function fmt(v) { return BRL.format(v); }
  function byId(id) { for (var i = 0; i < PRODUTOS.length; i++) if (PRODUTOS[i].id === id) return PRODUTOS[i]; return null; }
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (attrs[k] == null || attrs[k] === false) continue;
      if (k === "class") n.className = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k]; // somente ícones/markup fixo do próprio site
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    }
    (children || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function desconto(p) { return p.precoOriginal > p.preco ? Math.round((1 - p.preco / p.precoOriginal) * 100) : 0; }
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key) || "null");
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }

  /* ---------- tema ---------- */
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    store(THEME_KEY, t);
    var b = document.getElementById("themeBtn");
    if (b) {
      b.innerHTML = t === "dark" ? ICON.sun : ICON.moon;
      b.setAttribute("aria-label", t === "dark" ? "Ativar tema claro" : "Ativar tema escuro");
    }
  }

  /* ---------- cabeçalho e rodapé ---------- */
  var NAV = [
    ["index.html", "Início", "home"],
    ["produtos.html", "Peças", "produtos"],
    ["index.html#historia", "Nossa história", ""],
    ["index.html#como-funciona", "Como funciona", ""],
    ["index.html#contato", "Contato", ""]
  ];

  function buildHeader() {
    var host = document.getElementById("site-header");
    if (!host) return;
    var links = NAV.map(function (n) {
      return '<a href="' + n[0] + '"' + (n[2] && n[2] === page ? ' aria-current="page"' : "") + ">" + n[1] + "</a>";
    }).join("");
    host.className = "site-header";
    host.innerHTML =
      '<div class="wrap header-in">' +
        '<a class="logo" href="index.html" aria-label="Brechó da Família Guimarães, página inicial">' +
          '<span class="logo-mark" aria-hidden="true">G</span>' +
          '<span class="logo-text"><b>Família Guimarães</b><small>Brechó · Vintage &amp; Afeto</small></span>' +
        "</a>" +
        '<nav class="nav" aria-label="Principal">' + links + "</nav>" +
        '<div class="header-actions">' +
          '<button class="icon-btn" id="themeBtn" type="button"></button>' +
          '<button class="icon-btn bag-btn" id="bagBtn" type="button" aria-label="Abrir sacola">' + ICON.bag +
            '<span class="bag-count" id="bagCount" hidden>0</span></button>' +
          '<button class="icon-btn menu-btn" id="menuBtn" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="mobileNav">' + ICON.menu + "</button>" +
        "</div>" +
      "</div>" +
      '<nav class="mobile-nav" id="mobileNav" aria-label="Menu móvel">' + links + "</nav>";

    var menuBtn = document.getElementById("menuBtn");
    var mnav = document.getElementById("mobileNav");
    menuBtn.addEventListener("click", function () {
      var open = mnav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      menuBtn.innerHTML = open ? ICON.close : ICON.menu;
    });
    mnav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { mnav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); menuBtn.innerHTML = ICON.menu; }
    });
    document.getElementById("themeBtn").addEventListener("click", function () {
      setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
    document.getElementById("bagBtn").addEventListener("click", openBag);
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
  }

  function buildFooter() {
    var host = document.getElementById("site-footer");
    if (!host) return;
    host.className = "site-footer";
    host.innerHTML =
      '<div class="wrap">' +
        '<div class="footer-grid">' +
          '<div class="footer-brand">' +
            '<a class="logo" href="index.html"><span class="logo-mark" aria-hidden="true">G</span><span class="logo-text"><b>Família Guimarães</b><small>Brechó · Vintage &amp; Afeto</small></span></a>' +
            "<p>Peças únicas, garimpadas e cuidadas por três gerações da mesma família desde 1985. Moda circular com memória e carinho.</p>" +
          "</div>" +
          "<div><h4>Navegue</h4><ul>" +
            '<li><a href="produtos.html">Todas as peças</a></li>' +
            '<li><a href="produtos.html?categoria=Vestidos">Vestidos</a></li>' +
            '<li><a href="produtos.html?categoria=Casa%20%26%20Lou%C3%A7as">Casa &amp; Louças</a></li>' +
            '<li><a href="index.html#historia">Nossa história</a></li>' +
          "</ul></div>" +
          "<div><h4>Atendimento</h4><ul>" +
            '<li><a href="https://wa.me/' + WHATS + '" target="_blank" rel="noopener">WhatsApp (12) 97411-7747</a></li>' +
            "<li>Reservas por 48 horas</li>" +
            "<li>Retirada combinada ou envio para todo o Brasil</li>" +
          "</ul></div>" +
        "</div>" +
        '<div class="footer-bottom"><span>© ' + new Date().getFullYear() + " Brechó da Família Guimarães · Projeto demonstrativo</span><span>Feito com afeto e muito garimpo ✿</span></div>" +
      "</div>";
  }

  /* ---------- toast ---------- */
  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) { toastEl = el("div", { class: "toast", role: "status", "aria-live": "polite" }); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2400);
  }

  /* ---------- sacola ---------- */
  function getBag() {
    var ids = store(BAG_KEY);
    if (!Array.isArray(ids)) return [];
    return ids.filter(function (id, i) { var p = byId(id); return p && !p.vendido && ids.indexOf(id) === i; });
  }
  function setBag(ids) { store(BAG_KEY, ids); refreshBag(); }
  function inBag(id) { return getBag().indexOf(id) !== -1; }
  function addToBag(id) {
    var p = byId(id);
    if (!p || p.vendido) return;
    var ids = getBag();
    if (ids.indexOf(id) === -1) { ids.push(id); setBag(ids); toast("“" + p.nome + "” foi para a sacola"); }
    else toast("Essa peça já está na sua sacola");
    var c = document.getElementById("bagCount");
    if (c) { c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump"); }
  }
  function removeFromBag(id) { setBag(getBag().filter(function (x) { return x !== id; })); }

  var overlay, drawer, modal, lastFocus;

  function buildOverlays() {
    overlay = el("div", { class: "overlay", id: "overlay" });
    overlay.addEventListener("click", closeAll);

    drawer = el("aside", { class: "drawer", id: "bagDrawer", role: "dialog", "aria-modal": "true", "aria-labelledby": "bagTitle" });
    drawer.innerHTML =
      '<div class="drawer-head"><h2 id="bagTitle">Sua sacola</h2><button class="icon-btn" type="button" data-close aria-label="Fechar sacola">' + ICON.close + "</button></div>" +
      '<div class="drawer-body" id="bagBody"></div>' +
      '<div class="drawer-foot" id="bagFoot">' +
        '<div class="total-row"><span>Total</span><b id="bagTotal">R$ 0,00</b></div>' +
        '<div class="saving" id="bagSaving"></div>' +
        '<label>Seu nome (opcional)<input class="field" id="bagName" type="text" maxlength="60" autocomplete="name" placeholder="Como podemos te chamar?"></label>' +
        '<div class="seg" role="radiogroup" aria-label="Como prefere receber">' +
          '<label><input type="radio" name="entrega" value="Retirar no brechó" checked><span>Retirar no brechó</span></label>' +
          '<label><input type="radio" name="entrega" value="Receber em casa (frete a combinar)"><span>Receber em casa</span></label>' +
        "</div>" +
        '<button class="btn btn-wa" id="waBtn" type="button">' + ICON.wa + "Finalizar pelo WhatsApp</button>" +
        '<p class="fine">Nada é cobrado aqui: enviamos sua lista para a família pelo WhatsApp e a reserva fica garantida por 48 h.</p>' +
      "</div>";
    drawer.querySelector("[data-close]").addEventListener("click", closeAll);
    drawer.querySelector("#waBtn").addEventListener("click", function () {
      var url = whatsappUrl();
      if (url) window.open(url, "_blank", "noopener");
    });

    modal = el("div", { class: "modal", id: "productModal", role: "dialog", "aria-modal": "true", "aria-labelledby": "pdTitle" });
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    document.body.appendChild(modal);

    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });
  }

  function refreshBag() {
    var ids = getBag();
    var count = document.getElementById("bagCount");
    if (count) { count.textContent = String(ids.length); count.hidden = ids.length === 0; }
    var bagBtn = document.getElementById("bagBtn");
    if (bagBtn) bagBtn.setAttribute("aria-label", "Abrir sacola (" + ids.length + (ids.length === 1 ? " peça)" : " peças)"));

    document.querySelectorAll("[data-add]").forEach(function (b) {
      var on = ids.indexOf(b.getAttribute("data-add")) !== -1;
      b.classList.toggle("in", on);
      if (b.classList.contains("card-add")) {
        b.innerHTML = on ? ICON.check : ICON.plus;
        b.setAttribute("aria-label", (on ? "Na sacola: " : "Adicionar à sacola: ") + b.getAttribute("data-name"));
      }
    });
    var pdAdd = document.getElementById("pdAdd");
    if (pdAdd) {
      var on = ids.indexOf(pdAdd.getAttribute("data-id")) !== -1;
      pdAdd.textContent = on ? "Remover da sacola" : "Adicionar à sacola";
    }

    if (!drawer) return;
    var body = drawer.querySelector("#bagBody");
    body.textContent = "";
    var foot = drawer.querySelector("#bagFoot");
    if (!ids.length) {
      body.appendChild(el("div", { class: "bag-empty" }, [
        el("span", { class: "serif", text: "Sua sacola está vazia" }),
        el("p", { text: "Cada peça é única: quando gostar de uma, garanta antes que outra pessoa leve." }),
        el("a", { class: "btn", href: "produtos.html", text: "Ver as peças" })
      ]));
      foot.hidden = true;
      return;
    }
    foot.hidden = false;
    var total = 0, orig = 0;
    ids.forEach(function (id) {
      var p = byId(id);
      total += p.preco; orig += p.precoOriginal || p.preco;
      body.appendChild(el("div", { class: "bag-item" }, [
        el("img", { src: p.imagem, alt: "", width: 76, height: 95, loading: "lazy" }),
        el("div", null, [
          el("small", { text: p.id + " · " + p.categoria }),
          el("h3", { class: "serif", text: p.nome }),
          el("small", { text: "Tam. " + p.tamanho + " · " + p.estado + " · " + p.decada }),
          el("span", { class: "price", text: fmt(p.preco) })
        ]),
        el("button", { class: "bag-remove", type: "button", text: "Remover", "aria-label": "Remover " + p.nome, onclick: function () { removeFromBag(id); } })
      ]));
    });
    drawer.querySelector("#bagTotal").textContent = fmt(total);
    drawer.querySelector("#bagSaving").textContent = orig > total ? "Você economiza " + fmt(orig - total) + " em relação ao preço de loja." : "";
  }

  function orderCode() {
    var d = new Date();
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    return "BG" + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function whatsappUrl() {
    var ids = getBag();
    if (!ids.length) return "";
    var total = 0;
    var lines = ids.map(function (id) {
      var p = byId(id); total += p.preco;
      return "• [" + p.id + "] " + p.nome + " (tam. " + p.tamanho + ") · " + fmt(p.preco);
    });
    var nameInput = drawer && drawer.querySelector("#bagName");
    var name = nameInput ? nameInput.value.trim().slice(0, 60) : "";
    var entrega = drawer && drawer.querySelector('input[name="entrega"]:checked');
    var msg = [
      "Olá, Família Guimarães! 🌼",
      "Quero reservar estas peças que vi no site:",
      "",
      lines.join("\n"),
      "",
      "Total: " + fmt(total) + " (" + ids.length + (ids.length === 1 ? " peça)" : " peças)"),
      "Entrega: " + (entrega ? entrega.value : "Retirar no brechó"),
      name ? "Nome: " + name : null,
      "Código da reserva: " + orderCode(),
      "",
      "Podem confirmar a disponibilidade? Obrigado(a)!"
    ].filter(function (l) { return l !== null; }).join("\n");
    return "https://wa.me/" + WHATS + "?text=" + encodeURIComponent(msg);
  }

  function lock(on) { document.body.classList.toggle("lock", on); }
  function openBag() {
    closeModal();
    lastFocus = document.activeElement;
    refreshBag();
    drawer.classList.add("show"); overlay.classList.add("show"); lock(true);
    setTimeout(function () { var c = drawer.querySelector("[data-close]"); if (c) c.focus(); }, 50);
  }
  function closeBag() { if (drawer) drawer.classList.remove("show"); }
  function closeModal() {
    if (!modal || !modal.classList.contains("show")) return;
    modal.classList.remove("show");
    if (page === "produtos" && /[?&]id=/.test(location.search)) {
      var u = new URL(location.href); u.searchParams.delete("id");
      history.replaceState(null, "", u.pathname + u.search + u.hash);
    }
  }
  function closeAll() {
    closeBag(); closeModal();
    if (overlay) overlay.classList.remove("show");
    lock(false);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }

  /* ---------- modal de produto ---------- */
  function spec(label, value, full) {
    return el("div", { class: full ? "full" : null }, [el("dt", { text: label }), el("dd", { text: value })]);
  }
  function openProduct(id) {
    var p = byId(id);
    if (!p) return;
    closeBag();
    lastFocus = document.activeElement;
    modal.textContent = "";

    var mainImg = el("img", { src: p.imagem, alt: p.nome, width: 600, height: 750 });
    var views = [
      { label: "Frente", style: "" },
      { label: "Detalhe do tecido", style: "transform:scale(1.9);transform-origin:50% 55%" },
      { label: "Acabamento", style: "transform:scale(1.5);transform-origin:50% 25%" }
    ];
    var thumbs = el("div", { class: "pd-thumbs" });
    views.forEach(function (v, i) {
      var t = el("button", { class: "pd-thumb", type: "button", "aria-label": "Ver " + v.label.toLowerCase(), "aria-current": i === 0 ? "true" : "false" }, [
        el("img", { src: p.imagem, alt: "", style: v.style || null, loading: "lazy" })
      ]);
      t.addEventListener("click", function () {
        mainImg.setAttribute("style", v.style);
        thumbs.querySelectorAll(".pd-thumb").forEach(function (x) { x.setAttribute("aria-current", "false"); });
        t.setAttribute("aria-current", "true");
      });
      thumbs.appendChild(t);
    });

    var main = el("div", { class: "pd-main" }, [mainImg]);
    if (p.vendido) main.appendChild(el("div", { class: "sold-stamp" }, [el("span", { text: "Vendido" })]));

    var priceRow = el("div", { class: "pd-price" }, [el("span", { class: "price", text: fmt(p.preco) })]);
    if (p.precoOriginal > p.preco) {
      priceRow.appendChild(el("span", { class: "price-old", text: fmt(p.precoOriginal) }));
      priceRow.appendChild(el("span", { class: "badge badge-sale", text: "−" + desconto(p) + "%" }));
    }

    var actions = el("div", { class: "pd-actions" });
    if (p.vendido) {
      actions.appendChild(el("a", { class: "btn btn-ghost", href: "produtos.html", text: "Ver peças parecidas" }));
    } else {
      var add = el("button", { class: "btn", id: "pdAdd", type: "button", "data-id": p.id, text: inBag(p.id) ? "Remover da sacola" : "Adicionar à sacola" });
      add.addEventListener("click", function () { if (inBag(p.id)) { removeFromBag(p.id); toast("Peça removida da sacola"); } else addToBag(p.id); });
      actions.appendChild(add);
      var buyNow = el("button", { class: "btn btn-ghost", type: "button", html: ICON.wa + "Reservar agora" });
      buyNow.addEventListener("click", function () { if (!inBag(p.id)) addToBag(p.id); openBag(); });
      actions.appendChild(buyNow);
    }

    var info = el("div", { class: "pd-info" }, [
      el("span", { class: "pd-code", text: p.id + " · " + p.categoria + " · " + p.decada }),
      el("h2", { id: "pdTitle", text: p.nome }),
      priceRow,
      el("p", { class: "pd-desc", text: p.descricao }),
      el("dl", { class: "specs" }, [
        spec("Tamanho", p.tamanho), spec("Estado", p.estado),
        spec("Década", p.decada), spec("Disponibilidade", p.vendido ? "Vendida" : "Peça única"),
        spec("Medidas", p.medidas, true)
      ]),
      actions,
      el("p", { class: "pd-note", html: ICON.info + "<span>Peça higienizada, revisada e fotografada pela família. Dúvidas sobre caimento? Pergunte pelo WhatsApp antes de reservar.</span>" })
    ]);

    var close = el("button", { class: "icon-btn modal-close", type: "button", "aria-label": "Fechar", html: ICON.close });
    close.addEventListener("click", closeAll);
    modal.appendChild(close);
    modal.appendChild(el("div", { class: "pd" }, [el("div", { class: "pd-gallery" }, [main, thumbs]), info]));

    modal.classList.add("show"); overlay.classList.add("show"); lock(true);
    modal.scrollTop = 0;
    if (page === "produtos") {
      var u = new URL(location.href); u.searchParams.set("id", p.id);
      history.replaceState(null, "", u.pathname + u.search + u.hash);
    }
    setTimeout(function () { close.focus(); }, 50);
  }

  /* ---------- card de produto ---------- */
  function card(p) {
    var c = el("article", { class: "card reveal" + (p.vendido ? " sold" : "") });
    var img = el("img", { src: p.imagem, alt: p.nome, width: 600, height: 750, loading: "lazy" });
    var media = el("button", { class: "card-media", type: "button", "aria-label": "Ver detalhes: " + p.nome }, [img]);
    media.addEventListener("click", function () { openProduct(p.id); });
    var badges = el("div", { class: "badges" });
    if (p.vendido) badges.appendChild(el("span", { class: "badge badge-sold", text: "Vendido" }));
    else if (desconto(p) >= 50) badges.appendChild(el("span", { class: "badge badge-sale", text: "−" + desconto(p) + "%" }));
    badges.appendChild(el("span", { class: "badge", text: p.decada }));

    var wrap = el("div", { class: "card-media-wrap" }, [media, badges]);
    if (p.vendido) wrap.appendChild(el("div", { class: "sold-stamp" }, [el("span", { text: "Vendido" })]));
    else {
      var add = el("button", { class: "card-add", type: "button", "data-add": p.id, "data-name": p.nome, html: ICON.plus, "aria-label": "Adicionar à sacola: " + p.nome });
      add.addEventListener("click", function () {
        if (inBag(p.id)) { removeFromBag(p.id); toast("Peça removida da sacola"); } else addToBag(p.id);
      });
      wrap.appendChild(add);
    }

    var titleBtn = el("button", { type: "button", text: p.nome });
    titleBtn.addEventListener("click", function () { openProduct(p.id); });
    var price = el("div", { class: "price-row" }, [el("span", { class: "price", text: fmt(p.preco) })]);
    if (p.precoOriginal > p.preco) price.appendChild(el("span", { class: "price-old", text: fmt(p.precoOriginal) }));

    c.appendChild(wrap);
    c.appendChild(el("div", { class: "card-body" }, [
      el("div", { class: "card-meta" }, [el("span", { text: p.categoria }), el("span", { text: "Tam. " + p.tamanho })]),
      el("h3", { class: "card-title" }, [titleBtn]),
      el("div", { class: "card-meta" }, [el("span", { text: "Estado: " + p.estado })]),
      price
    ]));
    return c;
  }

  /* ---------- revelação ao rolar ---------- */
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -40px 0px" }) : null;
  function reveal(root) {
    (root || document).querySelectorAll(".reveal:not(.in)").forEach(function (n) { if (io) io.observe(n); else n.classList.add("in"); });
  }

  /* ---------- inicialização ---------- */
  buildHeader();
  buildFooter();
  buildOverlays();
  refreshBag();
  window.addEventListener("storage", function (e) { if (e.key === BAG_KEY) refreshBag(); });

  window.Brecho = {
    produtos: PRODUTOS, byId: byId, fmt: fmt, el: el, card: card, desconto: desconto,
    openProduct: openProduct, openBag: openBag, addToBag: addToBag, getBag: getBag,
    refreshBag: refreshBag, reveal: reveal, whatsappUrl: whatsappUrl, toast: toast, icon: ICON, whats: WHATS
  };
  reveal();
})();
