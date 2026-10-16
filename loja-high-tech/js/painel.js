/* TechBlack · painel administrativo (demo em localStorage) */
(function () {
  "use strict";
  var TB = window.TB, el = TB.el, I = TB.I;
  var $ = function (id) { return document.getElementById(id); };
  var cats = TB.categorias();
  var STATUS = ["Aguardando pagamento", "Pago", "Enviado", "Entregue", "Cancelado"];
  var ST_CLASS = { "Pago": "st-pago", "Aguardando pagamento": "st-aguardando", "Enviado": "st-enviado", "Entregue": "st-entregue", "Cancelado": "st-cancelado" };
  var PAG = { pix: "Pix", cartao: "Cartão", boleto: "Boleto" };

  /* ----------------------------------------------------------------- abas -- */
  var tabs = document.querySelectorAll("[data-tab]");
  function show(name) {
    if (!$("panel-" + name)) name = "visao";
    tabs.forEach(function (t) {
      var on = t.dataset.tab === name;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      $("panel-" + t.dataset.tab).hidden = !on;
    });
    if (name === "visao") renderOverview();
    if (name === "produtos") renderProducts();
    if (name === "pedidos") renderOrders();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { try { history.replaceState(null, "", "#" + t.dataset.tab); } catch (e) {} show(t.dataset.tab); });
    t.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); n.click();
    });
  });

  function statusPill(s) { return el("span", { class: "status-pill " + (ST_CLASS[s] || ""), text: s }); }
  function shortDate(iso) { var d = new Date(iso); return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }

  /* --------------------------------------------------------- visão geral -- */
  function renderOverview() {
    var orders = TB.pedidos();
    var valid = orders.filter(function (o) { return o.status !== "Cancelado"; });
    var receita = valid.reduce(function (s, o) { return s + o.total; }, 0);
    var prods = TB.produtos();
    var unidades = prods.reduce(function (s, p) { return s + Math.max(0, p.estoque); }, 0);
    var low = prods.filter(function (p) { return p.estoque <= 6; }).sort(function (a, b) { return a.estoque - b.estoque; });
    var pend = orders.filter(function (o) { return o.status === "Aguardando pagamento"; }).length;
    $("today").textContent = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

    var k = $("kpis");
    k.textContent = "";
    [
      ["Faturamento", TB.money(receita), valid.length + " pedidos válidos"],
      ["Pedidos", String(orders.length), pend + " aguardando pagamento"],
      ["Ticket médio", TB.money(valid.length ? receita / valid.length : 0), "por pedido"],
      ["Estoque", unidades.toLocaleString("pt-BR") + " un.", prods.length + " produtos · " + low.length + " em alerta"],
    ].forEach(function (x) { k.appendChild(el("div", { class: "kpi" }, [el("small", { text: x[0] }), el("strong", { text: x[1] }), el("span", { text: x[2] })])); });

    // Vendas por categoria
    var byCat = {};
    valid.forEach(function (o) { o.itens.forEach(function (i) { var c = i.categoria || (TB.produto(i.id) || {}).categoria || "outros"; byCat[c] = (byCat[c] || 0) + i.preco * i.qty; }); });
    var bars = $("bars");
    bars.textContent = "";
    var keys = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; });
    if (!keys.length) {
      bars.appendChild(el("div", { class: "empty", style: "padding:30px 16px" }, [
        el("h3", { text: "Ainda não há vendas" }),
        el("p", { text: "Faça uma compra na loja ou gere pedidos de exemplo para ver o gráfico." }),
        el("button", { class: "btn btn-primary btn-sm", type: "button", text: "Gerar pedidos de exemplo", onclick: seedOrders }),
      ]));
    } else {
      var max = byCat[keys[0]];
      keys.forEach(function (c) {
        bars.appendChild(el("div", { class: "bar-row" }, [
          el("span", { text: cats[c] || c }),
          el("div", { class: "track", role: "img", "aria-label": (cats[c] || c) + ": " + TB.money(byCat[c]) }, el("i", { style: "width:" + Math.max(3, byCat[c] / max * 100) + "%" })),
          el("b", { text: TB.money(byCat[c]) }),
        ]));
      });
    }

    var ll = $("low-list");
    ll.textContent = "";
    if (!low.length) ll.appendChild(el("li", null, el("span", { class: "muted", text: "Nenhum produto com estoque baixo." })));
    low.slice(0, 7).forEach(function (p) {
      ll.appendChild(el("li", null, [
        el("a", { href: "#produtos", text: p.nome, onclick: function (e) { e.preventDefault(); $("p-busca").value = p.nome; $("tab-produtos").click(); } }),
        el("span", { class: "badge " + (p.estoque <= 0 ? "badge-out" : "badge-low"), text: p.estoque <= 0 ? "Esgotado" : p.estoque + " un." }),
      ]));
    });

    var lo = $("last-orders");
    lo.textContent = "";
    if (!orders.length) lo.appendChild(el("p", { class: "muted", text: "Nenhum pedido ainda." }));
    else lo.appendChild(ordersTable(orders.slice(0, 5), true));
    $("orders-count").textContent = String(orders.length);
  }

  /* ------------------------------------------------------------ produtos -- */
  Object.keys(cats).forEach(function (c) { $("p-cat").appendChild(el("option", { value: c, text: cats[c] })); });
  $("p-busca").addEventListener("input", renderProducts);
  $("p-cat").addEventListener("change", renderProducts);
  $("p-reset").addEventListener("click", function () {
    if (!window.confirm("Restaurar preços, estoque e destaques originais de todos os produtos?")) return;
    TB.write(TB.KEYS.overrides, {});
    renderProducts();
    TB.toast("Catálogo restaurado.");
  });

  function renderProducts() {
    var q = $("p-busca").value.trim().toLowerCase();
    var c = $("p-cat").value;
    var list = TB.produtos().filter(function (p) {
      return (!c || p.categoria === c) && (!q || (p.nome + " " + p.id).toLowerCase().indexOf(q) !== -1);
    });
    $("prod-count").textContent = list.length + " de " + TB.produtos().length;
    var tb = document.querySelector("#p-table tbody");
    tb.textContent = "";
    if (!list.length) { tb.appendChild(el("tr", null, el("td", { colspan: "7", class: "muted", style: "text-align:center;padding:30px", text: "Nenhum produto encontrado." }))); return; }
    list.forEach(function (p) {
      var price = el("input", { class: "input", type: "number", min: "1", step: "0.01", value: String(p.preco), "aria-label": "Preço de " + p.nome });
      var stock = el("input", { class: "input", type: "number", min: "0", step: "1", value: String(p.estoque), "aria-label": "Estoque de " + p.nome, style: "width:90px" });
      var dest = el("input", { type: "checkbox", "aria-label": "Destaque: " + p.nome, style: "width:18px;height:18px;accent-color:var(--orange)" });
      dest.checked = !!p.destaque;
      var situ = el("td", null, p.estoque <= 0 ? el("span", { class: "badge badge-out", text: "Esgotado" }) : p.estoque <= 6 ? el("span", { class: "badge badge-low", text: "Baixo" }) : el("span", { class: "badge badge-ok", text: "Ativo" }));
      var row;
      function save() {
        var pv = parseFloat(price.value), sv = parseInt(stock.value, 10);
        var okP = !isNaN(pv) && pv > 0, okS = !isNaN(sv) && sv >= 0;
        price.setAttribute("aria-invalid", okP ? "false" : "true");
        stock.setAttribute("aria-invalid", okS ? "false" : "true");
        price.style.borderColor = okP ? "" : "var(--red)";
        stock.style.borderColor = okS ? "" : "var(--red)";
        if (!okP || !okS) { TB.toast("Preço deve ser maior que zero e estoque não pode ser negativo."); return; }
        TB.setOverride(p.id, { preco: TB.round2(pv), estoque: sv, destaque: dest.checked });
        row.classList.remove("saved-flash"); void row.offsetWidth; row.classList.add("saved-flash");
        situ.textContent = "";
        situ.appendChild(sv <= 0 ? el("span", { class: "badge badge-out", text: "Esgotado" }) : sv <= 6 ? el("span", { class: "badge badge-low", text: "Baixo" }) : el("span", { class: "badge badge-ok", text: "Ativo" }));
        TB.toast(p.nome + " atualizado: " + TB.money(pv) + " · " + sv + " un.");
      }
      [price, stock].forEach(function (i) { i.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); save(); } }); });
      row = el("tr", { "data-id": p.id }, [
        el("td", null, el("div", { class: "prod-cell" }, [el("img", { src: p.imagem, alt: "" }), el("div", null, [el("strong", { text: p.nome }), el("br"), el("span", { class: "price-sub", text: p.id })])])),
        el("td", { text: p.categoriaNome }),
        el("td", null, price),
        el("td", null, stock),
        el("td", null, dest),
        situ,
        el("td", null, el("div", { class: "row-actions" }, [
          el("button", { class: "btn btn-primary btn-sm", type: "button", text: "Salvar", onclick: save }),
          el("a", { class: "btn btn-ghost btn-sm", href: "produto.html?id=" + encodeURIComponent(p.id), text: "Ver" }),
        ])),
      ]);
      tb.appendChild(row);
    });
  }

  /* ------------------------------------------------------------- pedidos -- */
  $("o-status").addEventListener("change", renderOrders);
  $("o-seed").addEventListener("click", seedOrders);
  $("o-clear").addEventListener("click", function () {
    if (!TB.pedidos().length) return;
    if (!window.confirm("Apagar todos os pedidos salvos neste navegador?")) return;
    TB.savePedidos([]);
    renderOrders();
    TB.toast("Pedidos removidos.");
  });

  function setStatus(id, status) {
    var list = TB.pedidos();
    list.forEach(function (o) { if (o.id === id) o.status = status; });
    TB.savePedidos(list);
  }

  function ordersTable(list, compact) {
    var rows = list.map(function (o) {
      var sel = el("select", { class: "input", "aria-label": "Status do pedido " + o.id },
        STATUS.map(function (s) { return el("option", { value: s, text: s }); }));
      sel.value = o.status;
      sel.addEventListener("change", function () { setStatus(o.id, sel.value); TB.toast("Pedido " + o.id + ": " + sel.value); if (compact) renderOverview(); });
      var phone = String(o.cliente.telefone || "").replace(/\D/g, "");
      var nItens = o.itens.reduce(function (s, i) { return s + i.qty; }, 0);
      return el("tr", null, [
        el("td", null, [el("strong", { text: o.id }), el("br"), el("span", { class: "price-sub", text: shortDate(o.data) })]),
        el("td", null, [el("span", { text: o.cliente.nome }), el("br"), el("span", { class: "price-sub", text: o.endereco.cidade + "/" + o.endereco.uf })]),
        el("td", { title: o.itens.map(function (i) { return i.qty + "× " + i.nome; }).join("\n"), text: nItens + (nItens === 1 ? " item" : " itens") }),
        el("td", null, el("strong", { text: TB.money(o.total) })),
        el("td", { text: PAG[o.pagamento.tipo] + (o.pagamento.tipo === "cartao" ? " " + o.pagamento.parcelas + "x" : "") }),
        el("td", null, compact ? statusPill(o.status) : sel),
        el("td", null, el("div", { class: "row-actions" }, [
          el("a", { class: "btn btn-ghost btn-sm", href: "checkout.html?pedido=" + encodeURIComponent(o.id), text: "Comprovante" }),
          !compact && phone.length >= 10 ? el("a", { class: "btn btn-wa btn-sm", target: "_blank", rel: "noopener", "aria-label": "WhatsApp do cliente do pedido " + o.id,
            href: "https://wa.me/55" + phone + "?text=" + encodeURIComponent("Olá, " + o.cliente.nome.split(" ")[0] + "! Aqui é da TechBlack sobre o seu pedido " + o.id + ": status atual \"" + o.status + "\"."), html: I.wa }) : null,
          !compact ? el("button", { class: "btn btn-ghost btn-sm", type: "button", text: "Excluir", "aria-label": "Excluir pedido " + o.id, onclick: function () {
            if (!window.confirm("Excluir o pedido " + o.id + "?")) return;
            TB.savePedidos(TB.pedidos().filter(function (x) { return x.id !== o.id; }));
            renderOrders();
          } }) : null,
        ])),
      ]);
    });
    return el("div", { class: "table-wrap" }, el("table", { class: "table" }, [
      el("thead", null, el("tr", null, ["Pedido", "Cliente", "Itens", "Total", "Pagamento", "Status", ""].map(function (h, i) { return el("th", { text: h, style: i === 6 ? "text-align:right" : null }); }))),
      el("tbody", null, rows),
    ]));
  }

  function renderOrders() {
    var all = TB.pedidos();
    var f = $("o-status").value;
    var list = f ? all.filter(function (o) { return o.status === f; }) : all;
    var w = $("o-wrap");
    w.textContent = "";
    $("orders-count").textContent = String(all.length);
    if (!list.length) {
      w.appendChild(el("div", { class: "empty" }, [
        el("span", { html: I.list }),
        el("h3", { text: all.length ? "Nenhum pedido com esse status" : "Nenhum pedido ainda" }),
        el("p", { text: "Os pedidos feitos no checkout aparecem aqui automaticamente." }),
        el("a", { class: "btn btn-primary", href: "produtos.html", text: "Fazer um pedido de teste" }),
      ]));
      return;
    }
    w.appendChild(ordersTable(list, false));
  }

  /* --------------------------------------------------- pedidos de exemplo -- */
  function seedOrders() {
    var nomes = ["Bruno Carvalho", "Camila Rocha", "Diego Martins", "Elisa Prado", "Felipe Nunes", "Gabriela Torres", "Henrique Alves", "Isabela Moura"];
    var cidades = [["São Paulo", "SP"], ["Rio de Janeiro", "RJ"], ["Belo Horizonte", "MG"], ["Curitiba", "PR"], ["Recife", "PE"], ["Porto Alegre", "RS"], ["Salvador", "BA"], ["São José dos Campos", "SP"]];
    var prods = TB.produtos();
    var list = TB.pedidos();
    for (var n = 0; n < 8; n++) {
      var itens = [], k = 1 + Math.floor(Math.random() * 3);
      for (var j = 0; j < k; j++) {
        var p = prods[Math.floor(Math.random() * prods.length)];
        if (itens.some(function (i) { return i.id === p.id; })) continue;
        itens.push({ id: p.id, nome: p.nome, categoria: p.categoria, qty: 1 + (Math.random() < .2 ? 1 : 0), preco: p.preco, imagem: p.imagem });
      }
      var sub = itens.reduce(function (s, i) { return s + i.preco * i.qty; }, 0);
      var tipo = ["pix", "cartao", "boleto"][Math.floor(Math.random() * 3)];
      var frete = sub >= TB.FRETE_GRATIS ? 0 : 24.9;
      var pix = tipo === "pix" ? TB.round2(sub * .05) : 0;
      var d = new Date(Date.now() - Math.floor(Math.random() * 14 * 864e5));
      var c = cidades[n % cidades.length];
      list.push({
        id: TB.novoNumero(), data: d.toISOString(), exemplo: true,
        cliente: { nome: nomes[n], email: nomes[n].toLowerCase().split(" ")[0] + "@exemplo.com", telefone: "(11) 9" + String(10000000 + Math.floor(Math.random() * 89999999)).replace(/(\d{4})(\d{4})/, "$1-$2"), cpf: "52998224725" },
        endereco: { cep: "01310-100", rua: "Rua Exemplo", numero: String(100 + n * 7), comp: "", bairro: "Centro", cidade: c[0], uf: c[1] },
        itens: itens, subtotal: TB.round2(sub), cupom: null, desconto: 0,
        frete: { nome: "Entrega padrão", prazo: "3 a 5 dias úteis", valor: frete }, descontoPix: pix, total: TB.round2(sub + frete - pix),
        pagamento: tipo === "cartao" ? { tipo: tipo, parcelas: [1, 3, 6, 10, 12][n % 5], bandeira: "Visa", final: "1111" } : { tipo: tipo, parcelas: 1 },
        status: STATUS[(n + 1) % STATUS.length],
      });
    }
    list.sort(function (a, b) { return new Date(b.data) - new Date(a.data); });
    TB.savePedidos(list);
    TB.toast("8 pedidos de exemplo criados.");
    var cur = (location.hash || "#visao").slice(1);
    show(cur === "pedidos" ? "pedidos" : cur === "produtos" ? "produtos" : "visao");
  }

  show((location.hash || "#visao").slice(1));
  window.addEventListener("storage", function () { show((location.hash || "#visao").slice(1)); });
})();
