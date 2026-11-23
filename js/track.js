// One Move: everything that reads or writes the log. Opens the store, then drives the Today
// buttons, the Log view and the Week view.
(function () {
  var el = OneMoveApp.el;
  var $ = OneMoveApp.$;
  var TARGET = 4;
  var BAR_LABEL = { quads: 'Quads', hips: 'Glutes and hamstrings', core: 'Core', push: 'Push', pull: 'Pull', jump: 'Calves and jumping' };
  var BAR_MUSCLES = {
    quads: 'Quads (front of the thighs).',
    hips: 'Glutes and hamstrings (backside and backs of the thighs).',
    core: 'Abs, obliques and lower back.',
    push: 'Chest, shoulders and triceps.',
    pull: 'Lats, upper back, biceps and forearms.',
    jump: 'Calves, plus the jumping and landing you do.',
  };

  var store = null;
  var entries = [];
  var sheet = null; // the Log view's editable copy of today's plan
  var busy = false;
  var queue = Promise.resolve();
  function enqueue(fn) { queue = queue.then(fn, fn); return queue; }

  function todayKey() { return OneMove.dateKey(new Date()); }
  function moveById(id) { return OneMoveApp.getMoves().filter(function (m) { return m.id === id; })[0]; }
  function entryFor(date, moveId) {
    return entries.filter(function (e) { return e.date === date && e.moveId === moveId; })[0];
  }
  function refresh() {
    return store.list().then(function (all) { entries = all; }, function () {});
  }

  // ---------- Today ----------
  function paintToday() {
    var id = OneMoveApp.getTodayId();
    var done = $('done');
    var on = !!(id && entryFor(todayKey(), id));
    done.setAttribute('aria-pressed', on ? 'true' : 'false');
    done.textContent = on ? 'Done today' : 'Mark done';

    var vb = $('vball');
    var played = !!entryFor(todayKey(), 'volleyball');
    vb.setAttribute('aria-pressed', played ? 'true' : 'false');
    vb.textContent = played ? 'Played volleyball today' : 'Played volleyball';

    // Counts active days only. Days with nothing logged are never shown.
    var now = new Date();
    var active = 0;
    for (var i = 6; i >= 0; i--) {
      var key = OneMove.dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i));
      if (entries.some(function (e) { return e.date === key; })) active++;
    }
    $('week').textContent = active ? active + (active === 1 ? ' day' : ' days') + ' logged in the last 7' : '';
  }

  function toggleEntry(moveId, sets, keepIfBigger) {
    if (!store || busy) return;
    busy = true;
    var existing = entryFor(todayKey(), moveId);
    var failed = false;
    // The write starts inside the queue, so it waits for earlier writes and a thrown error cannot leave `busy` set.
    enqueue(function () {
      if (existing) {
        // A full lifting log for this move is never removed by the Today button.
        return keepIfBigger && existing.sets.length > 1 ? null : store.remove(existing.id);
      }
      return store.add({ date: todayKey(), moveId: moveId, sets: sets });
    }).catch(function () { failed = true; }).then(refresh).then(function () {
      busy = false;
      sheet = null;
      paintAll();
      if (failed) $('today-dose').textContent = "That didn't save. Check your connection or browser storage and tap again.";
    });
  }

  $('done').addEventListener('click', function () {
    var id = OneMoveApp.getTodayId();
    var move = id && moveById(id);
    if (!move) return;
    toggleEntry(id, [{ weight: 0, reps: move.min || 30 }], true);
  });
  $('vball').addEventListener('click', function () {
    toggleEntry('volleyball', [{ weight: 0, reps: 1 }], false);
  });

  // ---------- Log ----------
  function stepper(label, onMinus, onPlus) {
    var box = el('span', 'stepper');
    var minus = el('button', 'step', '−');
    minus.type = 'button';
    minus.setAttribute('aria-label', 'Less');
    minus.addEventListener('click', onMinus);
    var plus = el('button', 'step', '+');
    plus.type = 'button';
    plus.setAttribute('aria-label', 'More');
    plus.addEventListener('click', onPlus);
    box.appendChild(minus);
    box.appendChild(el('span', 'val', label));
    box.appendChild(plus);
    return box;
  }

  function describe(entry, move) {
    var reps = entry.sets.map(function (s) { return s.reps; }).join(', ');
    var unit = move.unit === 'seconds' ? ' seconds' : ' reps';
    var w = entry.sets[0] && entry.sets[0].weight ? entry.sets[0].weight + ' lb, ' : '';
    return w + reps + unit;
  }

  function renderLog() {
    var root = $('log-root');
    var status = $('log-status');
    var moves = OneMoveApp.getMoves();
    if (OneMoveApp.movesFailed()) { status.hidden = false; status.textContent = "Couldn't load the move list, so the log can't be shown. Reload to try again."; return; }
    if (!store || !moves.length) return;
    var settings = OneMoveApp.getSettings();
    if (!sheet) {
      sheet = OneMove.planSession(moves, settings, entries, todayKey()).map(function (r) {
        return { move: r.move, sets: r.sets.map(function (s) { return { weight: s.weight, reps: s.reps }; }), first: r.first, done: r.done, last: r.last, skip: false, edited: false };
      });
    }
    root.textContent = '';
    status.hidden = false;
    if (store.kind === 'memory') status.textContent = "This browser isn't saving. What you log here lasts until you close the page.";
    else if (store.kind === 'browser') status.textContent = 'Saved in this browser only. It will not show on your other devices.';
    else status.textContent = 'Every set is filled in from last time. Change a number only if it differed, then log it with one tap.';

    if (!sheet.length) {
      root.appendChild(el('p', 'note', 'Your routine is empty. Open a move in Moves and tap "Add to my routine".'));
      return;
    }

    sheet.forEach(function (row) {
      var box = el('div', 'logrow' + (row.skip ? ' skipped' : ''));
      var head = el('div', 'loghead');
      head.appendChild(el('span', 'name', row.move.name));
      if (row.done) head.appendChild(el('span', 'cat', 'logged today'));
      var skip = el('button', 'chip', row.skip ? 'Skipped' : 'Skip today');
      skip.type = 'button';
      skip.setAttribute('aria-pressed', row.skip ? 'true' : 'false');
      skip.addEventListener('click', function () { row.skip = !row.skip; renderLog(); });
      head.appendChild(skip);
      box.appendChild(head);

      var hint = row.first
        ? 'First time. Pick a weight that feels about 7 out of 10 and stop with a rep or two left.'
        : row.last ? 'Last time: ' + describe(row.last, row.move) + '.' : '';
      if (hint) box.appendChild(el('p', 'note', hint));

      if (!row.skip) {
        var controls = el('div', 'logsets');
        if (row.move.load) {
          var w = row.sets[0].weight;
          controls.appendChild(stepper(w ? w + ' lb' : 'bodyweight', function () {
            var next = OneMove.stepWeight(row.move, w, -1, settings.dumbbells);
            row.sets.forEach(function (s) { s.weight = next; });
            row.edited = true;
            renderLog();
          }, function () {
            var next = OneMove.stepWeight(row.move, w, 1, settings.dumbbells);
            row.sets.forEach(function (s) { s.weight = next; });
            row.edited = true;
            renderLog();
          }));
        }
        var inc = row.move.unit === 'seconds' ? 5 : 1;
        var unit = row.move.unit === 'seconds' ? ' s' : '';
        row.sets.forEach(function (s, i) {
          controls.appendChild(stepper('Set ' + (i + 1) + ': ' + s.reps + unit, function () {
            s.reps = Math.max(inc, s.reps - inc);
            row.edited = true;
            renderLog();
          }, function () {
            s.reps += inc;
            row.edited = true;
            renderLog();
          }));
        });
        box.appendChild(controls);
      }
      root.appendChild(box);
    });

    var edited = sheet.some(function (r) { return r.edited || r.skip; });
    var allDone = sheet.every(function (r) { return r.done || r.skip; });
    var go = el('button', 'primary', busy ? 'Saving' : allDone && !edited ? 'Logged today' : edited ? 'Log it with my changes' : 'Did it as written');
    go.type = 'button';
    go.id = 'log-go';
    go.disabled = busy || (allDone && !edited);
    go.addEventListener('click', logSession);
    root.appendChild(go);
    if (allDone && !edited) root.appendChild(el('p', 'note', "Today's session is logged. Next time's numbers are already updated."));
  }

  function logSession() {
    if (busy || !sheet) return;
    busy = true;
    renderLog();
    var date = todayKey();
    var rows = sheet.filter(function (r) { return !r.skip; });
    var failed = false;
    enqueue(function () {
      // One write at a time, started inside the queue.
      var chain = Promise.resolve();
      rows.forEach(function (r) {
        chain = chain.then(function () {
          return store.add({ date: date, moveId: r.move.id, sets: r.sets });
        }).catch(function () { failed = true; });
      });
      return chain;
    }).catch(function () { failed = true; }).then(refresh).then(function () {
      busy = false;
      if (!failed) sheet = null; // on a failed save his edited numbers stay on screen
      paintAll();
      if (failed) $('log-status').textContent = "Some of that didn't save. Your numbers are still here. Check your connection and tap the button again.";
    });
  }

  // ---------- Week ----------
  function renderWeek() {
    var root = $('week-root');
    var moves = OneMoveApp.getMoves();
    if (OneMoveApp.movesFailed()) { $('week-status').textContent = "Couldn't load the move list, so the week can't be shown. Reload to try again."; return; }
    if (!store || !moves.length) return;
    $('week-status').hidden = true;
    root.textContent = '';
    var credits = OneMove.weekCredits(entries, moves, OneMove.weekStart(new Date()));
    OneMove.BARS.forEach(function (bar) {
      var got = credits[bar];
      var d = el('details', 'bar');
      var s = el('summary');
      s.appendChild(el('span', 'barname', BAR_LABEL[bar]));
      s.appendChild(el('span', 'barnum', (Math.round(got * 10) / 10) + ' of ' + TARGET));
      var track = el('span', 'bartrack');
      var fill = el('span', 'barfill');
      fill.style.width = Math.min(100, (got / TARGET) * 100) + '%';
      track.appendChild(fill);
      s.appendChild(track);
      d.appendChild(s);
      d.appendChild(el('p', 'note', BAR_MUSCLES[bar]));
      root.appendChild(d);
    });

    var settings = OneMoveApp.getSettings();
    var owned = settings.equipment.concat(settings.dumbbells.length ? ['dumbbells'] : []);
    var full = OneMove.BARS.every(function (b) { return credits[b] >= TARGET; });
    var line = el('p', 'nextline');
    if (full) {
      line.textContent = 'Every bar is full this week.';
    } else {
      var next = OneMove.nextMove(credits, TARGET, OneMove.visibleMoves(moves, owned));
      var move = next.moveId && moveById(next.moveId);
      line.appendChild(document.createTextNode('Emptiest: ' + BAR_LABEL[next.bar].toLowerCase() + '. '));
      if (move) {
        var link = el('a', '', move.name + ' fills it.');
        link.href = '#moves';
        link.addEventListener('click', function () {
          setTimeout(function () {
            var card = $('m-' + move.id);
            if (card) { card.open = true; card.scrollIntoView({ block: 'start' }); }
          }, 0);
        });
        line.appendChild(link);
      } else {
        line.appendChild(document.createTextNode('None of the moves your equipment allows fills it.'));
      }
    }
    root.appendChild(line);
    root.appendChild(el('p', 'note', 'A set counts 1 for its main muscle group and a half for a helper. 4 sets a week is a starting point, not a researched target. A volleyball night counts as an estimate: 2 for quads, 1 for glutes and hamstrings, 3 for calves and jumping. The bars start fresh every Monday.'));
  }

  function paintAll() {
    OneMoveApp.setEntries(entries);
    paintToday();
    renderLog();
    renderWeek();
  }

  // ---------- start ----------
  var storage = null;
  try { storage = window.localStorage; } catch (e) { storage = null; }
  var dbReady = window.claude && typeof window.claude.use === 'function'
    ? window.claude.use('db').catch(function () { return null; })
    : Promise.resolve(null);

  dbReady.then(function (db) {
    return OneMoveStore.open({ db: db, storage: storage });
  }).then(function (opened) {
    store = opened;
    return Promise.all([store.getSettings(), store.list()]);
  }).then(function (got) {
    var stored = got[0];
    entries = got[1];
    var local = OneMoveApp.getSettings();
    var storedEmpty = !stored.equipment.length && !stored.dumbbells.length;
    if (storedEmpty && (local.equipment.length || local.dumbbells.length)) {
      // First run with the store: carry over what was ticked in this browser.
      stored = { equipment: local.equipment.slice(), dumbbells: local.dumbbells.slice(), routine: stored.routine };
      enqueue(function () { return store.setSettings(stored); });
    }
    OneMoveApp.onChange(function () { sheet = null; paintAll(); });
    OneMoveApp.useStore(stored, function (s) {
      enqueue(function () { return store.setSettings(s); }).catch(function () {});
    });
    paintAll();
  }).catch(function () {
    $('log-status').textContent = "Couldn't open the log. Reload to try again. Today, Moves and Read still work.";
    $('week-status').textContent = "Couldn't open the log. Reload to try again.";
  });
})();
