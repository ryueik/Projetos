/* TechBlack · catálogo com filtros, busca e ordenação (estado refletido na URL) */
(function () {
  "use strict";
  var TB = window.TB, el = TB.el;
  var cats = TB.categorias();
  var $ = function (id) { return document.getElementById(id); };

  var params = new URLSearchParams(location.search);
  var state = {
    cat: cats[params.get("cat")] ? params.get("cat") : "",
    q: params.get("q") || "",
    min: params.get("min") || "",
    max: params.get("max") || "",
    ordem: params.get("ordem") || "relevancia",
    ofertas: params.get("ofertas") === "1",
    estoque: params.get("estoque") === "1",
  };

  // Categorias (rádios com contagem)
  var all = TB.produtos();
  var list = $("cat-list");
  [["", "Todas"]].concat(Object.keys(cats).map(function (k) { return [k, cats[k]]; })).forEach(function (c) {
    var n = c[0] ? all.filter(function (p) { return p.categoria === c[0]; }).length : all.length;
    var input = el("input", { type: "radio", name: "cat", value: c[0] });
    input.checked = state.cat === c[0];
    input.addEventListener("change", function () { state.cat = c[0]; update(); });
    list.appendChild(el("label", null, [input, el("span", { text: c[1] }), el("small", { text: String(n) })]));
  });

  $("busca").value = state.q;
  $("pmin").value = state.min;
  $("pmax").value = state.max;
  $("ordem").value = state.ordem;
  $("f-ofertas").checked = state.ofertas;
  $("f-estoque").checked = state.estoque;

  var t;
  $("busca").addEventListener("input", function (e) { clearTimeout(t); t = setTimeout(function () { state.q = e.target.value; update(); }, 180); });
  $("pmin").addEventListener("input", function (e) { state.min = e.target.value; update(); });
  $("pmax").addEventListener("input", function (e) { state.max = e.target.value; update(); });
  $("ordem").addEventListener("change", function (e) { state.ordem = e.target.value; update(); });
  $("f-ofertas").addEventListener("change", function (e) { state.ofertas = e.target.checked; update(); });
  $("f-estoque").addEventListener("change", function (e) { state.estoque = e.target.checked; update(); });
  document.querySelectorAll("#price-chips .chip").forEach(function (b) {
    b.addEventListener("click", function () {
      var same = state.min === b.dataset.min && state.max === b.dataset.max;
      state.min = same ? "" : b.dataset.min;
      state.max = same ? "" : b.dataset.max;
      $("pmin").value = state.min; $("pmax").value = state.max;
      update();
    });
  });
  $("clear-all").addEventListener("click", clearAll);

  // Gaveta de filtros no mobile
  var drawer = $("filters"), scrim = $("scrim"), openBtn = $("filters-open");
  function setDrawer(open) {
    drawer.classList.toggle("open", open);
    scrim.hidden = !open;
    openBtn.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
    if (open) $("filters-close").focus(); else openBtn.focus();
  }
  openBtn.addEventListener("click", function () { setDrawer(true); });
  $("filters-close").addEventListener("click", function () { setDrawer(false); });
  scrim.addEventListener("click", function () { setDrawer(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && drawer.classList.contains("open")) setDrawer(false); });

  if (location.hash === "#busca") setTimeout(function () { $("busca").focus(); }, 50);

  function clearAll() {
    state = { cat: "", q: "", min: "", max: "", ordem: "relevancia", ofertas: false, estoque: false };
    $("busca").value = ""; $("pmin").value = ""; $("pmax").value = ""; $("ordem").value = "relevancia";
    $("f-ofertas").checked = false; $("f-estoque").checked = false;
    list.querySelector('input[value=""]').checked = true;
    update();
  }

  function norm(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  function filtered() {
    var q = norm(state.q.trim());
    var min = parseFloat(state.min), max = parseFloat(state.max);
    var out = TB.produtos().filter(function (p) {
      if (state.cat && p.categoria !== state.cat) return false;
      if (!isNaN(min) && p.preco < min) return false;
      if (!isNaN(max) && p.preco > max) return false;
      if (state.ofertas && !p.precoAntigo) return false;
      if (state.estoque && p.estoque <= 0) return false;
      if (q) {
        var hay = norm([p.nome, p.categoriaNome, p.descricao, p.specs.join(" ")].join(" "));
        return q.split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
      }
      return true;
    });
    var sorters = {
      relevancia: function (a, b) { return (b.destaque - a.destaque) || (b.avaliacoes - a.avaliacoes); },
      menor: function (a, b) { return a.preco - b.preco; },
      maior: function (a, b) { return b.preco - a.preco; },
      avaliacao: function (a, b) { return b.avaliacao - a.avaliacao || b.avaliacoes - a.avaliacoes; },
      desconto: function (a, b) { return TB.desconto(b) - TB.desconto(a); },
      nome: function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); },
    };
    return out.sort(sorters[state.ordem] || sorters.relevancia);
  }

  function syncUrl() {
    var p = new URLSearchParams();
    if (state.cat) p.set("cat", state.cat);
    if (state.q) p.set("q", state.q);
    if (state.min) p.set("min", state.min);
    if (state.max) p.set("max", state.max);
    if (state.ordem !== "relevancia") p.set("ordem", state.ordem);
    if (state.ofertas) p.set("ofertas", "1");
    if (state.estoque) p.set("estoque", "1");
    var qs = p.toString();
    try { history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "")); } catch (e) {}
  }

  function activeChips() {
    var chips = [];
    function chip(label, fn) {
      chips.push(el("button", { class: "chip chip-x active", type: "button", "aria-label": "Remover filtro " + label, onclick: fn }, [label, el("span", { html: TB.I.close, style: "display:inline-grid;width:12px;height:12px" })]));
    }
    if (state.cat) chip(cats[state.cat], function () { state.cat = ""; list.querySelector('input[value=""]').checked = true; update(); });
    if (state.q) chip("“" + state.q + "”", function () { state.q = ""; $("busca").value = ""; update(); });
    if (state.min || state.max) chip((state.min ? TB.money(+state.min) : "R$ 0") + " – " + (state.max ? TB.money(+state.max) : "∞"), function () { state.min = state.max = ""; $("pmin").value = $("pmax").value = ""; update(); });
    if (state.ofertas) chip("Ofertas", function () { state.ofertas = false; $("f-ofertas").checked = false; update(); });
    if (state.estoque) chip("Em estoque", function () { state.estoque = false; $("f-estoque").checked = false; update(); });
    return chips;
  }

  function update() {
    syncUrl();
    var items = filtered();
    var title = state.ofertas && !state.cat ? "Ofertas" : state.cat ? cats[state.cat] : "Catálogo";
    $("page-title").textContent = title;
    $("crumb-cur").textContent = title;
    document.title = title + " · TechBlack";
    document.querySelectorAll("#price-chips .chip").forEach(function (b) {
      b.classList.toggle("active", state.min === b.dataset.min && state.max === b.dataset.max && (state.min || state.max));
    });

    var info = $("result-info");
    info.textContent = "";
    info.appendChild(el("span", null, [el("strong", { text: String(items.length) }), items.length === 1 ? " produto encontrado" : " produtos encontrados"]));
    activeChips().forEach(function (c) { info.appendChild(c); });

    var grid = $("grid");
    grid.textContent = "";
    if (!items.length) {
      grid.appendChild(el("div", { class: "empty", style: "grid-column:1/-1" }, [
        el("span", { html: TB.I.box }),
        el("h3", { text: "Nenhum produto encontrado" }),
        el("p", { text: "Tente outra busca ou remova alguns filtros." }),
        el("button", { class: "btn btn-primary", type: "button", text: "Limpar filtros", onclick: clearAll }),
      ]));
      return;
    }
    items.forEach(function (p) { grid.appendChild(TB.productCard(p)); });
    TB.reveal(grid);
  }

  update();
})();
