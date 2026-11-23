// Pure rules for One Move. Runs in the browser (global OneMove) and in Node (module.exports).
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OneMove = api;
})(typeof self !== 'undefined' ? self : this, function () {
  var DEFAULT_ROUTINE = ['landing', 'squat', 'hinge', 'row', 'pushup', 'deadbug', 'bridge'];
  // Starting guesses for what counts as a light or medium dumbbell before he has logged a move.
  var LOAD_CEILING = { light: 15, medium: 35, heavy: Infinity };

  function visibleMoves(moves, owned) {
    return moves.filter(function (m) {
      if (m.id === 'volleyball') return false;
      return m.equipment.every(function (e) { return e === 'none' || owned.indexOf(e) !== -1; });
    });
  }

  function suitableWeights(move, owned, lastWeight) {
    var sorted = owned.slice().sort(function (a, b) { return a - b; });
    if (lastWeight === null || lastWeight === undefined) {
      if (!move.load) return [];
      var ceiling = LOAD_CEILING[move.load];
      return sorted.filter(function (w) { return w <= ceiling; });
    }
    var above = sorted.filter(function (w) { return w > lastWeight; });
    var top = above.length ? above[0] : lastWeight;
    return sorted.filter(function (w) { return w >= lastWeight / 2 && w <= top; });
  }

  // Today's move must need nothing and ask little: no equipment, light or moderate effort.
  function todayPool(moves, owned) {
    return visibleMoves(moves, owned).filter(function (m) {
      var bare = m.equipment.length === 1 && m.equipment[0] === 'none';
      return bare && m.effort !== 'hard' && (m.logged || m.id === 'hipflexor');
    });
  }

  function todayMove(moves, owned, dayNum) {
    var pool = todayPool(moves, owned);
    return pool.length ? pool[((dayNum % pool.length) + pool.length) % pool.length] : null;
  }

  var BARS = ['quads', 'hips', 'core', 'push', 'pull', 'jump'];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function dateKey(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function dayOfYear(date) {
    var start = Date.UTC(date.getFullYear(), 0, 1);
    var day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.round((day - start) / 86400000) + 1;
  }

  function pickLine(lines, date) {
    return lines[(dayOfYear(date) - 1) % lines.length];
  }

  function weekStart(date) {
    var sinceMonday = (date.getDay() + 6) % 7;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - sinceMonday);
  }

  function suggestNext(move, lastSets, owned) {
    owned = owned || [];
    var usable = (lastSets || []).filter(function (s) { return isFinite(s.reps) && s.reps > 0; });
    if (!usable.length) return null;
    var w = Math.min.apply(null, usable.map(function (s) { return isFinite(s.weight) ? s.weight : 0; }));
    var low = Math.min.apply(null, usable.map(function (s) { return s.reps; }));
    if (low >= move.max) {
      if (move.step <= 0) return { weight: w, reps: move.max };
      if (move.load && owned.length) {
        var above = owned.filter(function (x) { return x > w; }).sort(function (a, b) { return a - b; });
        return above.length ? { weight: above[0], reps: move.min } : { weight: w, reps: move.max };
      }
      if (move.load && w === 0) return { weight: 0, reps: move.max };
      return { weight: w + move.step, reps: move.min };
    }
    var inc = move.unit === 'seconds' ? 5 : 1;
    return { weight: w, reps: Math.min(move.max, low + inc) };
  }

  function weekCredits(entries, moves, weekStartDate) {
    var from = dateKey(weekStartDate);
    var to = dateKey(new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + 7));
    var byId = {};
    moves.forEach(function (m) { byId[m.id] = m; });
    var totals = {};
    BARS.forEach(function (b) { totals[b] = 0; });
    (entries || []).forEach(function (e) {
      var m = byId[e.moveId];
      if (!m || !(e.date >= from && e.date < to)) return;
      var count = Array.isArray(e.sets) ? e.sets.length : 0;
      Object.keys(m.credits).forEach(function (bar) { totals[bar] += m.credits[bar] * count; });
    });
    return totals;
  }

  function nextMove(credits, target, moves) {
    var bar = BARS[0];
    BARS.forEach(function (b) {
      if ((credits[b] || 0) / target < (credits[bar] || 0) / target) bar = b;
    });
    var fit = moves.filter(function (m) { return m.id !== 'volleyball' && m.credits[bar] === 1; })[0];
    return { bar: bar, moveId: fit ? fit.id : null };
  }

  var SETS_PER_MOVE = 3;
  var PURPOSES = ['Explosiveness', 'Strength', 'Endurance', 'Joint protection', 'Climbing', 'Mobility and posture'];
  // Which articles explain each purpose, most relevant first.
  var PURPOSE_READING = {
    Strength: ['strength-training', 'strength'], Explosiveness: ['volleyball'], 'Joint protection': ['injury'],
    Climbing: ['climbing'], Endurance: ['walking', 'energy'], 'Mobility and posture': ['injury'],
  };
  var READING_ORDER = ['strength-training', 'strength', 'climbing', 'volleyball', 'injury', 'walking', 'energy'];

  // A lift session: logged from Train (kind "lift"), or an older entry with more than one set.
  // A "Mark done" tap on Today's move logs one set and a pass logs none; neither sets the next suggestion.
  function isSession(entry) {
    if (!Array.isArray(entry.sets) || entry.pass) return false;
    return entry.kind === 'lift' ? entry.sets.length > 0 : entry.sets.length > 1;
  }

  function mainBar(move) {
    var bars = Object.keys(move.credits || {}).filter(function (b) { return move.credits[b] === 1; });
    return bars.length ? BARS.filter(function (b) { return bars.indexOf(b) !== -1; })[0] : null;
  }

  function replacementsFor(moves, moveId) {
    var target = moves.filter(function (m) { return m.id === moveId; })[0];
    var bar = target ? mainBar(target) : null;
    if (!bar) return [];
    return moves.filter(function (m) { return m.id !== moveId && m.id !== 'volleyball' && mainBar(m) === bar; });
  }

  function emptiestBars(credits, n) {
    return BARS.slice().sort(function (a, b) { return (credits[a] || 0) - (credits[b] || 0) || BARS.indexOf(a) - BARS.indexOf(b); }).slice(0, n);
  }

  // Widths (0 to 1) of up to four layers: the first round of the target, then each extra round painted over it.
  function barLayers(value, target) {
    var layers = [];
    var rounds = target > 0 ? value / target : 0;
    for (var k = 0; k < 4 && rounds - k > 0; k++) layers.push(Math.round(Math.min(1, rounds - k) * 1000) / 1000);
    return layers;
  }

  function relatedArticles(moves, routine) {
    var byId = {};
    moves.forEach(function (m) { byId[m.id] = m; });
    var count = {};
    (routine || []).forEach(function (id) {
      var m = byId[id];
      if (!m || !m.for) return;
      var seen = {};
      m.for.forEach(function (p) { (PURPOSE_READING[p] || []).forEach(function (a) { if (!seen[a]) { seen[a] = 1; count[a] = (count[a] || 0) + 1; } }); });
    });
    var ids = Object.keys(count).sort(function (a, b) { return count[b] - count[a] || READING_ORDER.indexOf(a) - READING_ORDER.indexOf(b); });
    return ids.length ? ids.slice(0, 4) : ['habits', 'strength'];
  }

  function stepSets(n, dir) { return Math.max(1, Math.min(6, n + dir)); }

  function movesForArticle(moves, articleId) {
    return moves.filter(function (m) {
      return m.id !== 'volleyball' && (m.for || []).some(function (p) { return (PURPOSE_READING[p] || []).indexOf(articleId) !== -1; });
    });
  }

  // The weight he last really lifted for a move, or null if he never logged a weighted session of it.
  function lastWeight(entries, moveId) {
    var sessions = (entries || []).filter(function (e) { return e.moveId === moveId && isSession(e); })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    if (!sessions.length) return null;
    var w = Math.min.apply(null, sessions[0].sets.map(function (s) { return isFinite(s.weight) ? s.weight : 0; }));
    return w > 0 ? w : null;
  }

  // The day's lifting sheet: his routine, limited to what his equipment allows, each move pre-filled.
  // His own choices stick: the set count he last chose always applies, and numbers he changed after his
  // last session open as he left them. Once a newer session is logged, progression builds from it.
  function planSession(moves, settings, entries, todayKey) {
    var owned = settings.equipment.concat(settings.dumbbells.length ? ['dumbbells'] : []);
    var prefsAll = settings.prefs || {};
    var visible = {};
    visibleMoves(moves, owned).forEach(function (m) { visible[m.id] = m; });
    var rows = [];
    settings.routine.forEach(function (id) {
      var move = visible[id];
      if (!move || !move.logged) return;
      var pref = prefsAll[id] || null;
      var count = pref && pref.sets ? pref.sets : SETS_PER_MOVE;
      var mine = (entries || []).filter(function (e) { return e.moveId === id; })
        .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      var todays = mine.filter(function (e) { return e.date === todayKey; })[0];
      var last = mine.filter(function (e) { return e.date < todayKey && isSession(e); })[0];
      var status = todays ? (todays.pass ? 'pass' : 'done') : null;
      var sets;
      if (status === 'done') {
        sets = todays.sets.map(function (s) { return { weight: s.weight, reps: s.reps }; });
      } else {
        var next = null;
        if (pref && (!last || pref.date > last.date)) next = { weight: pref.weight, reps: pref.reps };
        else if (last) next = suggestNext(move, last.sets, settings.dumbbells);
        if (!next) {
          var start = 0;
          if (move.load && move.equipment.indexOf('dumbbells') !== -1 && settings.dumbbells.length) {
            var fit = suitableWeights(move, settings.dumbbells, null);
            // Nothing suitable: the move still needs a dumbbell, so use the lightest he has.
            start = fit.length ? fit[0] : Math.min.apply(null, settings.dumbbells);
          }
          next = { weight: start, reps: move.min };
        }
        sets = [];
        for (var i = 0; i < count; i++) sets.push({ weight: next.weight, reps: next.reps });
      }
      rows.push({ move: move, sets: sets, status: status, first: !last && !todays, done: status === 'done', last: last || null });
    });
    return rows;
  }

  function stepWeight(move, weight, dir, owned) {
    var sorted = (owned || []).slice().sort(function (a, b) { return a - b; });
    if (!sorted.length) return Math.max(0, weight + dir * 5);
    if (dir > 0) {
      var up = sorted.filter(function (w) { return w > weight; });
      return up.length ? up[0] : weight;
    }
    var down = sorted.filter(function (w) { return w < weight; });
    if (down.length) return down[down.length - 1];
    return move.equipment.indexOf('dumbbells') === -1 ? 0 : weight;
  }

  return {
    PURPOSES: PURPOSES,
    mainBar: mainBar,
    replacementsFor: replacementsFor,
    emptiestBars: emptiestBars,
    barLayers: barLayers,
    relatedArticles: relatedArticles,
    stepSets: stepSets,
    movesForArticle: movesForArticle,
    isSession: isSession,
    planSession: planSession,
    lastWeight: lastWeight,
    stepWeight: stepWeight,
    BARS: BARS,
    dateKey: dateKey,
    dayOfYear: dayOfYear,
    pickLine: pickLine,
    weekStart: weekStart,
    suggestNext: suggestNext,
    weekCredits: weekCredits,
    nextMove: nextMove,
    todayPool: todayPool,
    todayMove: todayMove,
    DEFAULT_ROUTINE: DEFAULT_ROUTINE,
    visibleMoves: visibleMoves,
    suitableWeights: suitableWeights,
  };
});
