/* TechBlack · checkout (validação, pagamento simulado, criação do pedido) */
(function () {
  "use strict";
  var TB = window.TB, el = TB.el, I = TB.I;
  var $ = function (id) { return document.getElementById(id); };
  var area = $("checkout-area"), confirmArea = $("confirm-area"), emptyArea = $("empty-area");

  function showReceipt(order, title) {
    area.hidden = true;
    emptyArea.hidden = true;
    confirmArea.hidden = false;
    confirmArea.textContent = "";
    confirmArea.appendChild(window.TBReceipt.render(order, { title: title }));
    $("co-title").textContent = "Pedido " + order.id;
    $("step-3").classList.add("on");
    document.title = "Pedido " + order.id + " · TechBlack";
    window.scrollTo(0, 0);
  }

  // Exibir comprovante de um pedido existente: checkout.html?pedido=TB-...
  var pedidoId = new URLSearchParams(location.search).get("pedido");
  if (pedidoId) {
    var found = TB.pedidos().filter(function (o) { return o.id === pedidoId; })[0];
    if (found) { showReceipt(found, "Comprovante do pedido"); return; }
    area.hidden = true;
    emptyArea.hidden = false;
    emptyArea.appendChild(el("div", { class: "empty" }, [el("span", { html: I.box }), el("h3", { text: "Pedido não encontrado" }),
      el("p", { text: "Os pedidos ficam salvos apenas no navegador em que foram feitos." }), el("a", { class: "btn btn-primary", href: "painel.html#pedidos", text: "Ir para o painel" })]));
    return;
  }

  if (!TB.cartLines().length) {
    area.hidden = true;
    emptyArea.hidden = false;
    emptyArea.appendChild(el("div", { class: "empty" }, [el("span", { html: I.cart }), el("h3", { text: "Seu carrinho está vazio" }),
      el("p", { text: "Adicione produtos antes de finalizar a compra." }), el("a", { class: "btn btn-primary", href: "produtos.html", text: "Ver produtos" })]));
    return;
  }

  /* ------------------------------------------------------------- máscaras -- */
  function digits(v) { return String(v).replace(/\D/g, ""); }
  var masks = {
    cpf: function (v) { v = digits(v).slice(0, 11); return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"); },
    tel: function (v) { v = digits(v).slice(0, 11); if (v.length <= 2) return v; if (v.length <= 6) return "(" + v.slice(0, 2) + ") " + v.slice(2); if (v.length <= 10) return "(" + v.slice(0, 2) + ") " + v.slice(2, 6) + "-" + v.slice(6); return "(" + v.slice(0, 2) + ") " + v.slice(2, 7) + "-" + v.slice(7); },
    cep: function (v) { v = digits(v).slice(0, 8); return v.length > 5 ? v.slice(0, 5) + "-" + v.slice(5) : v; },
    "cc-num": function (v) { return digits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 "); },
    "cc-val": function (v) { v = digits(v).slice(0, 4); return v.length > 2 ? v.slice(0, 2) + "/" + v.slice(2) : v; },
    "cc-cvv": function (v) { return digits(v).slice(0, 4); },
    numero: function (v) { return String(v).slice(0, 8); },
  };
  Object.keys(masks).forEach(function (id) {
    $(id).addEventListener("input", function (e) { e.target.value = masks[id](e.target.value); });
  });

  /* ------------------------------------------------------------ validação -- */
  function validCpf(c) {
    c = digits(c);
    if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
    for (var t = 9; t < 11; t++) {
      var s = 0;
      for (var i = 0; i < t; i++) s += +c[i] * (t + 1 - i);
      if (((10 * s) % 11) % 10 !== +c[t]) return false;
    }
    return true;
  }
  function luhn(n) {
    n = digits(n);
    if (n.length < 13 || n.length > 19) return false;
    var s = 0, dbl = false;
    for (var i = n.length - 1; i >= 0; i--) { var d = +n[i]; if (dbl) { d *= 2; if (d > 9) d -= 9; } s += d; dbl = !dbl; }
    return s % 10 === 0;
  }
  function bandeira(n) {
    n = digits(n);
    if (/^4/.test(n)) return "Visa";
    if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
    if (/^3[47]/.test(n)) return "Amex";
    if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(n)) return "Elo";
    return "Cartão";
  }
  function validExp(v) {
    var m = /^(\d{2})\/(\d{2})$/.exec(v);
    if (!m) return false;
    var mm = +m[1], yy = 2000 + +m[2];
    if (mm < 1 || mm > 12) return false;
    var now = new Date();
    return yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1);
  }

  var rules = {
    nome: function (v) { return v.trim().split(/\s+/).length >= 2 && v.trim().length >= 5 ? "" : "Informe nome e sobrenome."; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Digite um e-mail válido."; },
    tel: function (v) { var d = digits(v); return d.length >= 10 && d.length <= 11 ? "" : "Digite um telefone com DDD."; },
    cpf: function (v) { return validCpf(v) ? "" : "CPF inválido."; },
    cep: function (v) { return digits(v).length === 8 ? "" : "CEP deve ter 8 dígitos."; },
    rua: function (v) { return v.trim().length >= 3 ? "" : "Informe a rua."; },
    numero: function (v) { return v.trim() ? "" : "Informe o número."; },
    bairro: function (v) { return v.trim().length >= 2 ? "" : "Informe o bairro."; },
    cidade: function (v) { return v.trim().length >= 2 ? "" : "Informe a cidade."; },
    uf: function (v) { return v ? "" : "Selecione."; },
  };
  var cardRules = {
    "cc-num": function (v) { return luhn(v) ? "" : "Número de cartão inválido."; },
    "cc-nome": function (v) { return v.trim().length >= 3 ? "" : "Informe o nome impresso."; },
    "cc-val": function (v) { return validExp(v) ? "" : "Validade inválida."; },
    "cc-cvv": function (v) { return /^\d{3,4}$/.test(v) ? "" : "CVV inválido."; },
  };
  function check(id, fn) {
    var input = $(id), msg = fn(input.value);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    var err = $(id + "-err");
    if (err) { err.textContent = msg; input.setAttribute("aria-describedby", id + "-err"); }
    return !msg;
  }
  function allRules() { var r = Object.assign({}, rules); if (payType() === "cartao") Object.assign(r, cardRules); return r; }
  // Valida campo ao sair dele (só depois de tocado)
  Object.keys(rules).concat(Object.keys(cardRules)).forEach(function (id) {
    $(id).addEventListener("blur", function () { if ($(id).value) check(id, allRules()[id] || function () { return ""; }); });
  });

  /* -------------------------------------------------------- pagamento/frete -- */
  function payType() { var r = document.querySelector('input[name="pag"]:checked'); return r ? r.value : "pix"; }
  document.querySelectorAll('input[name="pag"]').forEach(function (r) {
    r.addEventListener("change", function () {
      document.querySelectorAll(".pay-panel").forEach(function (p) { p.hidden = p.dataset.pay !== payType(); });
      renderSummary();
    });
  });

  var st = TB.checkoutState();
  if (st.cep) $("cep").value = masks.cep(st.cep);
  $("cep").addEventListener("input", function () {
    var d = digits($("cep").value);
    if (d.length === 8) TB.setCheckoutState({ cep: d });
    renderSummary();
  });

  function renderSummary() {
    var t = TB.totals(payType());
    var mi = $("mini-items");
    mi.textContent = "";
    t.lines.forEach(function (l) {
      mi.appendChild(el("div", { class: "mini-item" }, [
        el("img", { src: l.p.imagem, alt: "" }),
        el("div", null, [el("div", { text: l.p.nome }), el("div", { class: "q", text: "Qtd. " + l.qty })]),
        el("strong", { text: TB.money(l.total) }),
      ]));
    });
    $("s-sub").textContent = TB.money(t.subtotal);
    $("row-cupom").hidden = !t.cupom;
    if (t.cupom) { $("s-cupom-l").textContent = "Cupom " + t.cupom; $("s-cupom").textContent = "− " + TB.money(t.desconto); }
    $("s-frete").textContent = t.frete ? (t.frete.valor ? TB.money(t.frete.valor) : "Grátis") : "Informe o CEP";
    $("row-pix").hidden = !t.descontoPix;
    $("s-pix").textContent = "− " + TB.money(t.descontoPix);
    $("s-total").textContent = TB.money(t.total);
    $("s-parc").textContent = payType() === "cartao" ? "em até 12x de " + TB.money(t.total / 12) + " sem juros" : payType() === "pix" ? "Pagamento à vista no Pix com 5% off" : "Pagamento à vista no boleto";

    // Frete
    var so = $("ship-opts");
    so.textContent = "";
    (t.opcoesFrete || []).forEach(function (o) {
      var r = el("input", { type: "radio", name: "frete", value: o.id });
      r.checked = t.frete && t.frete.id === o.id;
      r.addEventListener("change", function () { TB.setCheckoutState({ frete: o.id }); renderSummary(); });
      so.appendChild(el("label", { class: "ship-opt" }, [r, el("div", null, [el("strong", { text: o.nome }), el("small", { text: o.prazo })]), el("b", { text: o.valor ? TB.money(o.valor) : "Grátis" })]));
    });

    // Parcelas
    var sel = $("cc-parc"), cur = sel.value || "1";
    sel.textContent = "";
    for (var i = 1; i <= 12; i++) {
      var opt = el("option", { value: String(i), text: i + "x de " + TB.money(t.total / i) + (i === 1 ? " à vista" : " sem juros") });
      sel.appendChild(opt);
    }
    sel.value = cur;
    return t;
  }
  renderSummary();
  var finished = false;
  document.addEventListener("cart:change", function () { if (finished) return; if (!TB.cartLines().length) location.reload(); else renderSummary(); });

  /* ---------------------------------------------------------- dados demo -- */
  $("fill-demo").addEventListener("click", function () {
    var demo = { nome: "Ana Souza Lima", email: "ana.souza@exemplo.com", tel: "11987654321", cpf: "52998224725", cep: "01310100",
      rua: "Avenida Paulista", numero: "1000", comp: "Apto 42", bairro: "Bela Vista", cidade: "São Paulo", uf: "SP",
      "cc-num": "4111111111111111", "cc-nome": "ANA S LIMA", "cc-val": "12/" + String((new Date().getFullYear() + 3) % 100).padStart(2, "0"), "cc-cvv": "123" };
    Object.keys(demo).forEach(function (k) {
      var inp = $(k);
      inp.value = masks[k] ? masks[k](demo[k]) : demo[k];
      inp.setAttribute("aria-invalid", "false");
      var err = $(k + "-err"); if (err) err.textContent = "";
    });
    TB.setCheckoutState({ cep: demo.cep });
    $("termos").checked = true;
    renderSummary();
    TB.toast("Dados de exemplo preenchidos.");
  });

  /* -------------------------------------------------------------- envio -- */
  $("co-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var r = allRules(), firstBad = null;
    Object.keys(r).forEach(function (id) { if (!check(id, r[id]) && !firstBad) firstBad = $(id); });
    var termsOk = $("termos").checked;
    $("termos-err").textContent = termsOk ? "" : "Confirme que está ciente de que este é um pedido de demonstração.";
    if (!termsOk && !firstBad) firstBad = $("termos");
    if (firstBad) { firstBad.focus(); firstBad.scrollIntoView({ block: "center", behavior: "smooth" }); TB.toast("Revise os campos destacados."); return; }

    var tipo = payType();
    var t = TB.totals(tipo);
    // Revalida estoque no momento da compra
    var semEstoque = t.lines.filter(function (l) { return l.qty > l.p.estoque; });
    if (semEstoque.length) { TB.toast("Estoque insuficiente para " + semEstoque[0].p.nome + ". Ajuste o carrinho."); return; }

    var btn = $("confirm-btn");
    btn.disabled = true;
    btn.textContent = "Processando pagamento simulado…";

    var order = {
      id: TB.novoNumero(),
      data: new Date().toISOString(),
      cliente: { nome: $("nome").value.trim(), email: $("email").value.trim(), telefone: $("tel").value.trim(), cpf: digits($("cpf").value) },
      endereco: { cep: masks.cep($("cep").value), rua: $("rua").value.trim(), numero: $("numero").value.trim(), comp: $("comp").value.trim(), bairro: $("bairro").value.trim(), cidade: $("cidade").value.trim(), uf: $("uf").value },
      itens: t.lines.map(function (l) { return { id: l.p.id, nome: l.p.nome, categoria: l.p.categoria, qty: l.qty, preco: l.p.preco, imagem: l.p.imagem }; }),
      subtotal: TB.round2(t.subtotal), cupom: t.cupom, desconto: t.desconto,
      frete: t.frete ? { nome: t.frete.nome, prazo: t.frete.prazo, valor: t.frete.valor } : { nome: "Entrega padrão", prazo: "a combinar", valor: 0 },
      descontoPix: t.descontoPix, total: t.total,
      pagamento: tipo === "cartao"
        ? { tipo: tipo, parcelas: +$("cc-parc").value || 1, bandeira: bandeira($("cc-num").value), final: digits($("cc-num").value).slice(-4) }
        : { tipo: tipo, parcelas: 1 },
      status: tipo === "cartao" ? "Pago" : "Aguardando pagamento",
    };

    setTimeout(function () {
      finished = true;
      var list = TB.pedidos(); list.unshift(order); TB.savePedidos(list);
      t.lines.forEach(function (l) { TB.setOverride(l.p.id, { estoque: Math.max(0, l.p.estoque - l.qty) }); });
      TB.setCheckoutState({ cupom: null });
      TB.saveCart([]);
      try { history.replaceState(null, "", "checkout.html?pedido=" + encodeURIComponent(order.id)); } catch (err) {}
      showReceipt(order);
    }, 900);
  });
})();
