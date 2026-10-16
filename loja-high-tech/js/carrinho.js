/* TechBlack · carrinho (quantidades, frete por CEP, cupom) */
(function () {
  "use strict";
  var TB = window.TB, el = TB.el, I = TB.I;
  var $ = function (id) { return document.getElementById(id); };

  function maskCep(v) { v = v.replace(/\D/g, "").slice(0, 8); return v.length > 5 ? v.slice(0, 5) + "-" + v.slice(5) : v; }

  var st = TB.checkoutState();
  if (st.cep) $("cep").value = maskCep(st.cep);
  if (st.cupom) $("cupom").value = st.cupom;

  $("cep").addEventListener("input", function (e) { e.target.value = maskCep(e.target.value); });
  $("cep-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var d = $("cep").value.replace(/\D/g, "");
    var msg = $("cep-msg");
    if (d.length !== 8) {
      msg.className = "msg bad"; msg.textContent = "Digite um CEP válido com 8 dígitos.";
      $("cep").setAttribute("aria-invalid", "true");
      return;
    }
    $("cep").setAttribute("aria-invalid", "false");
    TB.setCheckoutState({ cep: d, frete: TB.checkoutState().frete || "padrao" });
    msg.className = "msg ok"; msg.textContent = "Frete calculado para " + maskCep(d) + " (simulação).";
    render();
  });

  $("cupom-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var code = $("cupom").value.trim().toUpperCase();
    var msg = $("cupom-msg");
    if (TB.checkoutState().cupom && (!code || code === TB.checkoutState().cupom)) {
      TB.setCheckoutState({ cupom: null });
      $("cupom").value = "";
      msg.className = "msg"; msg.textContent = "";
      render();
      return;
    }
    if (TB.CUPONS[code]) {
      TB.setCheckoutState({ cupom: code });
      msg.className = "msg ok"; msg.textContent = "Cupom " + code + " aplicado: " + TB.CUPONS[code].pct + "% de desconto.";
    } else {
      msg.className = "msg bad"; msg.textContent = code ? "Cupom “" + code + "” inválido. Experimente TECH10." : "Digite um cupom.";
    }
    render();
  });

  function itemRow(l) {
    var p = l.p;
    var url = "produto.html?id=" + encodeURIComponent(p.id);
    var input = el("input", { type: "number", min: "1", max: String(p.estoque), value: String(l.qty), "aria-label": "Quantidade de " + p.nome, inputmode: "numeric" });
    var stepper = TB.qtyStepper(input, p.estoque, function (v) { TB.cartSet(p.id, v); });
    stepper.classList.add("qty-sm");
    return el("article", { class: "cart-item" }, [
      el("a", { href: url, tabindex: "-1", "aria-hidden": "true" }, el("img", { src: p.imagem, alt: "" })),
      el("div", null, [
        el("span", { class: "pc-cat", text: p.categoriaNome }),
        el("h3", null, el("a", { href: url, text: p.nome })),
        el("div", { class: "ci-meta" }, [
          stepper,
          el("span", { class: "price-sub", text: TB.money(p.preco) + " cada" }),
          l.qty >= p.estoque ? el("span", { class: "badge badge-low", text: "Máx. em estoque" }) : null,
        ]),
      ]),
      el("div", { class: "ci-price" }, [
        el("strong", { text: TB.money(l.total) }),
        el("button", { class: "link-btn", type: "button", text: "Remover", "aria-label": "Remover " + p.nome + " do carrinho",
          onclick: function () { TB.cartRemove(p.id); TB.toast(p.nome + " removido do carrinho."); } }),
      ]),
    ]);
  }

  function render() {
    var t = TB.totals();
    var items = $("cart-items");
    items.textContent = "";
    if (!t.lines.length) {
      $("cart-layout").style.gridTemplateColumns = "1fr";
      $("summary").hidden = true;
      items.appendChild(el("div", { class: "empty" }, [
        el("span", { html: I.cart }),
        el("h3", { text: "Seu carrinho está vazio" }),
        el("p", { text: "Explore o catálogo e adicione seus produtos favoritos." }),
        el("a", { class: "btn btn-primary", href: "produtos.html", text: "Ver produtos" }),
      ]));
      return;
    }
    $("cart-layout").style.gridTemplateColumns = "";
    $("summary").hidden = false;
    t.lines.forEach(function (l) { items.appendChild(itemRow(l)); });

    // Barra de frete grátis
    var fp = $("free-progress");
    fp.textContent = "";
    var pct = Math.min(100, ((t.subtotal - t.desconto) / TB.FRETE_GRATIS) * 100);
    fp.appendChild(el("span", { text: t.faltaFreteGratis > 0 ? "Faltam " + TB.money(t.faltaFreteGratis) + " para ganhar frete grátis na entrega padrão." : "Você ganhou frete grátis na entrega padrão!" }));
    fp.appendChild(el("div", { class: "bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(Math.round(pct)), "aria-label": "Progresso para frete grátis" }, el("i", { style: "width:" + pct + "%" })));

    // Opções de frete
    var so = $("ship-opts");
    so.textContent = "";
    if (t.opcoesFrete) {
      t.opcoesFrete.forEach(function (o) {
        var r = el("input", { type: "radio", name: "frete", value: o.id });
        r.checked = t.frete && t.frete.id === o.id;
        r.addEventListener("change", function () { TB.setCheckoutState({ frete: o.id }); render(); });
        so.appendChild(el("label", { class: "ship-opt" }, [r, el("div", null, [el("strong", { text: o.nome }), el("small", { text: o.prazo })]), el("b", { text: o.valor ? TB.money(o.valor) : "Grátis" })]));
      });
    }

    $("cupom-btn").textContent = t.cupom ? "Remover" : "Aplicar";
    $("s-sub").textContent = TB.money(t.subtotal);
    $("row-desc").hidden = !t.cupom;
    if (t.cupom) { $("s-desc-label").textContent = "Cupom " + t.cupom; $("s-desc").textContent = "− " + TB.money(t.desconto); }
    $("s-frete").textContent = t.frete ? (t.frete.valor ? TB.money(t.frete.valor) : "Grátis") : "Informe o CEP";
    $("s-total").textContent = TB.money(t.total);
    $("s-parc").textContent = "em até 12x de " + TB.money(t.total / 12) + " sem juros · ou " + TB.money(t.total - (t.subtotal - t.desconto) * 0.05) + " no Pix";
  }

  document.addEventListener("cart:change", render);
  render();
})();
