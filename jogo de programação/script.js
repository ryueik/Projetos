const instrucoes = [
    { html: "Crie um título <h1> com o texto: 'Meu Primeiro Site'.", css: "Estilize o <h1> para ter a cor azul." },
    { html: "Adicione um parágrafo <p> com uma descrição do site.", css: "Deixe o <p> com a fonte em itálico." },
    { html: "Crie uma lista <ul> com 3 itens sobre seus hobbies.", css: "Adicione uma margem de 20px à lista <ul>." },
    { html: "Insira uma imagem usando a tag <img>.", css: "Deixe a imagem com largura de 200px." },
    { html: "Adicione um botão <button> com o texto 'Clique Aqui'.", css: "Deixe o botão com fundo verde e texto branco." },
    { html: "Crie um link <a> para abrir o Google em nova aba.", css: "Mude a cor do link para roxo." },
    { html: "Crie um título <h2> chamado 'Seção Sobre Mim'.", css: "Centralize o <h2> usando text-align: center." },
    { html: "Adicione dois parágrafos <p> contando mais sobre você.", css: "Deixe os parágrafos com espaçamento de linha de 1.5." },
    { html: "Crie uma lista ordenada <ol> com 3 metas para o futuro.", css: "Deixe os números da lista com cor vermelha." },
    { html: "Crie uma caixa <div> com a classe 'card'.", css: "Estilize a .card com borda preta e sombra leve." },
    { html: "Dentro da div 'card', adicione um título <h3> e um texto <p>.", css: "Deixe o <h3> com cor laranja." },
    { html: "Adicione uma tabela <table> simples com 2 linhas e 2 colunas.", css: "Adicione bordas pretas para a tabela e células." }
  ];
  
  let instrucaoAtual = 0;
  let xp = 0;
  
  const instrucaoHtmlElemento = document.getElementById('instrucaoHtml');
  const instrucaoCssElemento = document.getElementById('instrucaoCss');
  const botaoProxima = document.getElementById('proximaInstrucao');
  const htmlCode = document.getElementById('htmlCode');
  const cssCode = document.getElementById('cssCode');
  const iframe = document.getElementById('output');
  const botaoTestar = document.getElementById('testarCodigo');
  const progressoPreenchido = document.getElementById('progressoPreenchido');
  const xpElemento = document.getElementById('xp');
  const botaoModoEscuro = document.getElementById('modoEscuro');
  
  function atualizarInstrucao() {
    instrucaoHtmlElemento.textContent = instrucoes[instrucaoAtual].html;
    instrucaoCssElemento.textContent = instrucoes[instrucaoAtual].css;
  }
  
  function atualizarProgresso() {
    const progresso = ((instrucaoAtual) / instrucoes.length) * 100;
    progressoPreenchido.style.width = `${progresso}%`;
  }
  
  function atualizarXP() {
    xp += 10; // Cada exercício vale 10 pontos
    xpElemento.textContent = `XP: ${xp}`;
  }
  
  botaoProxima.addEventListener('click', () => {
    if (instrucaoAtual < instrucoes.length - 1) {
      instrucaoAtual++;
      atualizarInstrucao();
      atualizarProgresso();
      htmlCode.value = "";
      cssCode.value = "";
      iframe.srcdoc = "";
      atualizarXP();
    } else {
      alert("Parabéns! Você completou todos os desafios! 🎉🚀");
      atualizarXP();
      atualizarProgresso();
      botaoProxima.disabled = true;
    }
  });
  
  botaoTestar.addEventListener('click', () => {
    const html = htmlCode.value;
    const css = cssCode.value;
    const doc = `
      <html>
      <head><style>${css}</style></head>
      <body>${html}</body>
      </html>
    `;
    iframe.srcdoc = doc;
  });
  
  botaoModoEscuro.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
      botaoModoEscuro.textContent = '☀️ Desativar Modo Escuro';
    } else {
      botaoModoEscuro.textContent = '🌙 Ativar Modo Escuro';
    }
  });
  
  // Inicializar
  atualizarInstrucao();
  atualizarProgresso();
  xpElemento.textContent = `XP: ${xp}`;
  