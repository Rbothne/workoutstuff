// One Move: routing, the equipment filter, move tags and the Today panel.
(function () {
  var VIEWS = ['today', 'moves', 'read', 'log', 'week'];
  var EQUIP = [
    ['bench', 'Bench'], ['pullup-bar', 'Pull-up bar'], ['band', 'Resistance band'],
    ['step', 'Step or box'], ['treadmill', 'Treadmill'],
  ];
  var EQUIP_LABEL = { none: 'no equipment', dumbbells: 'dumbbells', bench: 'bench', 'pullup-bar': 'pull-up bar', band: 'resistance band', step: 'step or box', treadmill: 'treadmill' };
  var WEIGHTS = [5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70];
  var SETTINGS_KEY = 'onemove.settings';
  var DONE_KEY = 'onemove.done';

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  var moves = [];
  var settings = read(SETTINGS_KEY, {});
  if (!Array.isArray(settings.equipment)) settings.equipment = [];
  if (!Array.isArray(settings.dumbbells)) settings.dumbbells = [];

  function owned() {
    return settings.equipment.concat(settings.dumbbells.length ? ['dumbbells'] : []);
  }

  // ---------- routing ----------
  function route() {
    var name = location.hash.slice(1);
    if (VIEWS.indexOf(name) === -1) name = 'today';
    document.querySelectorAll('[data-view]').forEach(function (s) { s.hidden = s.dataset.view !== name; });
    document.querySelectorAll('[data-tab]').forEach(function (a) {
      if (a.dataset.tab === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('hashchange', route);
  route();

  // ---------- equipment ----------
  function chip(label, pressed, extra, onToggle) {
    var b = el('button', 'chip', label);
    b.type = 'button';
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    if (extra) b.appendChild(el('small', '', extra));
    b.addEventListener('click', onToggle);
    return b;
  }
  function toggle(list, value) {
    var i = list.indexOf(value);
    if (i === -1) list.push(value); else list.splice(i, 1);
  }
  function gain(extraKeys) {
    var now = OneMove.visibleMoves(moves, owned()).length;
    return OneMove.visibleMoves(moves, owned().concat(extraKeys)).length - now;
  }
  function renderGear() {
    var equip = $('equip');
    var bells = $('bells');
    equip.textContent = '';
    bells.textContent = '';
    EQUIP.forEach(function (pair) {
      var on = settings.equipment.indexOf(pair[0]) !== -1;
      var more = !on && moves.length ? gain([pair[0]]) : 0;
      equip.appendChild(chip(pair[1], on, more > 0 ? '+' + more : '', function () {
        toggle(settings.equipment, pair[0]);
        changed();
      }));
    });
    WEIGHTS.forEach(function (w) {
      var on = settings.dumbbells.indexOf(w) !== -1;
      bells.appendChild(chip(String(w), on, '', function () {
        toggle(settings.dumbbells, w);
        settings.dumbbells.sort(function (a, b) { return a - b; });
        changed();
      }));
    });
    if (moves.length) {
      var shown = OneMove.visibleMoves(moves, owned()).length;
      var total = moves.length - 1;
      var note = shown + ' of ' + total + ' moves shown.';
      if (!settings.dumbbells.length) note += ' Ticking any dumbbell weight adds ' + gain(['dumbbells']) + ' more.';
      $('gear-note').textContent = note;
    }
  }

  // ---------- cards ----------
  function tagLines(move) {
    var lines = [];
    var gear = move.equipment.map(function (e) { return EQUIP_LABEL[e]; }).join(' and ');
    lines.push(el('span', '', 'Needs ' + gear + '. Typical effort: ' + move.effort + '. Type: ' + move.type + '.'));
    if (move.primary.length) {
      var text = 'Main muscles: ' + move.primary.join(', ').replace(/-/g, ' ') + '.';
      if (move.secondary.length) text += ' Helping: ' + move.secondary.join(', ').replace(/-/g, ' ') + '.';
      lines.push(el('span', '', text));
    }
    if (move.load) {
      var bells = settings.dumbbells;
      var optional = move.equipment.indexOf('dumbbells') === -1;
      var want = (optional ? 'If you add weight, it wants a ' : 'Wants a ') + move.load + ' weight.';
      if (!bells.length) {
        lines.push(el('span', '', want));
      } else {
        var fit = OneMove.suitableWeights(move, bells, null);
        if (fit.length) {
          lines.push(el('span', '', want + ' From yours: ' + fit.join(', ') + ' lb. (The light and medium cut-offs are a starting guess.)'));
        } else {
          lines.push(el('span', 'warn', 'Your lightest dumbbell is ' + bells[0] + ' lb, which is heavy for this move.'));
        }
      }
    }
    return lines;
  }
  function renderCards() {
    var visible = {};
    OneMove.visibleMoves(moves, owned()).forEach(function (m) { visible[m.id] = true; });
    moves.forEach(function (m) {
      var card = $('m-' + m.id);
      if (!card) return;
      card.hidden = !visible[m.id];
      var tags = card.querySelector('.tags');
      tags.textContent = '';
      tagLines(m).forEach(function (line) { tags.appendChild(line); });
    });
    document.querySelectorAll('[data-view="moves"] .set').forEach(function (group) {
      group.hidden = !group.querySelector('details.move:not([hidden])');
    });
  }

  // ---------- today ----------
  var now = new Date();
  function dayKey(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  var dayNum = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
  var todayId = null;
  var log = read(DONE_KEY, {});

  function renderToday() {
    var move = moves.length ? OneMove.todayMove(moves, owned(), dayNum) : null;
    var card = move ? $('m-' + move.id) : null;
    if (!card) return;
    todayId = move.id;
    $('today-name').textContent = card.dataset.name;
    $('today-dose').textContent = card.dataset.dose + '. That is the whole job for today.';
  }
  $('show').addEventListener('click', function () {
    location.hash = 'moves';
    route();
    var card = todayId ? $('m-' + todayId) : null;
    if (card) { card.open = true; card.scrollIntoView({ block: 'start' }); }
  });
  function paintDone() {
    var on = !!log[dayKey(now)];
    var done = $('done');
    done.setAttribute('aria-pressed', on ? 'true' : 'false');
    done.textContent = on ? 'Done today' : 'Mark done';
    var week = $('week');
    week.textContent = '';
    for (var i = 6; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      week.appendChild(el('i', log[dayKey(d)] ? 'on' : ''));
    }
  }
  $('done').addEventListener('click', function () {
    var k = dayKey(now);
    if (log[k]) delete log[k]; else log[k] = true;
    write(DONE_KEY, log);
    paintDone();
  });
  paintDone();

  function changed() {
    write(SETTINGS_KEY, settings);
    renderGear();
    renderCards();
    renderToday();
  }

  // ---------- load ----------
  renderGear();
  fetch('data/moves.json')
    .then(function (r) { if (!r.ok) throw new Error('moves'); return r.json(); })
    .then(function (data) {
      moves = data;
      renderGear();
      renderCards();
      renderToday();
    })
    .catch(function () { $('moves-error').hidden = false; });

  window.OneMoveApp = { getMoves: function () { return moves; }, getSettings: function () { return settings; }, owned: owned, el: el, $: $ };
})();
