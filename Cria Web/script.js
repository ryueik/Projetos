/* CriaWeb — interações da landing page */
(function () {
  'use strict';

  var WHATSAPP = '5512974117747';
  var EMAIL = 'criawebdev@gmail.com';
  var root = document.documentElement;

  /* ---------- Tema claro/escuro ---------- */
  var themeBtn = document.getElementById('theme-toggle');
  themeBtn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('criaweb-theme', next); } catch (e) { /* sem storage */ }
  });

  /* ---------- Menu mobile ---------- */
  var menuBtn = document.getElementById('menu-toggle');
  var menu = document.getElementById('menu');
  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }
  menuBtn.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Cabeçalho com borda ao rolar ---------- */
  var topbar = document.querySelector('.topbar');
  function onScroll() { topbar.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Animações de entrada ---------- */
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Ano no rodapé ---------- */
  document.getElementById('ano').textContent = String(new Date().getFullYear());

  /* ---------- Formulário de contato ---------- */
  var form = document.getElementById('contact-form');
  var status = document.getElementById('form-status');
  var tipo = document.getElementById('tipo');
  var mensagem = document.getElementById('mensagem');

  // Botões "Quero este plano" preenchem o formulário
  document.querySelectorAll('[data-plano]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var plano = btn.getAttribute('data-plano');
      if (plano === 'Loja virtual') tipo.value = 'Loja virtual';
      else if (plano === 'Essencial') tipo.value = 'Landing page';
      else tipo.value = 'Site institucional';
      if (!mensagem.value.trim()) mensagem.value = 'Olá! Tenho interesse no plano ' + plano + '.';
      document.getElementById('contato').scrollIntoView({ behavior: 'smooth' });
      setTimeout(function () { document.getElementById('nome').focus({ preventScroll: true }); }, 500);
    });
  });

  var rules = {
    nome: function (v) { return v.length >= 2 ? '' : 'Informe seu nome (mínimo 2 letras).'; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Informe um e-mail válido.'; },
    telefone: function (v) {
      if (!v) return '';
      var d = v.replace(/\D/g, '');
      return d.length >= 10 && d.length <= 13 ? '' : 'Telefone inválido — use DDD + número.';
    },
    tipo: function (v) { return v ? '' : 'Selecione o tipo de projeto.'; },
    mensagem: function (v) { return v.length >= 10 ? '' : 'Escreva pelo menos 10 caracteres.'; }
  };

  function validateField(input) {
    var rule = rules[input.name];
    if (!rule) return true;
    var msg = rule(input.value.trim());
    var field = input.closest('.field');
    field.classList.toggle('is-invalid', !!msg);
    field.querySelector('.field__error').textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }

  Object.keys(rules).forEach(function (name) {
    var input = form.elements[name];
    input.addEventListener('blur', function () { validateField(input); });
    input.addEventListener('input', function () {
      if (input.closest('.field').classList.contains('is-invalid')) validateField(input);
    });
  });

  // Máscara simples de telefone
  var tel = document.getElementById('telefone');
  tel.addEventListener('input', function () {
    var d = tel.value.replace(/\D/g, '').slice(0, 11);
    var out = d;
    if (d.length > 2) out = '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length > 7) out = '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4);
    tel.value = out;
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var canal = (e.submitter && e.submitter.getAttribute('data-canal')) || 'whatsapp';
    var ok = true, firstBad = null;
    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      if (!validateField(input)) { ok = false; if (!firstBad) firstBad = input; }
    });
    if (!ok) {
      status.className = 'form__status';
      status.textContent = 'Confira os campos destacados.';
      firstBad.focus();
      return;
    }

    var v = function (n) { return form.elements[n].value.trim(); };
    var texto =
      'Olá, CriaWeb! Quero um site.\n\n' +
      'Nome: ' + v('nome') + '\n' +
      'E-mail: ' + v('email') + '\n' +
      (v('telefone') ? 'WhatsApp: ' + v('telefone') + '\n' : '') +
      'Tipo de projeto: ' + v('tipo') + '\n\n' +
      v('mensagem');

    var url = canal === 'email'
      ? 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Orçamento de site — ' + v('nome')) + '&body=' + encodeURIComponent(texto)
      : 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(texto);

    status.className = 'form__status is-ok';
    status.textContent = canal === 'email'
      ? 'Abrindo seu aplicativo de e-mail com a mensagem pronta…'
      : 'Abrindo o WhatsApp com a mensagem pronta…';

    if (canal === 'email') window.location.href = url;
    else window.open(url, '_blank', 'noopener');
  });
})();
