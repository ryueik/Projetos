/* Página de produtos: filtros, busca, ordenação e link direto ?id= / ?categoria=. */
(function () {
  "use strict";
  var B = window.Brecho;
  if (!B) return;
  var P = B.produtos;
  var $ = function (id) { return document.getElementById(id); };

  var state = { categoria: [], tamanho: [], decada: [], precoMax: 260, disp: false, q: "", sort: "destaque" };
  var MAXP = Math.ceil(Math.max.apply(null, P.map(function (p) { return p.preco; }).concat([40])) / 10) * 10;
  $("fPreco").max = String(MAXP);
  $("fPreco").value = String(MAXP);
  state.precoMax = MAXP;

  function uniq(key, order) {
    var vals = [];
    P.forEach(function (p) { if (vals.indexOf(p[key]) === -1) vals.push(p[key]); });
    if (order) vals.sort(order);
    return vals;
  }
  var sizeOrder = ["PP", "P", "M", "G", "GG"];
  function sizeSort(a, b) {
    var ia = sizeOrder.indexOf(a), ib = sizeOrder.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    var na = parseInt(a, 10), nb = parseInt(b, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return isNaN(na) ? 1 : -1;
  }
  var catOrder = ["Vestidos", "Feminino", "Masculino", "Jaquetas", "Bolsas", "Sapatos", "Acessórios", "Casa & Louças", "Discos", "Livros"];

  function chips(hostId, key, values) {
    var host = $(hostId);
    values.forEach(function (v) {
      var n = P.filter(function (p) { return p[key] === v; }).length;
      var b = B.el("button", { class: "chip", type: "button", "aria-pressed": "false", "data-key": key, "data-val": v }, [v, B.el("small", { text: String(n) })]);
      b.addEventListener("click", function () { toggle(key, v); });
      host.appendChild(b);
    });
  }
  chips("fCategoria", "categoria", uniq("categoria", function (a, b) { return catOrder.indexOf(a) - catOrder.indexOf(b); }));
  chips("fTamanho", "tamanho", uniq("tamanho", sizeSort));
  chips("fDecada", "decada", uniq("decada").sort());

  function toggle(key, v) {
    var arr = state[key], i = arr.indexOf(v);
    if (i === -1) arr.push(v); else arr.splice(i, 1);
    render();
  }

  function norm(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  function filtered() {
    var q = norm(state.q.trim());
    var list = P.filter(function (p) {
      if (state.categoria.length && state.categoria.indexOf(p.categoria) === -1) return false;
      if (state.tamanho.length && state.tamanho.indexOf(p.tamanho) === -1) return false;
      if (state.decada.length && state.decada.indexOf(p.decada) === -1) return false;
      if (p.preco > state.precoMax) return false;
      if (state.disp && p.vendido) return false;
      if (q) {
        var hay = norm([p.nome, p.categoria, p.descricao, p.decada, p.id, p.tamanho].join(" "));
        if (!q.split(/\s+/).every(function (t) { return hay.indexOf(t) !== -1; })) return false;
      }
      return true;
    });
    var s = state.sort;
    list.sort(function (a, b) {
      if (a.vendido !== b.vendido) return a.vendido ? 1 : -1; // vendidas por último
      if (s === "menor") return a.preco - b.preco;
      if (s === "maior") return b.preco - a.preco;
      if (s === "desconto") return B.desconto(b) - B.desconto(a);
      if (s === "decada") return a.decada.localeCompare(b.decada);
      return (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0);
    });
    return list;
  }

  function activeCount() {
    return state.categoria.length + state.tamanho.length + state.decada.length + (state.precoMax < MAXP ? 1 : 0) + (state.disp ? 1 : 0);
  }

  function tag(label, onRemove) {
    var t = B.el("button", { class: "tag-x", type: "button", "aria-label": "Remover filtro " + label }, [label, B.el("span", { "aria-hidden": "true", text: "×" })]);
    t.addEventListener("click", onRemove);
    return t;
  }

  function render() {
    document.querySelectorAll(".chip").forEach(function (c) {
      var on = state[c.getAttribute("data-key")].indexOf(c.getAttribute("data-val")) !== -1;
      c.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $("fPrecoOut").textContent = state.precoMax >= MAXP ? "Qualquer" : "até " + B.fmt(state.precoMax);
    $("fDisp").checked = state.disp;

    var list = filtered();
    var grid = $("grid");
    grid.textContent = "";
    if (!list.length) {
      var clear = B.el("button", { class: "btn", type: "button", text: "Limpar filtros" });
      clear.addEventListener("click", clearAll);
      grid.appendChild(B.el("div", { class: "empty", style: "grid-column:1/-1" }, [
        B.el("h3", { text: "Nenhuma peça por aqui… ainda" }),
        B.el("p", { text: "Tente outros filtros ou fale com a família: chegam novidades toda semana." }),
        clear
      ]));
    } else list.forEach(function (p) { grid.appendChild(B.card(p)); });

    var disp = list.filter(function (p) { return !p.vendido; }).length;
    $("resultCount").textContent = list.length + (list.length === 1 ? " peça" : " peças") + " · " + disp + (disp === 1 ? " disponível" : " disponíveis");

    var tags = $("activeTags");
    tags.textContent = "";
    ["categoria", "tamanho", "decada"].forEach(function (k) {
      state[k].forEach(function (v) { tags.appendChild(tag(v, function () { toggle(k, v); })); });
    });
    if (state.precoMax < MAXP) tags.appendChild(tag("até " + B.fmt(state.precoMax), function () { state.precoMax = MAXP; $("fPreco").value = String(MAXP); render(); }));
    if (state.disp) tags.appendChild(tag("Disponíveis", function () { state.disp = false; render(); }));
    if (state.q.trim()) tags.appendChild(tag("“" + state.q.trim() + "”", function () { state.q = ""; $("q").value = ""; render(); }));

    var n = activeCount();
    $("fCount").textContent = n ? "(" + n + ")" : "";
    B.refreshBag();
    B.reveal(grid);
  }

  function clearAll() {
    state.categoria = []; state.tamanho = []; state.decada = [];
    state.precoMax = MAXP; state.disp = false; state.q = "";
    $("fPreco").value = String(MAXP); $("q").value = "";
    render();
  }

  var qTimer;
  $("q").addEventListener("input", function (e) {
    clearTimeout(qTimer);
    qTimer = setTimeout(function () { state.q = e.target.value.slice(0, 60); render(); }, 120);
  });
  $("sort").addEventListener("change", function (e) { state.sort = e.target.value; render(); });
  $("fPreco").addEventListener("input", function (e) { state.precoMax = Number(e.target.value); render(); });
  $("fDisp").addEventListener("change", function (e) { state.disp = e.target.checked; render(); });
  $("clearAll").addEventListener("click", clearAll);

  var filters = $("filters"), openBtn = $("filtersOpen");
  function setFilters(open) {
    filters.classList.toggle("open", open);
    openBtn.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("lock", open && window.innerWidth < 1000);
    if (!open) openBtn.focus();
  }
  openBtn.addEventListener("click", function () { setFilters(true); });
  $("filtersClose").addEventListener("click", function () { setFilters(false); });
  $("applyFilters").addEventListener("click", function () { setFilters(false); });

  // Parâmetros de URL: ?categoria=, ?q=, ?id=
  var params = new URLSearchParams(location.search);
  var cat = params.get("categoria");
  if (cat && P.some(function (p) { return p.categoria === cat; })) state.categoria.push(cat);
  var q = params.get("q");
  if (q) { state.q = q.slice(0, 60); $("q").value = state.q; }
  render();
  var id = params.get("id");
  if (id && B.byId(id)) B.openProduct(id);
})();
