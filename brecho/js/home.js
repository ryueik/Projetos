/* Página inicial: categorias, peças da semana e números do acervo. */
(function () {
  "use strict";
  var B = window.Brecho;
  if (!B) return;
  var P = B.produtos;

  var anos = document.getElementById("statAnos");
  if (anos) anos.textContent = String(new Date().getFullYear() - 1985);
  var pecas = document.getElementById("statPecas");
  if (pecas) pecas.textContent = String(P.filter(function (p) { return !p.vendido; }).length);

  // Categorias com contagem e capa (primeira peça disponível da categoria)
  var cats = document.getElementById("cats");
  if (cats) {
    var ordem = ["Vestidos", "Feminino", "Masculino", "Jaquetas", "Bolsas", "Sapatos", "Acessórios", "Casa & Louças", "Discos", "Livros"];
    ordem.forEach(function (nome) {
      var itens = P.filter(function (p) { return p.categoria === nome; });
      if (!itens.length) return;
      var capa = itens.filter(function (p) { return !p.vendido; })[0] || itens[0];
      var disp = itens.filter(function (p) { return !p.vendido; }).length;
      cats.appendChild(B.el("a", { class: "cat reveal", href: "produtos.html?categoria=" + encodeURIComponent(nome) }, [
        B.el("img", { src: capa.imagem, alt: "", width: 600, height: 750, loading: "lazy" }),
        B.el("div", { class: "cat-info" }, [B.el("b", { text: nome }), B.el("span", { text: disp + (disp === 1 ? " peça" : " peças") })])
      ]));
    });
  }

  // Peças da semana
  var feat = document.getElementById("featured");
  if (feat) {
    P.filter(function (p) { return p.destaque && !p.vendido; }).slice(0, 8).forEach(function (p) { feat.appendChild(B.card(p)); });
    B.refreshBag();
  }
  B.reveal();
})();
