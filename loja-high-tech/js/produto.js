/* TechBlack · página de produto (produto.html?id=...) */
(function () {
  "use strict";
  var TB = window.TB, el = TB.el, I = TB.I;
  var id = new URLSearchParams(location.search).get("id");
  var p = TB.produto(id);
  var root = document.getElementById("pdp");
  var crumbs = document.getElementById("crumbs");

  if (!p) {
    root.appendChild(el("div", { class: "empty", style: "margin:30px 0 60px" }, [
      el("span", { html: I.box }),
      el("h3", { text: "Produto não encontrado" }),
      el("p", { text: "O item que você procura não existe ou foi removido do catálogo." }),
      el("a", { class: "btn btn-primary", href: "produtos.html", text: "Ver todos os produtos" }),
    ]));
    return;
  }

  document.title = p.nome + " · TechBlack";
  crumbs.appendChild(el("span", { "aria-hidden": "true", text: "/" }));
  crumbs.appendChild(el("a", { href: "produtos.html?cat=" + p.categoria, text: p.categoriaNome }));
  crumbs.appendChild(el("span", { "aria-hidden": "true", text: "/" }));
  crumbs.appendChild(el("span", { "aria-current": "page", text: p.nome }));

  var out = p.estoque <= 0;
  var qtyInput = el("input", { type: "number", min: "1", max: String(Math.max(1, p.estoque)), value: "1", "aria-label": "Quantidade", inputmode: "numeric" });
  function qty() { return Math.max(1, parseInt(qtyInput.value, 10) || 1); }

  var stock = out ? el("span", { class: "badge badge-out", text: "Esgotado" })
    : p.estoque <= 6 ? el("span", { class: "badge badge-low", text: "Restam apenas " + p.estoque + " unidades" })
    : el("span", { class: "badge badge-ok", text: "Em estoque · pronta entrega" });

  root.appendChild(el("div", { class: "pdp" }, [
    el("div", { class: "pdp-media" }, [el("img", { src: p.imagem, alt: p.nome, width: "600", height: "450" }), TB.badges(p)]),
    el("div", { class: "pdp-info" }, [
      el("span", { class: "pc-cat", text: p.categoriaNome }),
      el("h1", { text: p.nome }),
      el("div", { style: "display:flex;flex-wrap:wrap;gap:10px;align-items:center" }, [TB.stars(p), stock]),
      el("p", { class: "muted", text: p.descricao }),
      el("div", { class: "price-box" }, [
        p.precoAntigo ? el("span", null, [el("span", { class: "price-old", text: TB.money(p.precoAntigo) }), " ", el("span", { class: "badge badge-off", text: "-" + TB.desconto(p) + "%" })]) : null,
        el("span", { class: "price", text: TB.money(p.preco) }),
        el("span", { class: "price-sub", text: "em até " + p.parcelas + "x de " + TB.money(TB.parcela(p)) + " sem juros no cartão" }),
        el("span", { class: "pix-line" }, [el("span", { html: I.pix, style: "display:inline-grid;width:18px;height:18px;color:var(--green)" }), el("b", { text: TB.money(p.preco * 0.95) }), " no Pix (5% de desconto)"]),
      ]),
      el("div", { class: "buy-row" }, [
        TB.qtyStepper(qtyInput, p.estoque),
        el("button", { class: "btn btn-primary", type: "button", id: "add-btn", disabled: out, html: I.cart + "<span>Adicionar ao carrinho</span>", onclick: function () { TB.addAndNotify(p, qty()); } }),
      ]),
      el("button", { class: "btn btn-ghost btn-block", type: "button", disabled: out, text: "Comprar agora", onclick: function () { if (TB.cartAdd(p.id, qty())) location.href = "carrinho.html"; } }),
      el("div", { class: "trust" }, [
        el("div", null, [el("span", { html: I.truck, style: "display:contents" }), "Frete grátis acima de " + TB.money(TB.FRETE_GRATIS)]),
        el("div", null, [el("span", { html: I.shield, style: "display:contents" }), "Garantia de 12 meses"]),
        el("div", null, [el("span", { html: I.swap, style: "display:contents" }), "Troca grátis em 7 dias"]),
      ]),
      el("div", null, [
        el("h2", { style: "font-size:1.2rem;font-weight:800;margin:10px 0 14px", text: "Especificações técnicas" }),
        el("ul", { class: "spec-list" }, p.specs.map(function (s) { return el("li", { text: s }); })),
      ]),
    ]),
  ]));

  var related = TB.produtos().filter(function (x) { return x.categoria === p.categoria && x.id !== p.id; });
  if (related.length < 4) related = related.concat(TB.produtos().filter(function (x) { return x.destaque && x.categoria !== p.categoria; }).slice(0, 4 - related.length));
  var wrap = document.getElementById("related-wrap");
  var grid = document.getElementById("related");
  related.slice(0, 4).forEach(function (x) { grid.appendChild(TB.productCard(x)); });
  document.getElementById("related-link").setAttribute("href", "produtos.html?cat=" + p.categoria);
  wrap.hidden = false;
})();
