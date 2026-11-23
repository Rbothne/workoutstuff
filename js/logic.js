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

  return {
    todayPool: todayPool,
    todayMove: todayMove,
    DEFAULT_ROUTINE: DEFAULT_ROUTINE,
    visibleMoves: visibleMoves,
    suitableWeights: suitableWeights,
  };
});
