/* Projetos · tema claro/escuro, cabeçalho/rodapé padrão e animações de entrada.
 *
 * Uso numa página de projeto (pasta de primeiro nível):
 *   <html lang="pt-BR" data-theme="dark">
 *   <script src="../assets/js/theme.js"></script>            (no <head>, sem defer)
 *   <header id="site-header" data-root="../" data-repo="nome-da-pasta"></header>
 *   ...
 *   <footer id="site-footer"></footer>
 */
(function () {
  var KEY = "mm-theme";
  var root = document.documentElement;

  function preferred() {
    try {
      var saved = localStorage.getItem(KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch (e) {}
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem(KEY, theme); } catch (e) {}
  }

  // Aplica antes da pintura para não piscar.
  root.setAttribute("data-theme", preferred());

  var ICONS =
    '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>' +
    '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

  var REPO = "https://github.com/ryueik/Projetos";
  var PORTFOLIO = "https://dev-matheus-macario.vercel.app/";

  function renderHeader(el) {
    var base = el.getAttribute("data-root") || "./";
    var folder = el.getAttribute("data-repo");
    var codeUrl = folder ? REPO + "/tree/main/" + encodeURIComponent(folder).replace(/%2F/g, "/") : REPO;
    el.className = "site-header";
    el.innerHTML =
      '<div class="container">' +
      '<a class="brand" href="' + base + 'index.html" aria-label="Voltar ao painel de projetos">' +
      '<span class="brand-mark">MM</span><span>Projetos</span></a>' +
      '<nav class="nav" aria-label="Principal">' +
      (folder ? '<a href="' + base + 'index.html">← Painel</a>' : "") +
      '<a class="hide-sm" href="' + codeUrl + '" target="_blank" rel="noopener">Código</a>' +
      '<a class="hide-sm" href="' + PORTFOLIO + '" target="_blank" rel="noopener">Portfólio</a>' +
      '<button class="theme-toggle" type="button" aria-label="Alternar tema claro/escuro">' + ICONS + "</button>" +
      "</nav></div>";
  }

  function renderFooter(el) {
    el.className = "site-footer";
    el.innerHTML =
      '<div class="container"><span>© ' + new Date().getFullYear() +
      ' Matheus Macário · Desenvolvedor Web & RPA</span><span>' +
      '<a href="' + PORTFOLIO + '" target="_blank" rel="noopener">Portfólio</a> · ' +
      '<a href="https://github.com/ryueik" target="_blank" rel="noopener">GitHub</a> · ' +
      '<a href="https://www.linkedin.com/in/dev-matheus-macario/" target="_blank" rel="noopener">LinkedIn</a></span></div>';
  }

  function init() {
    if (!document.querySelector('link[rel~="icon"]')) {
      var me = document.querySelector('script[src$="assets/js/theme.js"]');
      var icon = document.createElement("link");
      icon.rel = "icon";
      icon.type = "image/svg+xml";
      icon.href = me ? me.getAttribute("src").replace("js/theme.js", "favicon.svg") : "/assets/favicon.svg";
      document.head.append(icon);
    }
    var h = document.getElementById("site-header");
    if (h && !h.children.length) renderHeader(h);
    var f = document.getElementById("site-footer");
    if (f && !f.children.length) renderFooter(f);

    document.querySelectorAll(".theme-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        apply(root.getAttribute("data-theme") === "light" ? "dark" : "light");
      });
    });

    if (!document.querySelector(".bg-grid")) {
      ["bg-grid", "bg-glow g1", "bg-glow g2"].forEach(function (c) {
        var d = document.createElement("div");
        d.className = c;
        d.setAttribute("aria-hidden", "true");
        document.body.prepend(d);
      });
    }

    var items = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        });
      }, { threshold: 0.12 });
      items.forEach(function (i) { io.observe(i); });
    } else {
      items.forEach(function (i) { i.classList.add("in"); });
    }
  }

  window.MMTheme = { apply: apply, get: function () { return root.getAttribute("data-theme"); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
