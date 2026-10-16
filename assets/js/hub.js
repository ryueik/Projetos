/* Projetos · barra de navegação entre projetos.
 *
 * Inclua em QUALQUER página de projeto (funciona com qualquer visual, usa Shadow DOM):
 *   <script src="../assets/js/hub.js" defer></script>
 *
 * Mostra uma barra flutuante com: projeto anterior, painel, portfólio e próximo projeto.
 * A ordem vem de assets/js/catalog.js (só projetos que vivem neste repositório).
 */
(function () {
  if (window.__mmHub) return;
  window.__mmHub = true;

  var me = document.currentScript || document.querySelector('script[src*="assets/js/hub.js"]');
  var base = me ? me.getAttribute("src").replace(/assets\/js\/hub\.js.*$/, "") : "/";
  var PORTFOLIO = "https://dev-matheus-macario.vercel.app/";

  function withCatalog(cb) {
    if (window.PROJECTS) return cb(window.PROJECTS);
    var s = document.createElement("script");
    s.src = base + "assets/js/catalog.js";
    s.onload = function () { cb(window.PROJECTS || []); };
    s.onerror = function () { cb([]); };
    document.head.appendChild(s);
  }

  function currentFolder() {
    var parts = decodeURIComponent(location.pathname).split("/").filter(Boolean);
    // Em file:// o caminho é absoluto; pegamos a pasta logo antes do arquivo atual.
    if (/\.html?$/i.test(parts[parts.length - 1] || "")) parts.pop();
    return parts.length ? parts[parts.length - 1] : "";
  }

  function href(p) {
    return base + p.path.split("/").map(encodeURIComponent).join("/");
  }

  function render(projects) {
    var list = projects.filter(function (p) { return p.path; });
    var folder = currentFolder();
    var idx = list.findIndex(function (p) { return p.path.replace(/\/$/, "") === folder; });
    if (idx === -1) return;
    var prev = list[(idx - 1 + list.length) % list.length];
    var next = list[(idx + 1) % list.length];

    var host = document.createElement("div");
    host.id = "mm-hub";
    var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    var style = document.createElement("style");
    style.textContent = [
      ":host{all:initial}",
      ".bar{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483000;display:flex;align-items:center;gap:4px;padding:6px;border-radius:999px;",
      "background:rgba(14,11,8,.86);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(227,179,65,.35);",
      "box-shadow:0 18px 40px -16px rgba(0,0,0,.6);font:600 13px/1 Inter,system-ui,-apple-system,'Segoe UI',sans-serif;transition:transform .3s ease,opacity .3s ease}",
      ".bar.hide{transform:translate(-50%,140%);opacity:0}",
      "a{display:inline-flex;align-items:center;gap:8px;color:#f5efe4;text-decoration:none;padding:10px 14px;border-radius:999px;white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis}",
      "a:hover,a:focus-visible{background:rgba(255,122,26,.18);color:#ffd27a;outline:none}",
      "a.home{background:linear-gradient(120deg,#e3b341,#ff7a1a 55%,#e63946);color:#1a0f04}",
      "a.home:hover{filter:brightness(1.08);color:#1a0f04}",
      "svg{width:16px;height:16px;flex:none}",
      ".t{overflow:hidden;text-overflow:ellipsis}",
      "@media (max-width:640px){.t{display:none}a{padding:11px}.bar{bottom:12px}}",
      "@media print{.bar{display:none}}"
    ].join("");
    var I = {
      prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
      next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
      grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
      user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>'
    };
    var nav = document.createElement("nav");
    nav.className = "bar";
    nav.setAttribute("aria-label", "Navegação entre projetos");

    function link(cls, url, icon, text, label, after) {
      var a = document.createElement("a");
      a.className = cls; a.href = url; a.setAttribute("aria-label", label); a.title = label;
      var t = document.createElement("span"); t.className = "t"; t.textContent = text;
      var ic = document.createElement("span"); ic.style.display = "inline-flex"; ic.innerHTML = icon; // ícones fixos, não vêm de dados
      if (after) a.append(t, ic); else a.append(ic, t);
      if (url.indexOf("http") === 0) { a.target = "_blank"; a.rel = "noopener"; }
      return a;
    }
    nav.append(
      link("", href(prev), I.prev, prev.title, "Projeto anterior: " + prev.title),
      link("home", base + "index.html", I.grid, "Todos os projetos", "Voltar ao painel de projetos"),
      link("", PORTFOLIO, I.user, "Portfólio", "Abrir o portfólio de Matheus Macário"),
      link("", href(next), I.next, next.title, "Próximo projeto: " + next.title, true)
    );
    root.append(style, nav);
    document.body.appendChild(host);

    // Esconde ao rolar para baixo, mostra ao rolar para cima (não atrapalha formulários no celular).
    var last = window.scrollY;
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      nav.classList.toggle("hide", y > last + 4 && y > 200);
      if (y < last - 4) nav.classList.remove("hide");
      last = y;
    }, { passive: true });
    // Garante espaço para a barra no fim da página.
    document.body.style.paddingBottom = "max(" + (getComputedStyle(document.body).paddingBottom || "0px") + ", 84px)";
  }

  function start() { withCatalog(render); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
