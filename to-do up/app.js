/* To-Do Up — lógica do app
   Tarefas: adicionar, editar, concluir, excluir (com desfazer), filtros, busca,
   ordenação, prazo, prioridade, reordenação por arrastar e localStorage. */
(function () {
  'use strict';

  var STORE = 'todoup:tasks';
  var LEGACY = 'tasks'; // versão antiga do app
  var PRIORITY_LABEL = { urgent: 'Urgente', important: 'Importante', normal: 'Normal' };
  var PRIORITY_RANK = { urgent: 1, important: 2, normal: 3 };

  var $ = function (id) { return document.getElementById(id); };
  var listEl = $('taskList');
  var form = $('addForm');
  var input = $('taskInput');
  var prioInput = $('priorityInput');
  var dueInput = $('dueInput');
  var searchInput = $('searchInput');
  var sortInput = $('sortInput');
  var emptyEl = $('emptyState');

  var state = { tasks: [], filter: 'all', query: '', sort: 'manual' };
  var lastRemoved = null;
  var toastTimer = null;

  /* ---------------- Utilidades ---------------- */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function todayISO(offset) {
    var d = new Date();
    if (offset) d.setDate(d.getDate() + offset);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function isLate(t) { return !t.done && t.due && t.due < todayISO(); }
  function isToday(t) { return !t.done && t.due && t.due === todayISO(); }
  function formatDue(iso) {
    var parts = iso.split('-');
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    var diff = Math.round((d - new Date(new Date().toDateString())) / 86400000);
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Amanhã';
    if (diff === -1) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  }
  function svg(path, extra) {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    path.split('|').forEach(function (d) {
      var p = document.createElementNS(ns, extra === 'circle' && d.indexOf('c') === 0 ? 'circle' : 'path');
      if (p.tagName === 'circle') {
        var a = d.slice(1).split(',');
        p.setAttribute('cx', a[0]); p.setAttribute('cy', a[1]); p.setAttribute('r', a[2]);
      } else p.setAttribute('d', d);
      s.appendChild(p);
    });
    return s;
  }
  var ICON = {
    check: 'M5 12.5l4.5 4.5L19 7.5',
    edit: 'M12 20h9|M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
    del: 'M3 6h18|M8 6V4h8v2|M19 6l-1 14H6L5 6|M10 11v6|M14 11v6',
    cal: 'M4 5h16v16H4z|M16 3v4|M8 3v4|M4 10h16',
    flag: 'M5 21V4|M5 4h11l-2 4 2 4H5'
  };

  /* ---------------- Persistência ---------------- */
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(STORE); } catch (e) { /* sem storage */ }
    var data = [];
    try {
      if (raw) data = JSON.parse(raw) || [];
      else {
        var legacy = localStorage.getItem(LEGACY);
        if (legacy) data = JSON.parse(legacy) || [];
      }
    } catch (e) { data = []; }
    if (!Array.isArray(data)) data = [];
    state.tasks = data
      .filter(function (t) { return t && typeof t.text === 'string' && t.text.trim(); })
      .map(function (t) {
        return {
          id: typeof t.id === 'string' ? t.id : uid(),
          text: String(t.text).slice(0, 140),
          done: !!t.done,
          priority: PRIORITY_RANK[t.priority] ? t.priority : 'normal',
          due: typeof t.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.due) ? t.due : '',
          created: typeof t.created === 'number' ? t.created : Date.now()
        };
      });
    if (!raw && !state.tasks.length) seed();
    save();
  }
  function seed() {
    var t = todayISO();
    var tm = todayISO(1);
    state.tasks = [
      { id: uid(), text: 'Revisar a apresentação do projeto', done: false, priority: 'urgent', due: t, created: Date.now() - 3000 },
      { id: uid(), text: 'Responder os e-mails de clientes', done: false, priority: 'important', due: tm, created: Date.now() - 2000 },
      { id: uid(), text: 'Organizar a mesa de trabalho', done: true, priority: 'normal', due: '', created: Date.now() - 1000 }
    ];
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state.tasks)); } catch (e) { /* sem storage */ }
  }

  /* ---------------- Filtros e ordenação ---------------- */
  function matches(t, filter) {
    switch (filter) {
      case 'pending': return !t.done;
      case 'done': return t.done;
      case 'urgent': return t.priority === 'urgent';
      case 'important': return t.priority === 'important';
      case 'late': return isLate(t);
      default: return true;
    }
  }
  function visibleTasks() {
    var q = state.query.toLowerCase();
    var out = state.tasks.filter(function (t) {
      return matches(t, state.filter) && (!q || t.text.toLowerCase().indexOf(q) !== -1);
    });
    if (state.sort === 'priority') {
      out.sort(function (a, b) { return (a.done - b.done) || (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]); });
    } else if (state.sort === 'due') {
      out.sort(function (a, b) {
        if (a.done !== b.done) return a.done - b.done;
        if (!a.due) return 1; if (!b.due) return -1;
        return a.due < b.due ? -1 : a.due > b.due ? 1 : 0;
      });
    } else if (state.sort === 'recent') {
      out.sort(function (a, b) { return b.created - a.created; });
    }
    return out;
  }

  /* ---------------- Renderização ---------------- */
  function buildTask(t) {
    var li = document.createElement('li');
    li.className = 'task' + (t.done ? ' is-done' : '');
    li.dataset.id = t.id;
    li.dataset.priority = t.priority;

    var handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'handle';
    handle.setAttribute('aria-label', 'Arrastar para reordenar (ou Alt + setas)');
    var hs = svg('');
    hs.textContent = '';
    [[9, 6], [15, 6], [9, 12], [15, 12], [9, 18], [15, 18]].forEach(function (c) {
      var ci = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ci.setAttribute('cx', c[0]); ci.setAttribute('cy', c[1]); ci.setAttribute('r', '1.6');
      hs.appendChild(ci);
    });
    handle.appendChild(hs);

    var check = document.createElement('button');
    check.type = 'button';
    check.className = 'check';
    check.dataset.action = 'toggle';
    check.setAttribute('aria-pressed', String(t.done));
    check.setAttribute('aria-label', t.done ? 'Marcar como pendente' : 'Marcar como concluída');
    check.appendChild(svg(ICON.check));

    var body = document.createElement('div');
    body.className = 'task__body';
    var text = document.createElement('p');
    text.className = 'task__text';
    text.textContent = t.text;
    text.title = 'Clique duas vezes para editar';
    var meta = document.createElement('div');
    meta.className = 'task__meta';
    var pr = document.createElement('span');
    pr.className = 'tag tag--' + t.priority;
    pr.append(svg(ICON.flag), document.createTextNode(PRIORITY_LABEL[t.priority]));
    meta.appendChild(pr);
    if (t.due) {
      var due = document.createElement('span');
      due.className = 'tag' + (isLate(t) ? ' tag--late' : isToday(t) ? ' tag--today' : '');
      due.append(svg(ICON.cal), document.createTextNode((isLate(t) ? 'Atrasada · ' : '') + formatDue(t.due)));
      meta.appendChild(due);
    }
    body.append(text, meta);

    var actions = document.createElement('div');
    actions.className = 'task__actions';
    var edit = document.createElement('button');
    edit.type = 'button'; edit.className = 'act'; edit.dataset.action = 'edit';
    edit.setAttribute('aria-label', 'Editar tarefa'); edit.title = 'Editar';
    edit.appendChild(svg(ICON.edit));
    var del = document.createElement('button');
    del.type = 'button'; del.className = 'act act--del'; del.dataset.action = 'delete';
    del.setAttribute('aria-label', 'Excluir tarefa'); del.title = 'Excluir';
    del.appendChild(svg(ICON.del));
    actions.append(edit, del);

    li.append(handle, check, body, actions);
    return li;
  }

  function render() {
    var items = visibleTasks();
    listEl.textContent = '';
    var frag = document.createDocumentFragment();
    items.forEach(function (t) { frag.appendChild(buildTask(t)); });
    listEl.appendChild(frag);
    listEl.classList.toggle('no-drag', state.sort !== 'manual');
    $('dragHint').hidden = state.sort !== 'manual' || items.length < 2;

    emptyEl.hidden = items.length > 0;
    if (!items.length) {
      var none = !state.tasks.length;
      $('emptyTitle').textContent = none ? 'Nenhuma tarefa por aqui' : 'Nada encontrado';
      $('emptyText').textContent = none
        ? 'Adicione sua primeira tarefa acima e comece a organizar o seu dia.'
        : 'Nenhuma tarefa corresponde ao filtro ou à busca atual.';
    }
    renderStats();
  }

  function renderStats() {
    var total = state.tasks.length;
    var done = state.tasks.filter(function (t) { return t.done; }).length;
    var late = state.tasks.filter(isLate).length;
    var pct = total ? Math.round((done / total) * 100) : 0;
    $('statTotal').textContent = total;
    $('statPending').textContent = total - done;
    $('statLate').textContent = late;
    $('statPct').textContent = pct + '%';
    $('ring').style.setProperty('--p', pct);
    ['all', 'pending', 'done', 'urgent', 'important', 'late'].forEach(function (f) {
      var el = document.querySelector('[data-count="' + f + '"]');
      if (el) el.textContent = state.tasks.filter(function (t) { return matches(t, f); }).length;
    });
    $('clearDone').hidden = done === 0;
  }

  /* ---------------- Ações ---------------- */
  function find(id) { return state.tasks.find(function (t) { return t.id === id; }); }

  function addTask(e) {
    e.preventDefault();
    var text = input.value.trim().replace(/\s+/g, ' ');
    var err = $('addError');
    if (!text) {
      err.textContent = 'Escreva a tarefa antes de adicionar.';
      form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
      input.focus();
      return;
    }
    if (dueInput.value && !/^\d{4}-\d{2}-\d{2}$/.test(dueInput.value)) {
      err.textContent = 'Data de prazo inválida.';
      return;
    }
    err.textContent = '';
    state.tasks.unshift({
      id: uid(), text: text.slice(0, 140), done: false,
      priority: prioInput.value, due: dueInput.value || '', created: Date.now()
    });
    save();
    input.value = ''; dueInput.value = ''; prioInput.value = 'normal';
    if (state.filter === 'done' || state.filter === 'late') setFilter('all');
    else render();
    input.focus();
  }

  function toggle(id) {
    var t = find(id); if (!t) return;
    t.done = !t.done; save(); render();
  }

  function remove(id) {
    var idx = state.tasks.findIndex(function (t) { return t.id === id; });
    if (idx < 0) return;
    lastRemoved = { items: [{ task: state.tasks[idx], index: idx }] };
    state.tasks.splice(idx, 1);
    save(); render();
    showToast('Tarefa excluída.', true);
  }

  function clearDone() {
    var removed = [];
    state.tasks.forEach(function (t, i) { if (t.done) removed.push({ task: t, index: i }); });
    if (!removed.length) return;
    state.tasks = state.tasks.filter(function (t) { return !t.done; });
    lastRemoved = { items: removed };
    save(); render();
    showToast(removed.length + (removed.length > 1 ? ' tarefas removidas.' : ' tarefa removida.'), true);
  }

  function undo() {
    if (!lastRemoved) return;
    lastRemoved.items.forEach(function (r) { state.tasks.splice(Math.min(r.index, state.tasks.length), 0, r.task); });
    lastRemoved = null;
    save(); render(); hideToast();
  }

  function startEdit(li) {
    var t = find(li.dataset.id); if (!t) return;
    var textEl = li.querySelector('.task__text');
    if (!textEl) return;
    var field = document.createElement('input');
    field.type = 'text'; field.className = 'task__edit'; field.maxLength = 140; field.value = t.text;
    field.setAttribute('aria-label', 'Editar texto da tarefa');
    textEl.replaceWith(field);
    field.focus(); field.select();
    var finished = false;
    function finish(commit) {
      if (finished) return; finished = true;
      var v = field.value.trim().replace(/\s+/g, ' ');
      if (commit && v) { t.text = v.slice(0, 140); save(); }
      render();
    }
    field.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') finish(true);
      if (e.key === 'Escape') finish(false);
    });
    field.addEventListener('blur', function () { finish(true); });
  }

  function move(id, targetId, after) {
    var from = state.tasks.findIndex(function (t) { return t.id === id; });
    if (from < 0 || id === targetId) return;
    var item = state.tasks.splice(from, 1)[0];
    var to = state.tasks.findIndex(function (t) { return t.id === targetId; });
    if (to < 0) { state.tasks.splice(from, 0, item); return; }
    state.tasks.splice(after ? to + 1 : to, 0, item);
    save();
  }

  /* ---------------- Toast ---------------- */
  function showToast(msg, withUndo) {
    $('toastText').textContent = msg;
    $('toastUndo').hidden = !withUndo;
    $('toast').classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 5000);
  }
  function hideToast() { $('toast').classList.remove('is-on'); }

  /* ---------------- Filtro ---------------- */
  function setFilter(f) {
    state.filter = f;
    document.querySelectorAll('.filter').forEach(function (b) {
      var on = b.dataset.filter === f;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    render();
  }

  /* ---------------- Arrastar para reordenar (mouse + toque) ---------------- */
  var drag = null;
  listEl.addEventListener('pointerdown', function (e) {
    var handle = e.target.closest('.handle');
    if (!handle || state.sort !== 'manual') return;
    e.preventDefault();
    var li = handle.closest('.task');
    drag = { li: li, id: li.dataset.id, target: null, after: false };
    li.classList.add('is-dragging');
    handle.setPointerCapture(e.pointerId);
  });
  listEl.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var items = Array.prototype.slice.call(listEl.querySelectorAll('.task'));
    items.forEach(function (it) { it.classList.remove('drop-before', 'drop-after'); });
    var over = null, after = false;
    for (var i = 0; i < items.length; i++) {
      var r = items[i].getBoundingClientRect();
      if (e.clientY >= r.top && e.clientY <= r.bottom) { over = items[i]; after = e.clientY > r.top + r.height / 2; break; }
    }
    if (!over && items.length) {
      var first = items[0].getBoundingClientRect();
      if (e.clientY < first.top) { over = items[0]; after = false; }
      else { over = items[items.length - 1]; after = true; }
    }
    if (over && over !== drag.li) {
      over.classList.add(after ? 'drop-after' : 'drop-before');
      drag.target = over.dataset.id; drag.after = after;
    } else { drag.target = null; }
    // rolagem automática perto das bordas
    if (e.clientY < 60) window.scrollBy(0, -12);
    else if (e.clientY > window.innerHeight - 110) window.scrollBy(0, 12);
  });
  function endDrag() {
    if (!drag) return;
    var d = drag; drag = null;
    if (d.target) move(d.id, d.target, d.after);
    render();
  }
  listEl.addEventListener('pointerup', endDrag);
  listEl.addEventListener('pointercancel', endDrag);

  /* ---------------- Eventos ---------------- */
  form.addEventListener('submit', addTask);
  input.addEventListener('input', function () { $('addError').textContent = ''; });

  listEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var li = btn.closest('.task');
    var action = btn.dataset.action;
    if (action === 'toggle') toggle(li.dataset.id);
    else if (action === 'delete') remove(li.dataset.id);
    else if (action === 'edit') startEdit(li);
  });
  listEl.addEventListener('dblclick', function (e) {
    if (e.target.classList.contains('task__text')) startEdit(e.target.closest('.task'));
  });
  listEl.addEventListener('keydown', function (e) {
    var handle = e.target.closest('.handle');
    if (!handle || !e.altKey || state.sort !== 'manual') return;
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    var li = handle.closest('.task');
    var sib = e.key === 'ArrowUp' ? li.previousElementSibling : li.nextElementSibling;
    if (!sib) return;
    var id = li.dataset.id;
    move(id, sib.dataset.id, e.key === 'ArrowDown');
    render();
    var again = listEl.querySelector('[data-id="' + id + '"] .handle');
    if (again) again.focus();
  });

  document.querySelectorAll('.filter').forEach(function (b) {
    b.addEventListener('click', function () { setFilter(b.dataset.filter); });
  });
  searchInput.addEventListener('input', function () { state.query = searchInput.value.trim(); render(); });
  sortInput.addEventListener('change', function () { state.sort = sortInput.value; render(); });
  $('clearDone').addEventListener('click', clearDone);
  $('toastUndo').addEventListener('click', undo);

  $('themeBtn').addEventListener('click', function () {
    var root = document.documentElement;
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('todoup-theme', next); } catch (e) { /* sem storage */ }
  });

  window.addEventListener('storage', function (e) { if (e.key === STORE) { load(); render(); } });

  /* ---------------- Início ---------------- */
  var now = new Date();
  var label = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  $('today').textContent = label.charAt(0).toUpperCase() + label.slice(1);
  load();
  render();
})();
