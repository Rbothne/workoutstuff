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

  return {
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
