/* ============================================================
   CodeQuest — Lógica do jogo
   Autor: Matheus Macário
   Descrição: Jogo de desafios de programação Web (HTML, CSS, JS)
              com pontuação, vidas, timer e high score em localStorage.
   ============================================================ */

'use strict';

/* ============================================================
   1) CONFIGURAÇÕES GLOBAIS
   ============================================================ */
const CONFIG = Object.freeze({
  timePerQuestion:     30,        // segundos por desafio
  maxLives:            3,         // vidas iniciais
  pointsPerCorrect:    100,       // pontos base por acerto
  timeBonusPerSecond:  5,         // bônus por segundo restante
  storageKey:          'codequest:highscore',
  maxHighScore:        999999
});

/* ============================================================
   2) BANCO DE DESAFIOS
   Cada desafio possui:
     - tech:     'HTML' | 'CSS' | 'JS'
     - diff:     'Fácil' | 'Médio' | 'Difícil'
     - file:     nome do arquivo exibido no editor
     - question: enunciado
     - code:     trecho de código exibido
     - options:  array de alternativas
     - correct:  índice da alternativa correta
     - explain:  explicação didática (feedback)
   ============================================================ */
const CHALLENGES = [
  /* ---------------------- 01 · HTML ---------------------- */
  {
    tech: 'HTML',
    diff: 'Fácil',
    file: 'index.html',
    question: 'Qual tag semântica deve envolver o menu principal de navegação de um site?',
    code: `<!-- Estrutura de um site -->
<header>...</header>

<!-- ??? -->

  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/sobre">Sobre</a></li>
  </ul>

<!-- ??? -->`,
    options: [
      '<div>',
      '<nav>',
      '<menu>',
      '<section>'
    ],
    correct: 1,
    explain:
      'A tag <nav> é o elemento semântico do HTML5 destinado a blocos de navegação. ' +
      'Ela informa ao navegador e a leitores de tela que aquele trecho contém links de navegação. ' +
      '<div> funciona visualmente, mas não carrega significado semântico.'
  },

  /* ---------------------- 02 · HTML ---------------------- */
  {
    tech: 'HTML',
    diff: 'Fácil',
    file: 'index.html',
    question: 'Qual atributo descreve o conteúdo de uma imagem para leitores de tela?',
    code: `<img src="logo.png" ???="Logo da empresa" />`,
    options: [
      'title',
      'alt',
      'aria-label',
      'description'
    ],
    correct: 1,
    explain:
      'O atributo alt é o padrão para descrever imagens e é lido por leitores de tela ' +
      'quando a imagem não carrega. aria-label também funciona, mas alt é o atributo ' +
      'nativo e obrigatório para acessibilidade em <img>.'
  },

  /* ----------------------- 03 · CSS ----------------------- */
  {
    tech: 'CSS',
    diff: 'Fácil',
    file: 'styles.css',
    question: 'Como centralizar um elemento nos eixos horizontal E vertical com Flexbox?',
    code: `.container {
  display: flex;
  /* ??? */
}`,
    options: [
      'justify-content: center;',
      'align-items: center;',
      'justify-content: center;\nalign-items: center;',
      'text-align: center;\nvertical-align: middle;'
    ],
    correct: 2,
    explain:
      'justify-content controla o eixo principal (horizontal, por padrão) e ' +
      'align-items controla o eixo transversal (vertical). É preciso usar os dois ' +
      'para centralizar completamente.'
  },

  /* ----------------------- 04 · CSS ----------------------- */
  {
    tech: 'CSS',
    diff: 'Médio',
    file: 'styles.css',
    question:
      'Qual valor de position posiciona o elemento em relação ao ancestral mais próximo com position diferente de static?',
    code: `.parent { position: relative; }

.child  {
  position: ???;
  top: 10px;
  left: 20px;
}`,
    options: [
      'static',
      'fixed',
      'absolute',
      'sticky'
    ],
    correct: 2,
    explain:
      'position: absolute remove o elemento do fluxo e o posiciona em relação ao ' +
      'ancestral mais próximo que tenha position diferente de static. ' +
      'fixed se posiciona em relação à viewport e sticky se comporta como relative ' +
      'até atingir um limiar de rolagem.'
  },

  /* ----------------------- 05 · CSS ----------------------- */
  {
    tech: 'CSS',
    diff: 'Médio',
    file: 'styles.css',
    question: 'Qual propriedade CSS Grid cria exatamente 3 colunas de tamanhos iguais?',
    code: `.grid {
  display: grid;
  /* ??? */
}`,
    options: [
      'grid-template-columns: repeat(3, 1fr);',
      'grid-template-rows: repeat(3, 1fr);',
      'flex: 3;',
      'columns: 3;'
    ],
    correct: 0,
    explain:
      'grid-template-columns define as colunas da grade e repeat(3, 1fr) cria 3 ' +
      'colunas iguais (1fr = 1 fração do espaço disponível). ' +
      'grid-template-rows criaria linhas, não colunas.'
  },

  /* ------------------------ 06 · JS ------------------------ */
  {
    tech: 'JS',
    diff: 'Fácil',
    file: 'script.js',
    question: 'Qual é a saída do código abaixo?',
    code: `const nums = [1, 2, 3, 4];
const result = nums.map(n => n * 2);

console.log(result);`,
    options: [
      '[1, 2, 3, 4]',
      '[2, 4, 6, 8]',
      '10',
      '[1, 4, 9, 16]'
    ],
    correct: 1,
    explain:
      'map() percorre o array e retorna um NOVO array com o resultado da função ' +
      'aplicada a cada elemento. Multiplicando cada item por 2, obtemos [2, 4, 6, 8]. ' +
      'O array original permanece intacto.'
  },

  /* ------------------------ 07 · JS ------------------------ */
  {
    tech: 'JS',
    diff: 'Médio',
    file: 'script.js',
    question: 'Qual é a saída do código abaixo?',
    code: `const nums = [1, 2, 3, 4, 5];
const result = nums.filter(n => n % 2 === 0);

console.log(result);`,
    options: [
      '[1, 3, 5]',
      '[2, 4]',
      '[1, 2, 3, 4, 5]',
      '2'
    ],
    correct: 1,
    explain:
      'filter() cria um novo array apenas com os elementos que passam no teste. ' +
      'A condição n % 2 === 0 mantém somente os números pares: 2 e 4.'
  },

  /* ------------------------ 08 · JS ------------------------ */
  {
    tech: 'JS',
    diff: 'Médio',
    file: 'script.js',
    question: 'Qual é a saída do código abaixo?',
    code: `const nums = [1, 2, 3, 4];
const sum = nums.reduce((acc, n) => acc + n, 0);

console.log(sum);`,
    options: [
      '10',
      '24',
      '"1234"',
      '[1, 2, 3, 4]'
    ],
    correct: 0,
    explain:
      'reduce() acumula os valores do array em um único resultado. ' +
      'Começando em 0 e somando 1 + 2 + 3 + 4, obtemos 10. ' +
      'Se o valor inicial fosse omitido, o primeiro elemento seria usado como acumulador.'
  },

  /* ------------------------ 09 · JS ------------------------ */
  {
    tech: 'JS',
    diff: 'Difícil',
    file: 'script.js',
    question: 'Qual é a saída do código abaixo?',
    code: `console.log(typeof null);
console.log(null == undefined);
console.log(null === undefined);`,
    options: [
      '"object", true, false',
      '"null", true, true',
      '"object", false, false',
      '"undefined", true, false'
    ],
    correct: 0,
    explain:
      'typeof null retorna "object" — um bug histórico do JavaScript mantido por ' +
      'compatibilidade. O operador == faz coerção e considera null == undefined ' +
      'verdadeiro, mas === compara tipo e valor, então retorna false.'
  },

  /* ------------------------ 10 · JS ------------------------ */
  {
    tech: 'JS',
    diff: 'Difícil',
    file: 'script.js',
    question: 'Qual é a saída do código abaixo?',
    code: `for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}`,
    options: [
      '0, 1, 2',
      '3, 3, 3',
      '0, 0, 0',
      'Gera um erro de sintaxe'
    ],
    correct: 1,
    explain:
      'var tem escopo de função, então todos os callbacks do setTimeout capturam a ' +
      'MESMA variável i, que vale 3 quando o loop termina. Por isso imprime 3, 3, 3. ' +
      'Usando let (escopo de bloco), a saída seria 0, 1, 2.'
  }
];

/* ============================================================
   3) ESTADO DO JOGO
   ============================================================ */
const state = {
  currentIndex: 0,                    // índice do desafio atual
  score:        0,                    // pontuação da partida
  lives:        CONFIG.maxLives,      // vidas restantes
  hits:         0,                    // acertos
  highScore:    0,                    // recorde carregado do localStorage
  canAnswer:    false,                // trava para evitar duplo clique
  timerId:      null,                 // id do setInterval do timer
  timeLeft:     CONFIG.timePerQuestion
};

/* ============================================================
   4) REFERÊNCIAS DO DOM
   ============================================================ */
const dom = {
  // HUD
  levelValue:      document.getElementById('levelValue'),
  scoreValue:      document.getElementById('scoreValue'),
  highScoreValue:  document.getElementById('highScoreValue'),
  livesValue:      document.getElementById('livesValue'),

  // Desafio
  techBadge:        document.getElementById('techBadge'),
  diffBadge:        document.getElementById('diffBadge'),
  challengeCounter: document.getElementById('challengeCounter'),
  questionText:     document.getElementById('questionText'),
  editorFile:       document.getElementById('editorFile'),
  codeBlock:        document.getElementById('codeBlock'),
  optionsList:      document.getElementById('optionsList'),

  // Timer
  timerFill: document.getElementById('timerFill'),
  timerText: document.getElementById('timerText'),

  // Console
  consoleBody:    document.getElementById('consoleBody'),
  consoleActions: document.getElementById('consoleActions'),

  // Modal
  modal:        document.getElementById('modal'),
  modalIcon:    document.getElementById('modalIcon'),
  modalTitle:   document.getElementById('modalTitle'),
  modalText:    document.getElementById('modalText'),
  modalScore:   document.getElementById('modalScore'),
  modalHits:    document.getElementById('modalHits'),
  modalHigh:    document.getElementById('modalHigh'),
  playAgainBtn: document.getElementById('playAgainBtn'),

  // Rodapé
  year: document.getElementById('year')
};

/* ============================================================
   5) UTILITÁRIOS
   ============================================================ */

/**
 * Escapa caracteres HTML perigosos para exibição segura.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Aplica realce de sintaxe simples (comentários, strings, keywords,
 * built-ins e números) no código exibido no editor.
 * @param {string} code
 * @returns {string} HTML seguro com spans coloridos
 */
function highlight(code) {
  const escaped = escapeHtml(code);

  // Regex única com grupos alternados para evitar sobreposição
  const pattern = new RegExp(
    [
      '(\\/\\/[^\\n]*)',                                          // 1: comentário //
      '("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\'|`(?:[^`\\\\]|\\\\.)*`)', // 2: strings
      '\\b(const|let|var|function|return|if|else|for|while|new|class|import|export|from|async|await|try|catch|of|in|typeof|instanceof|this)\\b', // 3: keywords
      '\\b(document|window|console|Array|Object|Math|JSON|Promise|Date|RegExp|Map|Set|Number|String|Boolean)\\b', // 4: built-ins
      '\\b(\\d+(?:\\.\\d+)?)\\b'                                  // 5: números
    ].join('|'),
    'g'
  );

  return escaped.replace(pattern, (match, comment, str, keyword, builtin, num) => {
    if (comment !== undefined) return `<span class="tok-comment">${comment}</span>`;
    if (str     !== undefined) return `<span class="tok-string">${str}</span>`;
    if (keyword !== undefined) return `<span class="tok-keyword">${keyword}</span>`;
    if (builtin !== undefined) return `<span class="tok-builtin">${builtin}</span>`;
    if (num     !== undefined) return `<span class="tok-number">${num}</span>`;
    return match;
  });
}

/**
 * Formata números com separador de milhar (pt-BR).
 * @param {number} n
 * @returns {string}
 */
function formatNumber(n) {
  return new Intl.NumberFormat('pt-BR').format(n);
}

/* ============================================================
   6) PERSISTÊNCIA (localStorage)
   ============================================================ */

/** Carrega o high score salvo no navegador. */
function loadHighScore() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    const parsed = parseInt(raw, 10);
    state.highScore = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    state.highScore = 0;
  }
}

/** Salva o high score se a pontuação atual for maior. */
function saveHighScore() {
  if (state.score > state.highScore) {
    state.highScore = Math.min(state.score, CONFIG.maxHighScore);
    try {
      localStorage.setItem(CONFIG.storageKey, String(state.highScore));
    } catch {
      /* localStorage indisponível — segue o jogo normalmente */
    }
  }
}

/* ============================================================
   7) RENDERIZAÇÃO DO HUD
   ============================================================ */
function updateHUD() {
  dom.levelValue.textContent     = String(state.currentIndex + 1);
  dom.scoreValue.textContent     = formatNumber(state.score);
  dom.highScoreValue.textContent = formatNumber(state.highScore);
  dom.livesValue.textContent     = state.lives > 0 ? '♥'.repeat(state.lives) : '—';
}

/* ============================================================
   8) CONSOLE (feedback)
   ============================================================ */

/**
 * Adiciona uma mensagem ao console.
 * @param {'info'|'success'|'error'|'warn'} type
 * @param {string} html
 */
function addConsoleMessage(type, html) {
  const el = document.createElement('div');
  el.className = `console__msg console__msg--${type}`;
  el.innerHTML = html;
  dom.consoleBody.appendChild(el);
  dom.consoleBody.scrollTop = dom.consoleBody.scrollHeight;
}

/** Limpa todas as mensagens do console. */
function clearConsole() {
  dom.consoleBody.innerHTML = '';
}

/** Limpa a área de ações do console. */
function clearConsoleActions() {
  dom.consoleActions.innerHTML = '';
}

/* ============================================================
   9) TEMPORIZADOR
   ============================================================ */

/** Inicia o contador regressivo da pergunta atual. */
function startTimer() {
  stopTimer();

  const duration = CONFIG.timePerQuestion * 1000;
  const start    = Date.now();

  state.timeLeft = CONFIG.timePerQuestion;

  // Reinicia a barra sem animação para depois animar até 0
  dom.timerFill.style.transition = 'none';
  dom.timerFill.style.width      = '100%';
  dom.timerFill.classList.remove('timer__fill--danger');
  void dom.timerFill.offsetWidth; // força reflow
  dom.timerFill.style.transition = `width ${duration}ms linear`;
  dom.timerFill.style.width      = '0%';

  dom.timerText.textContent = `${CONFIG.timePerQuestion}s`;

  state.timerId = setInterval(() => {
    const elapsed   = Date.now() - start;
    const remaining = Math.max(0, CONFIG.timePerQuestion - elapsed / 1000);

    state.timeLeft = remaining;
    dom.timerText.textContent = `${Math.ceil(remaining)}s`;

    if (remaining <= 10) {
      dom.timerFill.classList.add('timer__fill--danger');
    }

    if (remaining <= 0) {
      stopTimer();
      resolveAnswer(null); // tempo esgotado = resposta nula
    }
  }, 100);
}

/** Para o temporizador. */
function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

/* ============================================================
   10) RENDERIZAÇÃO DO DESAFIO
   ============================================================ */

/** Renderiza o desafio atual no painel. */
function renderChallenge() {
  const challenge = CHALLENGES[state.currentIndex];
  const total     = CHALLENGES.length;

  // Metadados
  dom.techBadge.textContent   = challenge.tech;
  dom.techBadge.dataset.tech  = challenge.tech;

  dom.diffBadge.textContent   = challenge.diff;
  dom.diffBadge.dataset.diff  = challenge.diff;

  dom.challengeCounter.textContent =
    `Desafio ${String(state.currentIndex + 1).padStart(2, '0')} / ${total}`;

  // Enunciado e editor
  dom.questionText.textContent = challenge.question;
  dom.editorFile.textContent   = challenge.file;
  dom.codeBlock.innerHTML      = highlight(challenge.code);

  // Alternativas
  renderOptions(challenge);

  // Libera respostas
  state.canAnswer = true;
}

/**
 * Cria os botões das alternativas.
 * @param {object} challenge
 */
function renderOptions(challenge) {
  dom.optionsList.innerHTML = '';

  challenge.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'option';
    btn.dataset.index = String(i);

    const key  = document.createElement('span');
    key.className = 'option__key';
    key.textContent = String(i + 1);

    const text = document.createElement('span');
    text.className = 'option__text';
    text.textContent = opt;

    btn.append(key, text);
    btn.addEventListener('click', () => resolveAnswer(i));

    dom.optionsList.appendChild(btn);
  });
}

/* ============================================================
   11) RESOLUÇÃO DA RESPOSTA
   ============================================================ */

/**
 * Processa a resposta do jogador.
 * @param {number|null} selectedIndex - índice escolhido ou null (timeout)
 */
function resolveAnswer(selectedIndex) {
  if (!state.canAnswer) return;
  state.canAnswer = false;

  stopTimer();

  const challenge = CHALLENGES[state.currentIndex];
  const isCorrect = selectedIndex !== null && selectedIndex === challenge.correct;

  // Marca visualmente as alternativas
  const optionEls = dom.optionsList.querySelectorAll('.option');
  optionEls.forEach((el, i) => {
    el.classList.add('option--disabled');

    if (i === challenge.correct) {
      el.classList.add('option--correct');
    }
    if (selectedIndex !== null && i === selectedIndex && !isCorrect) {
      el.classList.add('option--wrong');
    }
  });

  if (isCorrect) {
    handleCorrect(challenge);
  } else {
    handleWrong(challenge, selectedIndex === null);
  }

  renderActionButton();
}

/**
 * Trata acerto: pontua, atualiza HUD e mostra feedback positivo.
 * @param {object} challenge
 */
function handleCorrect(challenge) {
  const timeBonus = Math.round(state.timeLeft * CONFIG.timeBonusPerSecond);
  const gained    = CONFIG.pointsPerCorrect + timeBonus;

  state.score += gained;
  state.hits  += 1;

  updateHUD();
  saveHighScore();
  updateHUD(); // reflete o novo high score, se houver

  // Pontuação flutuante
  showPointsFloat(`+${gained}`);

  addConsoleMessage(
    'success',
    `<strong>✔ Correto!</strong> +${gained} pts ` +
    `<em>(${CONFIG.pointsPerCorrect} base + ${timeBonus} bônus de tempo)</em><br>` +
    `<span style="color:var(--text-muted)">${escapeHtml(challenge.explain)}</span>`
  );
}

/**
 * Trata erro ou timeout: desconta vida e mostra explicação didática.
 * @param {object} challenge
 * @param {boolean} isTimeout
 */
function handleWrong(challenge, isTimeout) {
  state.lives = Math.max(0, state.lives - 1);
  updateHUD();

  const titulo = isTimeout ? '⏱ Tempo esgotado!' : '✖ Resposta incorreta.';

  addConsoleMessage(
    'error',
    `<strong>${titulo}</strong> Você perdeu 1 vida.<br>` +
    `<em>Resposta correta:</em> <code>${escapeHtml(challenge.options[challenge.correct])}</code><br>` +
    `<span style="color:var(--text-muted)">${escapeHtml(challenge.explain)}</span>`
  );
}

/** Cria o elemento flutuante de pontos. */
function showPointsFloat(text) {
  const el = document.createElement('div');
  el.className = 'points-float';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

/* ============================================================
   12) FLUXO DO JOGO
   ============================================================ */

/** Carrega o desafio do índice atual e inicia o timer. */
function loadChallenge() {
  clearConsole();
  clearConsoleActions();

  const total = CHALLENGES.length;
  const num   = String(state.currentIndex + 1).padStart(2, '0');

  addConsoleMessage(
    'info',
    `<strong>▶ Desafio ${num} / ${total}</strong><br>` +
    `Analise o código e escolha a alternativa correta.`
  );

  renderChallenge();
  updateHUD();
  startTimer();
}

/**
 * Renderiza o botão de ação após responder.
 * Dependendo do estado, avança, ou finaliza o jogo.
 */
function renderActionButton() {
  clearConsoleActions();

  const isLast     = state.currentIndex >= CHALLENGES.length - 1;
  const noLives    = state.lives <= 0;

  const btn = document.createElement('button');
  btn.type      = 'button';
  btn.className = 'btn btn--primary';

  if (noLives) {
    btn.textContent = 'Ver resultado';
    btn.addEventListener('click', () => endGame('gameover'));
  } else if (isLast) {
    btn.textContent = 'Ver resultado final';
    btn.addEventListener('click', () => endGame('completed'));
  } else {
    btn.textContent = 'Próximo desafio →';
    btn.addEventListener('click', nextChallenge);
  }

  dom.consoleActions.appendChild(btn);
}

/** Avança para o próximo desafio. */
function nextChallenge() {
  state.currentIndex += 1;
  loadChallenge();
}

/**
 * Finaliza a partida e exibe o modal.
 * @param {'completed'|'gameover'} reason
 */
function endGame(reason) {
  stopTimer();
  state.canAnswer = false;

  // Garante que o recorde seja persistido
  saveHighScore();
  updateHUD();

  const total = CHALLENGES.length;

  if (reason === 'completed') {
    dom.modalIcon.textContent  = '🏆';
    dom.modalTitle.textContent = 'Parabéns, dev!';
    dom.modalText.textContent  =
      `Você concluiu todos os ${total} desafios do CodeQuest.`;
  } else {
    dom.modalIcon.textContent  = '💀';
    dom.modalTitle.textContent = 'Game Over';
    dom.modalText.textContent  =
      'Suas vidas acabaram. Tente novamente e bata seu recorde!';
  }

  dom.modalScore.textContent = formatNumber(state.score);
  dom.modalHits.textContent  = `${state.hits}/${total}`;
  dom.modalHigh.textContent  = formatNumber(state.highScore);

  openModal();
}

/* ============================================================
   13) MODAL
   ============================================================ */
function openModal() {
  dom.modal.classList.add('modal--open');
  dom.modal.setAttribute('aria-hidden', 'false');
  // Foco no botão principal para acessibilidade
  setTimeout(() => dom.playAgainBtn.focus(), 250);
}

function closeModal() {
  dom.modal.classList.remove('modal--open');
  dom.modal.setAttribute('aria-hidden', 'true');
}

/* ============================================================
   14) REINÍCIO
   ============================================================ */
function resetGame() {
  closeModal();
  stopTimer();

  state.currentIndex = 0;
  state.score        = 0;
  state.lives        = CONFIG.maxLives;
  state.hits         = 0;
  state.canAnswer    = false;

  // Recarrega o high score (pode ter mudado em outra aba)
  loadHighScore();

  dom.timerFill.classList.remove('timer__fill--danger');
  dom.timerFill.style.transition = 'none';
  dom.timerFill.style.width      = '100%';

  updateHUD();
  loadChallenge();
}

/* ============================================================
   15) ATALHOS DE TECLADO
   ============================================================ */
function handleKeyboard(e) {
  if (!state.canAnswer) return;

  const key = e.key;
  if (key >= '1' && key <= '4') {
    const index = parseInt(key, 10) - 1;
    const btn   = dom.optionsList.querySelector(`.option[data-index="${index}"]`);
    if (btn) btn.click();
  }
}

/* ============================================================
   16) INICIALIZAÇÃO
   ============================================================ */
function init() {
  // Ano dinâmico no rodapé
  dom.year.textContent = String(new Date().getFullYear());

  // Carrega recorde salvo
  loadHighScore();
  updateHUD();

  // Eventos
  dom.playAgainBtn.addEventListener('click', resetGame);
  document.addEventListener('keydown', handleKeyboard);

  // Fecha o modal com ESC (quando aberto)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.modal.classList.contains('modal--open')) {
      // Não fecha o modal de fim de jogo sem ação — apenas previne scroll
      e.preventDefault();
    }
  });

  // Inicia o jogo
  loadChallenge();
}

// Aguarda o DOM estar pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
