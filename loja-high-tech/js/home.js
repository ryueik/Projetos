/* TechBlack · página inicial */
(function () {
  "use strict";
  var TB = window.TB, el = TB.el;
  var all = TB.produtos();

  // Estatística e preço do card flutuante
  var stat = document.getElementById("stat-produtos");
  if (stat) stat.textContent = String(all.length);
  var phone = TB.produto("kairo-x12-ultra");
  var hp = document.getElementById("hero-phone-price");
  if (phone && hp) hp.textContent = TB.money(phone.preco);

  // Categorias (imagem = produto destaque de cada categoria)
  var cats = TB.categorias();
  var catGrid = document.getElementById("cat-grid");
  Object.keys(cats).forEach(function (k) {
    var list = all.filter(function (p) { return p.categoria === k; });
    if (!list.length) return;
    var cover = list.filter(function (p) { return p.destaque; })[0] || list[0];
    catGrid.appendChild(el("a", { class: "cat-card reveal", href: "produtos.html?cat=" + k }, [
      el("img", { src: cover.imagem, alt: "", loading: "lazy" }),
      el("div", null, [
        el("span", null, [el("h3", { text: cats[k] }), el("small", { text: list.length + (list.length === 1 ? " produto" : " produtos") })]),
        el("span", { class: "go", html: TB.I.arrow }),
      ]),
    ]));
  });

  // Destaques
  var dest = document.getElementById("destaques");
  all.filter(function (p) { return p.destaque; })
    .sort(function (a, b) { return b.avaliacao - a.avaliacao || b.avaliacoes - a.avaliacoes; })
    .slice(0, 8)
    .forEach(function (p) { dest.appendChild(TB.productCard(p)); });

  // Ofertas: maiores descontos
  var og = document.getElementById("ofertas-grid");
  all.filter(function (p) { return p.precoAntigo && p.estoque > 0; })
    .sort(function (a, b) { return TB.desconto(b) - TB.desconto(a); })
    .slice(0, 4)
    .forEach(function (p) { og.appendChild(TB.productCard(p)); });

  // Contagem regressiva até a meia-noite
  var cd = document.getElementById("countdown");
  function tick() {
    var now = new Date();
    var end = new Date(now); end.setHours(24, 0, 0, 0);
    var s = Math.max(0, Math.floor((end - now) / 1000));
    var parts = { h: Math.floor(s / 3600), m: Math.floor(s / 60) % 60, s: s % 60 };
    Object.keys(parts).forEach(function (u) {
      var n = cd.querySelector('[data-u="' + u + '"]');
      if (n) n.textContent = String(parts[u]).padStart(2, "0");
    });
  }
  if (cd) { tick(); setInterval(tick, 1000); }

  // Newsletter (simulada)
  var form = document.getElementById("news-form");
  var msg = document.getElementById("news-msg");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var input = document.getElementById("news-email");
    var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
    msg.className = "msg " + (ok ? "ok" : "bad");
    msg.textContent = ok ? "Pronto! Inscrição simulada com sucesso. Use o cupom TECH10 na sua primeira compra." : "Digite um e-mail válido.";
    input.setAttribute("aria-invalid", ok ? "false" : "true");
    if (ok) form.reset();
  });
})();
