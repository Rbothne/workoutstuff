// One Move: the Train screen. Routine on the left, bank of moves, the chosen move, the week and reading.
(function () {
  var TARGET = 4;
  var DOUBLE_MS = 450;
  var EQUIP = [['bench', 'Bench'], ['pullup-bar', 'Pull-up bar'], ['band', 'Resistance band'], ['step', 'Step or box'], ['treadmill', 'Treadmill']];
  var EQUIP_LABEL = { none: 'no equipment', dumbbells: 'dumbbells', bench: 'a bench', 'pullup-bar': 'a pull-up bar', band: 'a resistance band', step: 'a step or box', treadmill: 'a treadmill' };
  var WEIGHTS = [5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70];
  var BAR_LABEL = { quads: 'Quads', hips: 'Glutes, hamstrings', core: 'Core', push: 'Push', pull: 'Pull', jump: 'Calves, jumping' };
  var BAR_NAME = { quads: 'quads', hips: 'glutes and hamstrings', core: 'core', push: 'push', pull: 'pull', jump: 'calves and jumping' };
  var CAT_LABEL = { legs: 'Legs', hips: 'Hips', core: 'Core', push: 'Push', pull: 'Pull', jump: 'Jump', mobility: 'Mobility', cardio: 'Cardio' };
  var CAT_ORDER = ['legs', 'hips', 'core', 'push', 'pull', 'jump', 'mobility', 'cardio'];

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function button(cls, text, onClick, label) {
    var b = el('button', cls, text); b.type = 'button';
    if (label) b.setAttribute('aria-label', label);
    b.addEventListener('click', onClick);
    return b;
  }
  function todayKey() { return OneMove.dateKey(new Date()); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---------- state ----------
  var moves = [], byId = {}, articles = [], entries = [], settings = null, store = null;
  var ui = {
    sel: { kind: 'today', id: null },  // what the middle panel shows
    back: null,                         // what it showed before a bank preview
    lastBank: null,                     // { id, at } for double-click detection
    target: null,                       // the routine move being replaced
    purpose: 'All',
    bar: null,
    undo: null,
    drafts: {},                         // today's edited numbers per move: { weight, reps, sets }
    busy: false,
    note: '',
  };
  var queue = Promise.resolve();
  function enqueue(fn) { queue = queue.then(fn, fn); return queue; }
  var saveTimer = null;

  function owned() { return settings.equipment.concat(settings.dumbbells.length ? ['dumbbells'] : []); }
  function available(m) { return m.equipment.every(function (e) { return e === 'none' || owned().indexOf(e) !== -1; }); }
  function needs(m) {
    var miss = m.equipment.filter(function (e) { return e !== 'none' && owned().indexOf(e) === -1; });
    return miss.length ? 'needs ' + miss.map(function (e) { return EQUIP_LABEL[e].replace(/^an? /, ''); }).join(' and ') : '';
  }
  function inRoutine(id) { return settings.routine.indexOf(id) !== -1; }
  function todayEntry(id) { return entries.filter(function (e) { return e.date === todayKey() && e.moveId === id; })[0]; }
  function todaysMove() {
    var dayNum = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
    return OneMove.todayMove(moves, owned(), dayNum);
  }
  function plan() { return OneMove.planSession(moves, settings, entries, todayKey()); }
  function planRow(id) { return plan().filter(function (r) { return r.move.id === id; })[0]; }

  // The numbers shown for a routine move: today's edits, else the plan.
  function numbers(row) {
    var d = ui.drafts[row.move.id];
    if (d) return d;
    var first = row.sets[0] || { weight: 0, reps: row.move.min || 1 };
    return { weight: first.weight, reps: first.reps, sets: row.sets.length };
  }
  function setsFrom(n) {
    var out = [];
    for (var i = 0; i < n.sets; i++) out.push({ weight: n.weight, reps: n.reps });
    return out;
  }

  // ---------- saving ----------
  function saveSettings() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var snapshot = JSON.parse(JSON.stringify(settings));
      enqueue(function () { return store.setSettings(snapshot); }).catch(function () { flash("Your changes didn't save. Check your connection."); });
    }, 500);
  }
  function refresh() { return store.list().then(function (all) { entries = all; }, function () {}); }
  function write(fn, after) {
    if (ui.busy) return;
    ui.busy = true;
    var failed = false;
    enqueue(fn).catch(function () { failed = true; }).then(refresh).then(function () {
      ui.busy = false;
      if (failed) flash("That didn't save. Check your connection and try again.");
      else if (after) after();
      render();
    });
  }
  function flash(text) { ui.note = text; var n = $('log-note'); if (n) n.textContent = text; }

  // A change to sets, reps or weight sticks: it becomes this move's default from now on.
  function change(row, patch) {
    var n = numbers(row);
    var next = { weight: n.weight, reps: n.reps, sets: n.sets };
    Object.keys(patch).forEach(function (k) { next[k] = patch[k]; });
    ui.drafts[row.move.id] = next;
    settings.prefs[row.move.id] = { sets: next.sets, reps: next.reps, weight: next.weight, date: todayKey() };
    saveSettings();
    renderDetail(); renderRoutine(); markCurrent();
  }

  // ---------- actions ----------
  function complete(id) {
    var row = planRow(id); if (!row) return;
    var sets = setsFrom(numbers(row));
    write(function () { return store.add({ date: todayKey(), moveId: id, sets: sets, kind: 'lift' }); }, function () {
      delete ui.drafts[id];
      advanceFrom(id);
    });
  }
  function pass(id) {
    var e = todayEntry(id);
    if (e && e.pass) { write(function () { return store.remove(e.id); }); return; }
    write(function () { return store.add({ date: todayKey(), moveId: id, sets: [], pass: true }); }, function () { advanceFrom(id); });
  }
  function advanceFrom(id) {
    var rows = plan();
    var at = rows.map(function (r) { return r.move.id; }).indexOf(id);
    var next = rows.slice(at + 1).concat(rows.slice(0, at)).filter(function (r) { return !r.status; })[0];
    if (next) select('routine', next.move.id, true);
  }
  function didAll() {
    var rows = plan().filter(function (r) { return !r.status; });
    if (!rows.length) return;
    var date = todayKey();
    write(function () {
      var chain = Promise.resolve();
      rows.forEach(function (r) {
        var sets = setsFrom(numbers(r));
        chain = chain.then(function () { return store.add({ date: date, moveId: r.move.id, sets: sets, kind: 'lift' }); });
      });
      return chain;
    }, function () { rows.forEach(function (r) { delete ui.drafts[r.move.id]; }); });
  }
  function markToday(id) {
    var e = todayEntry(id);
    // A full lifting log for the same move is never removed from here.
    if (e && OneMove.isSession(e)) return;
    if (e) { write(function () { return store.remove(e.id); }); return; }
    var m = byId[id];
    write(function () { return store.add({ date: todayKey(), moveId: id, sets: [{ weight: 0, reps: m.min || 30 }] }); });
  }
  function volleyball() {
    var e = todayEntry('volleyball');
    if (e) write(function () { return store.remove(e.id); });
    else write(function () { return store.add({ date: todayKey(), moveId: 'volleyball', sets: [{ weight: 0, reps: 1 }] }); });
  }
  function addToRoutine(id) {
    if (!inRoutine(id)) settings.routine.push(id);
    ui.target = null; ui.back = null; ui.undo = null;
    saveSettings(); select('routine', id, true);
  }
  function replace(oldId, newId) {
    var at = settings.routine.indexOf(oldId);
    if (at === -1) return addToRoutine(newId);
    if (inRoutine(newId)) settings.routine.splice(at, 1); else settings.routine.splice(at, 1, newId);
    delete ui.drafts[oldId];
    ui.target = null; ui.back = null; ui.undo = null;
    saveSettings(); select('routine', newId, true);
  }
  function removeFromRoutine(id) {
    var at = settings.routine.indexOf(id);
    if (at === -1) return;
    settings.routine.splice(at, 1);
    ui.undo = { id: id, at: at };
    if (ui.target === id) ui.target = null;
    if (ui.sel.id === id && ui.sel.kind === 'routine') ui.sel = { kind: 'today', id: null };
    saveSettings(); render();
  }
  function undoRemove() {
    if (!ui.undo) return;
    settings.routine.splice(Math.min(ui.undo.at, settings.routine.length), 0, ui.undo.id);
    ui.undo = null; saveSettings(); render();
  }

  // ---------- selection ----------
  function select(kind, id, quiet) {
    ui.sel = { kind: kind, id: id };
    if (!quiet) render(); else { renderAll(); }
  }
  // On a phone the move panel sits above the lists, so bring it into view after a pick.
  function reveal() {
    if (window.matchMedia && window.matchMedia('(max-width: 620px)').matches) {
      var d = $('detail'); if (d && d.scrollIntoView) d.scrollIntoView({ block: 'start' });
    }
  }
  function clickRoutine(id) {
    // Clicking the routine move already being replaced clears the filter, like "Show all".
    if (ui.sel.kind === 'routine' && ui.sel.id === id && ui.target === id) { ui.target = null; ui.back = null; render(); return; }
    ui.sel = { kind: 'routine', id: id }; ui.target = id; ui.bar = null; ui.back = null;
    render(); reveal();
  }
  function clickBank(id) {
    var now = Date.now();
    var quick = ui.lastBank && ui.lastBank.id === id && now - ui.lastBank.at < DOUBLE_MS;
    ui.lastBank = { id: id, at: now };
    var showing = ui.sel.kind === 'bank' && ui.sel.id === id;
    if (showing && quick && available(byId[id])) {
      ui.lastBank = null;
      if (ui.target && !inRoutine(id)) replace(ui.target, id); else addToRoutine(id);
      return;
    }
    if (showing && !quick && ui.back) { ui.sel = ui.back; ui.back = null; renderDetail(); markCurrent(); return; }
    if (inRoutine(id)) { ui.sel = { kind: 'routine', id: id }; ui.back = null; renderDetail(); markCurrent(); return; }
    if (!ui.back) ui.back = ui.sel;
    ui.sel = { kind: 'bank', id: id }; renderDetail(); markCurrent(); reveal();
  }

  // ---------- rendering ----------
  function credits() { return OneMove.weekCredits(entries, moves, OneMove.weekStart(new Date())); }

  function renderStatus() {
    var now = new Date(), active = 0;
    for (var i = 6; i >= 0; i--) {
      var key = OneMove.dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i));
      if (entries.some(function (e) { return e.date === key && !e.pass; })) active++;
    }
    var text = active ? active + (active === 1 ? ' day' : ' days') + ' logged in the last 7' : '';
    if (store && store.kind === 'memory') text = (text ? text + '. ' : '') + "This browser isn't saving.";
    else if (store && store.kind === 'browser') text = (text ? text + '. ' : '') + 'Saved in this browser only.';
    $('status').textContent = text;
  }

  function renderBars() {
    var c = credits(), box = $('bars'); box.textContent = '';
    OneMove.BARS.forEach(function (b) {
      var v = Math.round(c[b] * 10) / 10;
      box.appendChild(el('span', '', BAR_LABEL[b]));
      var tr = el('span', 'track'); tr.setAttribute('role', 'img');
      var times = v / TARGET;
      tr.setAttribute('aria-label', BAR_LABEL[b] + ': ' + v + ' of ' + TARGET + (times > 1 ? ', ' + (Math.round(times * 10) / 10) + ' times the target' : ''));
      OneMove.barLayers(v, TARGET).forEach(function (w, k) { var i = el('i', 'l' + k); i.style.width = (w * 100) + '%'; tr.appendChild(i); });
      box.appendChild(tr);
      box.appendChild(el('span', 'n', String(v)));
    });
    var fills = $('fills'); fills.textContent = '';
    OneMove.emptiestBars(c, 2).forEach(function (b) {
      var names = moves.filter(function (m) { return OneMove.mainBar(m) === b && m.id !== 'volleyball'; }).map(function (m) { return m.name.toLowerCase(); });
      var row = button('fill-row', '', function () {
        ui.bar = ui.bar === b ? null : b; ui.target = null;
        if (ui.bar) {
          var first = moves.filter(function (m) { return OneMove.mainBar(m) === b && !inRoutine(m.id) && available(m) && m.id !== 'volleyball'; })[0];
          if (first) { if (!ui.back) ui.back = ui.sel; ui.sel = { kind: 'bank', id: first.id }; }
        }
        render();
      });
      row.setAttribute('aria-pressed', ui.bar === b ? 'true' : 'false');
      var top = el('span', 'top'); top.appendChild(el('span', '', BAR_LABEL[b])); top.appendChild(el('span', 'muted', (Math.round(c[b] * 10) / 10) + ' of ' + TARGET)); row.appendChild(top);
      var tr = el('span', 'track'); var i = el('i', 'l0'); i.style.width = Math.min(100, c[b] / TARGET * 100) + '%'; tr.appendChild(i); row.appendChild(tr);
      row.appendChild(el('span', 'muted', cap(names.slice(0, 2).join(', ')) + (names.length > 2 ? ', and ' + (names.length - 2) + ' more' : '')));
      fills.appendChild(row);
    });
  }

  function renderRoutine() {
    var tm = todaysMove(), tl = $('today-list'); tl.textContent = '';
    if (tm) {
      var li = el('li');
      var done = !!todayEntry(tm.id);
      var p = button('pick' + (done ? ' done' : ''), '', function () { ui.target = null; ui.back = null; ui.sel = { kind: 'today', id: tm.id }; render(); });
      p.dataset.sel = 'today:' + tm.id;
      p.appendChild(document.createTextNode(tm.name));
      p.appendChild(done ? el('span', 'st ok', 'done') : el('small', '', doseShort(tm)));
      li.appendChild(p); tl.appendChild(li);
    }
    var rows = plan(), byRow = {};
    rows.forEach(function (r) { byRow[r.move.id] = r; });
    var ol = $('routine'); ol.textContent = '';
    settings.routine.forEach(function (id, idx) {
      var m = byId[id]; if (!m) return;
      var r = byRow[id];
      var li = el('li', 'rrow');
      var p = button('pick' + (r && r.status ? ' done' : '') + (r ? '' : ' off'), '', function () { clickRoutine(id); });
      p.dataset.sel = 'routine:' + id;
      p.appendChild(el('span', 'i', String(idx + 1)));
      p.appendChild(document.createTextNode(m.name));
      if (!r) p.appendChild(el('small', '', needs(m) || 'not loggable'));
      else if (r.status === 'done') p.appendChild(el('span', 'st ok', 'done'));
      else if (r.status === 'pass') p.appendChild(el('span', 'st pass', 'passed'));
      else { var n = numbers(r); if (n.weight) p.appendChild(el('small', '', n.weight + ' lb')); }
      li.appendChild(p);
      li.appendChild(button('x', '×', function () { removeFromRoutine(id); }, 'Remove ' + m.name + ' from your routine'));
      ol.appendChild(li);
    });
    if (!settings.routine.length) ol.appendChild(el('li', 'note', 'Empty. Add moves from the bank.'));
    var u = $('undo'); u.textContent = '';
    if (ui.undo) {
      u.appendChild(document.createTextNode(byId[ui.undo.id].name + ' removed. '));
      var a = el('a', '', 'Undo'); a.href = '#train';
      a.addEventListener('click', function (e) { e.preventDefault(); undoRemove(); });
      u.appendChild(a);
    }
    var open = rows.filter(function (r) { return !r.status; }).length;
    var all = $('did-all');
    all.disabled = ui.busy || !open;
    all.textContent = !rows.length ? 'Did it as written' : open ? 'Did it as written' : 'All logged today';
    var vb = $('vball'), played = !!todayEntry('volleyball');
    vb.setAttribute('aria-pressed', played ? 'true' : 'false');
    vb.textContent = played ? 'Played volleyball today' : 'Played volleyball';
    $('log-note').textContent = ui.note;
  }

  function renderPurposes() {
    var box = $('purposes'); box.textContent = '';
    ['All'].concat(OneMove.PURPOSES).forEach(function (p) {
      var on = ui.purpose === p && !ui.bar && !ui.target;
      var c = button('chip', p, function () { ui.purpose = p; ui.bar = null; ui.target = null; render(); });
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
      box.appendChild(c);
    });
  }

  function bankList() {
    var list;
    if (ui.target) list = OneMove.replacementsFor(moves, ui.target);
    else if (ui.bar) list = moves.filter(function (m) { return OneMove.mainBar(m) === ui.bar; });
    else list = moves.filter(function (m) { return ui.purpose === 'All' || (m.for || []).indexOf(ui.purpose) !== -1; });
    return list.filter(function (m) { return m.id !== 'volleyball'; })
      .sort(function (a, b) { return CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category); });
  }

  function renderBank() {
    var note = $('filter'); note.textContent = '';
    var label = ui.target ? 'Could replace ' + byId[ui.target].name.toLowerCase() : ui.bar ? 'Moves that fill ' + BAR_NAME[ui.bar] : null;
    if (label) {
      var n = el('div', 'filter-note'); n.appendChild(el('span', '', label));
      n.appendChild(button('', 'Show all', function () { ui.bar = null; ui.target = null; render(); }));
      note.appendChild(n);
    }
    var box = $('bank'); box.textContent = '';
    var cat = null;
    bankList().forEach(function (m) {
      if (m.category !== cat) { cat = m.category; box.appendChild(el('div', 'g', CAT_LABEL[cat] || cat)); }
      var p = button('pick' + (available(m) ? '' : ' off'), '', function () { clickBank(m.id); });
      p.dataset.sel = 'bank:' + m.id;
      p.appendChild(document.createTextNode(m.name));
      var extra = needs(m) || (inRoutine(m.id) ? 'in routine' : '');
      if (extra) p.appendChild(el('small', '', extra));
      box.appendChild(p);
    });
    if (!box.children.length) box.appendChild(el('p', 'note', ui.target ? 'Nothing else trains the same muscles first. Remove it, or add something new.' : 'No moves match.'));
  }

  function renderGear() {
    var equip = $('equip'), bells = $('bells'); equip.textContent = ''; bells.textContent = '';
    EQUIP.forEach(function (pair) {
      var on = settings.equipment.indexOf(pair[0]) !== -1;
      var c = button('chip', pair[1], function () { toggle(settings.equipment, pair[0]); saveSettings(); render(); });
      c.setAttribute('aria-pressed', on ? 'true' : 'false'); equip.appendChild(c);
    });
    WEIGHTS.forEach(function (w) {
      var on = settings.dumbbells.indexOf(w) !== -1;
      var c = button('chip', String(w), function () { toggle(settings.dumbbells, w); settings.dumbbells.sort(function (a, b) { return a - b; }); saveSettings(); render(); });
      c.setAttribute('aria-pressed', on ? 'true' : 'false'); bells.appendChild(c);
    });
    var gear = settings.equipment.map(function (e) { return EQUIP_LABEL[e].replace(/^an? /, ''); });
    if (settings.dumbbells.length) gear.push('dumbbells ' + settings.dumbbells.join(', ') + ' lb');
    $('gear-summary').textContent = 'My gear: ' + (gear.length ? gear.join(', ') : 'none yet') + '. Change';
  }
  function toggle(list, v) { var i = list.indexOf(v); if (i === -1) list.push(v); else list.splice(i, 1); }

  function doseShort(m) {
    var card = $('m-' + m.id);
    return card && card.dataset.dose ? card.dataset.dose : '';
  }
  function cardOf(id) { return $('m-' + id); }

  function stepper(text, minus, plus, label, minusOff, plusOff) {
    var s = el('div', 'stepper');
    var a = button('step', '−', minus, 'Less ' + label); a.disabled = !!minusOff;
    var b = button('step', '+', plus, 'More ' + label); b.disabled = !!plusOff;
    s.appendChild(a); s.appendChild(el('b', '', text)); s.appendChild(b);
    return s;
  }

  function renderDetail() {
    var d = $('detail'); d.textContent = '';
    var sel = ui.sel;
    var tm = todaysMove();
    if (sel.kind === 'today' && !sel.id && tm) sel = ui.sel = { kind: 'today', id: tm.id };
    var m = sel.id && byId[sel.id];
    if (!m) { d.appendChild(el('p', 'note', 'Pick a move from your routine or the bank.')); return; }
    var card = cardOf(m.id);
    var row = sel.kind === 'routine' ? planRow(m.id) : null;

    var head = el('div', 'ex-head'); head.appendChild(el('h3', '', m.name));
    var dose = card && card.querySelector('summary .dose');
    head.appendChild(el('span', 'muted', sel.kind === 'today' ? (card ? card.dataset.dose : '') + '. That is the whole job for today.' : dose ? dose.textContent : ''));
    if (m.for && m.for.length) { var f = el('span', 'for', 'For:'); m.for.forEach(function (x) { f.appendChild(el('b', '', x)); }); head.appendChild(f); }
    d.appendChild(head);

    var top = el('div', 'd-top');
    var fig = card && card.querySelector('figure');
    if (fig) top.appendChild(fig.cloneNode(true));
    var side = el('div', 'd-side');

    if (row) {
      var n = numbers(row);
      var st = row.status;
      side.appendChild(el('span', 'label', 'Exercise ' + (plan().map(function (r) { return r.move.id; }).indexOf(m.id) + 1) + ' of ' + plan().length + (st === 'done' ? ' · done' : st === 'pass' ? ' · passed' : '')));
      if (m.load) {
        side.appendChild(stepper(n.weight ? n.weight + ' lb' : 'bodyweight',
          function () { change(row, { weight: OneMove.stepWeight(m, n.weight, -1, settings.dumbbells) }); },
          function () { change(row, { weight: OneMove.stepWeight(m, n.weight, 1, settings.dumbbells) }); }, 'weight'));
      }
      side.appendChild(stepper(n.sets + (n.sets === 1 ? ' set' : ' sets'),
        function () { change(row, { sets: OneMove.stepSets(n.sets, -1) }); },
        function () { change(row, { sets: OneMove.stepSets(n.sets, 1) }); }, 'sets', n.sets <= 1, n.sets >= 6));
      var inc = m.unit === 'seconds' ? 5 : 1, unit = m.unit === 'seconds' ? ' seconds' : ' reps';
      side.appendChild(stepper(n.reps + unit,
        function () { change(row, { reps: Math.max(inc, n.reps - inc) }); },
        function () { change(row, { reps: n.reps + inc }); }, unit.trim(), n.reps <= inc));
      if (row.last) {
        var lw = row.last.sets[0] && row.last.sets[0].weight ? row.last.sets[0].weight + ' lb, ' : '';
        side.appendChild(el('p', 'note', 'Last time: ' + lw + row.last.sets.map(function (s) { return s.reps; }).join(', ') + (m.unit === 'seconds' ? ' seconds.' : '.')));
      } else {
        side.appendChild(el('p', 'note', 'First time. Pick numbers that feel about 7 out of 10, with a rep or two left.'));
      }
      var act = el('div', 'actions');
      var ps = button('btn', st === 'pass' ? 'Passed' : 'Pass', function () { pass(m.id); }, st === 'pass' ? 'Undo the pass on ' + m.name : 'Pass on ' + m.name + ' for today');
      if (st === 'pass') ps.setAttribute('aria-pressed', 'true');
      act.appendChild(ps);
      var cp = button('btn fill', st === 'done' ? 'Log again' : 'Completed', function () { complete(m.id); }, (st === 'done' ? 'Log ' : 'Complete ') + m.name + ' with these numbers');
      cp.style.marginLeft = 'auto'; cp.disabled = ui.busy; act.appendChild(cp);
      side.appendChild(act);
      side.appendChild(el('p', 'note', 'Completed logs it with these numbers and opens the next. Pass skips it for today. Your changes stay as the default next time.'));
    } else if (sel.kind === 'routine') {
      side.appendChild(el('span', 'label', 'In your routine'));
      side.appendChild(el('p', 'note', needs(m) ? 'This one ' + needs(m) + '. Tick it under My gear, or replace it.' : 'This move has nothing to log.'));
    } else if (sel.kind === 'today') {
      var done = todayEntry(m.id);
      side.appendChild(el('span', 'label', "Today's move"));
      var md = button('btn fill wide', done ? 'Done today' : 'Mark done', function () { markToday(m.id); });
      md.setAttribute('aria-pressed', done ? 'true' : 'false'); md.disabled = ui.busy; side.appendChild(md);
      side.appendChild(el('p', 'note', 'One move a day counts as the whole day. The rest of today is optional.'));
    } else {
      var target = ui.target && byId[ui.target];
      side.appendChild(el('span', 'label', target ? 'Instead of ' + target.name.toLowerCase() + '?' : 'Not in your routine'));
      if (!available(m)) {
        side.appendChild(el('p', 'note', 'This one ' + needs(m) + '. Tick it under My gear to use it.'));
      } else if (target) {
        side.appendChild(button('btn fill wide', 'Replace ' + target.name.toLowerCase() + ' with this', function () { replace(target.id, m.id); }));
        side.appendChild(button('btn wide', 'Add it as well', function () { addToRoutine(m.id); }));
      } else {
        side.appendChild(button('btn fill wide', 'Add to my routine', function () { addToRoutine(m.id); }));
      }
      var mb = OneMove.mainBar(m);
      if (mb) side.appendChild(el('p', 'note', 'Each set adds 1 to ' + BAR_NAME[mb] + ' this week.'));
      if (available(m)) side.appendChild(el('p', 'note', 'Shortcut: double-click it in the bank to ' + (target ? 'replace ' + target.name.toLowerCase() : 'add it') + '. Click it again later to go back.'));
    }
    top.appendChild(side);
    d.appendChild(top);

    var cols = card && card.querySelector('.cols');
    if (cols) { var c = cols.cloneNode(true); c.className = 'cues'; d.appendChild(c); }
    d.appendChild(metaLine(m));
  }

  function metaLine(m) {
    var bits = [];
    if (m.primary.length) bits.push(cap(m.primary.concat(m.secondary).join(', ').replace(/-/g, ' ')));
    bits.push('typical effort ' + m.effort);
    bits.push(m.equipment[0] === 'none' ? 'no equipment' : 'needs ' + m.equipment.map(function (e) { return EQUIP_LABEL[e].replace(/^an? /, ''); }).join(' and '));
    var warn = false;
    if (m.load) {
      var lw = OneMove.lastWeight(entries, m.id);
      var optional = m.equipment.indexOf('dumbbells') === -1;
      var bells = settings.dumbbells;
      if (lw !== null) bits.push((optional ? 'with weight, ' : '') + 'you last used ' + lw + ' lb');
      else if (bells.length && !OneMove.suitableWeights(m, bells, null).length) { bits.push('your lightest dumbbell, ' + bells[0] + ' lb, is heavy for this move'); warn = true; }
      else bits.push((optional ? 'add weight with a ' : 'wants a ') + m.load + ' dumbbell');
    }
    return el('p', 'meta' + (warn ? ' warn' : ''), bits.join(' · '));
  }

  function renderRelated() {
    var box = $('related'); box.textContent = '';
    if (!articles.length || !settings || !moves.length) { box.appendChild(el('li', 'note', 'Loading.')); return; }
    OneMove.relatedArticles(moves, settings.routine).forEach(function (id) {
      var a = articles.filter(function (x) { return x.id === id; })[0]; if (!a) return;
      var li = el('li'); var link = el('a', '', a.title); link.href = '#read-' + a.id;
      li.appendChild(link); li.appendChild(el('small', '', a.bluf[0].text)); box.appendChild(li);
    });
  }

  function markCurrent() {
    var key = ui.sel.kind + ':' + ui.sel.id;
    document.querySelectorAll('[data-sel]').forEach(function (b) { b.setAttribute('aria-current', b.dataset.sel === key ? 'true' : 'false'); });
  }
  function renderAll() {
    if (!settings || !moves.length) return;
    renderStatus(); renderBars(); renderRoutine(); renderPurposes(); renderBank(); renderGear(); renderDetail(); renderRelated(); markCurrent();
  }
  function render() { renderAll(); }

  // ---------- start ----------
  $('did-all').addEventListener('click', function () { if (settings) didAll(); });
  $('vball').addEventListener('click', function () { if (settings) volleyball(); });
  var storage = null;
  try { storage = window.localStorage; } catch (e) { storage = null; }
  var dbReady = window.claude && typeof window.claude.use === 'function'
    ? window.claude.use('db').catch(function () { return null; }) : Promise.resolve(null);
  var movesReady = fetch('data/moves.json').then(function (r) { if (!r.ok) throw new Error('moves'); return r.json(); });
  fetch('data/reading.json').then(function (r) { return r.ok ? r.json() : []; }).then(function (a) { articles = a; renderRelated(); }, function () {});

  Promise.all([movesReady, dbReady.then(function (db) { return OneMoveStore.open({ db: db, storage: storage }); })])
    .then(function (got) {
      moves = got[0]; moves.forEach(function (m) { byId[m.id] = m; });
      store = got[1];
      return Promise.all([store.getSettings(), store.list()]);
    })
    .then(function (got) {
      settings = got[0]; entries = got[1];
      settings.routine = settings.routine.filter(function (id) { return byId[id]; });
      renderAll();
    })
    .catch(function () {
      $('detail').textContent = '';
      $('detail').appendChild(el('p', 'note', "Couldn't load the moves or your log. Reload to try again. Read still works."));
      $('bars').textContent = '';
    });

  // Views: Train and Read, switched by the address.
  function route() {
    var h = location.hash.slice(1);
    var view = h === 'read' || h.indexOf('read-') === 0 ? 'read' : 'train';
    document.querySelectorAll('[data-view]').forEach(function (v) { v.hidden = v.dataset.view !== view; });
    document.querySelectorAll('[data-tab]').forEach(function (a) { if (a.dataset.tab === view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }
  window.addEventListener('hashchange', route);
  route();
  window.OneMoveTrain = { getMoves: function () { return moves; } };
})();
