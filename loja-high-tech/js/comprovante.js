/* TechBlack · comprovante do pedido (tela + impressão/PDF) */
(function () {
  "use strict";
  var TB = window.TB, el = TB.el, I = TB.I;
  var SVGNS = "http://www.w3.org/2000/svg";

  var PAG = { pix: "Pix", cartao: "Cartão de crédito", boleto: "Boleto bancário" };
  var STATUS_CLASS = { "Pago": "st-pago", "Aguardando pagamento": "st-aguardando", "Enviado": "st-enviado", "Entregue": "st-entregue", "Cancelado": "st-cancelado" };

  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }

  /** QR Code ILUSTRATIVO (não escaneável), desenhado com DOM SVG. */
  function fakeQr(seedText) {
    var n = 29, r = rng(hash(seedText));
    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + n + " " + n);
    svg.setAttribute("class", "qr");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "QR Code Pix ilustrativo");
    svg.setAttribute("shape-rendering", "crispEdges");
    function rect(x, y, w, h, fill) {
      var e = document.createElementNS(SVGNS, "rect");
      e.setAttribute("x", x); e.setAttribute("y", y); e.setAttribute("width", w); e.setAttribute("height", h); e.setAttribute("fill", fill);
      svg.appendChild(e);
    }
    function finder(x, y) { rect(x, y, 7, 7, "#111"); rect(x + 1, y + 1, 5, 5, "#fff"); rect(x + 2, y + 2, 3, 3, "#111"); }
    function inFinder(x, y) { return (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9); }
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (!inFinder(x, y) && r() > 0.52) rect(x, y, 1, 1, "#111");
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
    rect(12, 12, 5, 5, "#fff"); rect(13, 13, 3, 3, "#e3b341");
    return svg;
  }
  function pixCode(o) {
    return "00020126580014BR.GOV.BCB.PIX0136demo-techblack-" + o.id.toLowerCase() + "520400005303986540" +
      String(o.total.toFixed(2)).length + o.total.toFixed(2) + "5802BR5914TECHBLACK DEMO6009SAO PAULO62110507" + o.id.replace(/-/g, "").slice(0, 7) + "6304" + (hash(o.id) % 65536).toString(16).toUpperCase().padStart(4, "0");
  }
  function boletoLine(o) {
    var r = rng(hash(o.id + "boleto")), d = "";
    for (var i = 0; i < 47; i++) d += Math.floor(r() * 10);
    var cents = String(Math.round(o.total * 100)).padStart(10, "0");
    d = d.slice(0, 37) + cents;
    return d.slice(0, 5) + "." + d.slice(5, 10) + " " + d.slice(10, 15) + "." + d.slice(15, 21) + " " + d.slice(21, 26) + "." + d.slice(26, 32) + " " + d[32] + " " + d.slice(33);
  }
  function maskCpf(c) { var d = String(c || "").replace(/\D/g, ""); return d.length === 11 ? "***." + d.slice(3, 6) + "." + d.slice(6, 9) + "-" + d.slice(9) : "—"; }
  function dateBR(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function copyBtn(text) {
    return el("button", { class: "btn btn-dark btn-sm", type: "button", text: "Copiar", onclick: function (e) {
      var b = e.currentTarget;
      function done() { b.textContent = "Copiado!"; setTimeout(function () { b.textContent = "Copiar"; }, 1800); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { TB.toast("Não foi possível copiar. Selecione o código manualmente."); });
      else TB.toast("Selecione o código e copie manualmente.");
    } });
  }

  function payBox(o) {
    var p = o.pagamento;
    if (p.tipo === "pix") {
      var code = pixCode(o);
      return el("div", { class: "pay-box" }, [
        fakeQr(o.id),
        el("div", { style: "min-width:0;width:100%" }, [
          el("strong", { text: "Pague com Pix para liberar o envio" }),
          el("p", { class: "price-sub", text: "Escaneie o QR Code ou use o código copia e cola. Validade: 30 minutos. (QR Code e código ilustrativos, sem valor de pagamento.)" }),
          el("div", { class: "code-line" }, [el("code", { text: code, title: code }), copyBtn(code)]),
        ]),
      ]);
    }
    if (p.tipo === "boleto") {
      var line = boletoLine(o);
      var venc = new Date(o.data); venc.setDate(venc.getDate() + 3);
      return el("div", { class: "pay-box", style: "grid-template-columns:1fr" }, [
        el("div", { style: "min-width:0" }, [
          el("strong", { text: "Boleto gerado · vencimento " + venc.toLocaleDateString("pt-BR") }),
          el("p", { class: "price-sub", text: "Linha digitável fictícia para demonstração." }),
          el("div", { class: "code-line" }, [el("code", { text: line, title: line }), copyBtn(line.replace(/\D/g, ""))]),
        ]),
      ]);
    }
    return el("div", { class: "pay-box", style: "grid-template-columns:auto 1fr" }, [
      el("span", { html: I.card, style: "display:inline-grid;width:44px;height:44px;color:var(--green)" }),
      el("div", null, [
        el("strong", { text: "Pagamento aprovado (simulação)" }),
        el("p", { class: "price-sub", text: (p.bandeira || "Cartão") + " final " + (p.final || "****") + " · " + p.parcelas + "x de " + TB.money(o.total / p.parcelas) + " sem juros" }),
      ]),
    ]);
  }

  function waText(o) {
    return "Olá! Fiz o pedido *" + o.id + "* na TechBlack em " + dateBR(o.data) + ".\n" +
      "Total: " + TB.money(o.total) + " · Pagamento: " + PAG[o.pagamento.tipo] + ".\n" +
      "Gostaria de falar sobre o meu pedido.";
  }

  /** Monta o comprovante. opts.title sobrescreve o título. */
  function render(o, opts) {
    opts = opts || {};
    var first = String(o.cliente.nome || "").trim().split(/\s+/)[0] || "cliente";
    var e = o.endereco;
    var receipt = el("article", { class: "receipt", id: "receipt" }, [
      el("div", { class: "receipt-top" }, [
        el("div", { class: "receipt-head", style: "display:flex;gap:16px;align-items:center;min-width:0" }, [
          el("span", { class: "ok-ic", html: I.check }),
          el("div", { style: "min-width:0" }, [
            el("h1", { text: opts.title || "Pedido confirmado!" }),
            el("p", { class: "muted", text: "Obrigado, " + first + "! Os detalhes também seriam enviados para " + o.cliente.email + " (simulação)." }),
          ]),
        ]),
        el("div", { style: "display:flex;flex-direction:column;gap:8px;align-items:flex-start" }, [
          el("span", { class: "order-no", text: o.id }),
          el("span", { class: "status-pill " + (STATUS_CLASS[o.status] || ""), text: o.status }),
        ]),
      ]),
      el("div", { class: "receipt-body" }, [
        el("div", { style: "display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:.82rem", class: "muted" }, [
          el("span", null, [el("strong", { style: "color:var(--text)", text: "TechBlack Comércio Eletrônico (fictício)" }), " · CNPJ 00.000.000/0001-00"]),
          el("span", { text: "Comprovante de pedido · " + dateBR(o.data) }),
        ]),
        payBox(o),
        el("div", { class: "receipt-grid" }, [
          el("div", null, [el("small", { text: "Cliente" }), el("strong", { text: o.cliente.nome })]),
          el("div", null, [el("small", { text: "CPF" }), el("strong", { text: maskCpf(o.cliente.cpf) })]),
          el("div", null, [el("small", { text: "Contato" }), el("strong", { text: o.cliente.telefone })]),
          el("div", null, [el("small", { text: "Pagamento" }), el("strong", { text: PAG[o.pagamento.tipo] + (o.pagamento.tipo === "cartao" ? " · " + o.pagamento.parcelas + "x" : "") })]),
          el("div", null, [el("small", { text: "Entrega" }), el("strong", { text: o.frete.nome + " · " + o.frete.prazo })]),
          el("div", null, [el("small", { text: "Endereço" }), el("strong", { text: e.rua + ", " + e.numero + (e.comp ? " – " + e.comp : "") + " · " + e.bairro + " · " + e.cidade + "/" + e.uf + " · CEP " + e.cep })]),
        ]),
        el("table", { class: "r-table" }, [
          el("thead", null, el("tr", null, [el("th", { text: "Produto" }), el("th", { text: "Qtd." }), el("th", { text: "Valor" })])),
          el("tbody", null, o.itens.map(function (i) {
            return el("tr", null, [
              el("td", null, [el("strong", { text: i.nome }), el("br"), el("span", { class: "price-sub", text: TB.money(i.preco) + " / un." })]),
              el("td", { text: String(i.qty) }),
              el("td", { text: TB.money(i.preco * i.qty) }),
            ]);
          })),
        ]),
        el("div", { class: "r-totals" }, [
          el("div", { class: "sum-row" }, [el("span", { text: "Subtotal" }), el("span", { text: TB.money(o.subtotal) })]),
          o.desconto ? el("div", { class: "sum-row discount" }, [el("span", { text: "Cupom " + o.cupom }), el("span", { text: "− " + TB.money(o.desconto) })]) : null,
          el("div", { class: "sum-row" }, [el("span", { text: "Frete" }), el("span", { text: o.frete.valor ? TB.money(o.frete.valor) : "Grátis" })]),
          o.descontoPix ? el("div", { class: "sum-row discount" }, [el("span", { text: "Desconto Pix" }), el("span", { text: "− " + TB.money(o.descontoPix) })]) : null,
          el("div", { class: "sum-total" }, [el("span", { text: "Total" }), el("strong", { text: TB.money(o.total) })]),
        ]),
        el("p", { class: "price-sub", style: "text-align:center", text: "Documento gerado em ambiente de demonstração, sem valor fiscal. Nenhuma cobrança real foi realizada." }),
      ]),
      el("div", { class: "receipt-actions" }, [
        el("button", { class: "btn btn-primary", type: "button", html: I.download + "<span>Baixar comprovante (PDF)</span>", onclick: function () {
          TB.toast("Na janela de impressão, escolha “Salvar como PDF”.", { ms: 4500 });
          setTimeout(function () { window.print(); }, 300);
        } }),
        el("a", { class: "btn btn-wa", href: TB.waLink(waText(o)), target: "_blank", rel: "noopener", html: I.wa + "<span>Falar no WhatsApp</span>" }),
        el("a", { class: "btn btn-ghost", href: "produtos.html", text: "Continuar comprando" }),
        el("a", { class: "btn btn-ghost", href: "painel.html#pedidos", text: "Ver no painel" }),
      ]),
    ]);
    return receipt;
  }

  window.TBReceipt = { render: render, PAG: PAG, STATUS_CLASS: STATUS_CLASS, dateBR: dateBR };
})();
