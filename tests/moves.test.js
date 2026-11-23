const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const loadMoves = () => JSON.parse(fs.readFileSync(path.join(root, 'data', 'moves.json'), 'utf8'));
const loadLogic = () => require(path.join(root, 'js', 'logic.js'));

const CATEGORIES = ['legs', 'hips', 'core', 'push', 'pull', 'jump', 'mobility', 'cardio'];
const EQUIPMENT = ['none', 'dumbbells', 'bench', 'pullup-bar', 'band', 'step', 'treadmill'];
const TYPES = ['strength', 'power', 'cardio', 'mobility'];
const EFFORTS = ['light', 'moderate', 'hard'];
const BARS = ['quads', 'hips', 'core', 'push', 'pull', 'jump'];
const MUSCLE_BAR = {
  quads: 'quads', glutes: 'hips', hamstrings: 'hips',
  abs: 'core', obliques: 'core', 'lower-back': 'core',
  chest: 'push', shoulders: 'push', triceps: 'push',
  lats: 'pull', 'upper-back': 'pull', biceps: 'pull', forearms: 'pull',
  calves: 'jump', 'hip-flexors': null,
};

function derive(move) {
  const credits = {};
  if (!move.logged) return credits;
  for (const m of move.secondary) if (MUSCLE_BAR[m]) credits[MUSCLE_BAR[m]] = 0.5;
  for (const m of move.primary) if (MUSCLE_BAR[m]) credits[MUSCLE_BAR[m]] = 1;
  return credits;
}

test('moves file has 22 entries with unique ids', () => {
  const moves = loadMoves();
  assert.equal(moves.length, 22);
  assert.equal(new Set(moves.map((m) => m.id)).size, 22);
});

test('every tag comes from the allowed lists', () => {
  for (const m of loadMoves()) {
    assert.ok(CATEGORIES.includes(m.category), `${m.id} category`);
    assert.ok(m.equipment.length > 0 && m.equipment.every((e) => EQUIPMENT.includes(e)), `${m.id} equipment`);
    assert.ok(TYPES.includes(m.type), `${m.id} type`);
    assert.ok(EFFORTS.includes(m.effort), `${m.id} effort`);
    for (const mu of [...m.primary, ...m.secondary]) assert.ok(mu in MUSCLE_BAR, `${m.id} muscle ${mu}`);
    assert.ok(['reps', 'seconds'].includes(m.unit), `${m.id} unit`);
    assert.ok(Object.keys(m.credits).every((b) => BARS.includes(b)), `${m.id} credit keys`);
    assert.ok(m.min <= m.max, `${m.id} min <= max`);
  }
});

test('credits are derived from muscles, except volleyball', () => {
  for (const m of loadMoves()) {
    if (m.id === 'volleyball') continue;
    assert.deepEqual(m.credits, derive(m), m.id);
  }
});

test('volleyball credits are the hand-set estimate and it is not logged', () => {
  const v = loadMoves().find((m) => m.id === 'volleyball');
  assert.deepEqual(v.credits, { quads: 2, hips: 1, jump: 3 });
  assert.equal(v.logged, false);
});

test('every dumbbell move states a load, and only squat and split squat add one without dumbbells', () => {
  for (const m of loadMoves()) {
    if (m.equipment.includes('dumbbells')) {
      assert.ok(['light', 'medium', 'heavy'].includes(m.load), `${m.id} load`);
    } else if (m.id === 'squat' || m.id === 'splitsquat') {
      assert.equal(m.load, 'heavy');
    } else {
      assert.equal(m.load, null, `${m.id} load`);
    }
  }
});

test('default routine names logged moves that exist', () => {
  const moves = loadMoves();
  const { DEFAULT_ROUTINE } = loadLogic();
  assert.deepEqual(DEFAULT_ROUTINE, ['landing', 'squat', 'hinge', 'row', 'pushup', 'deadbug', 'bridge']);
  for (const id of DEFAULT_ROUTINE) assert.equal(moves.find((m) => m.id === id).logged, true, id);
});

test('with no equipment, twelve cards are visible and volleyball never is', () => {
  const { visibleMoves } = loadLogic();
  const ids = visibleMoves(loadMoves(), []).map((m) => m.id);
  assert.equal(ids.length, 12);
  assert.ok(!ids.includes('volleyball'));
  assert.ok(!ids.includes('row'));
});

test('dumbbells add row, hinge, overhead press and lateral raise but not bench press', () => {
  const { visibleMoves } = loadLogic();
  const ids = visibleMoves(loadMoves(), ['dumbbells']).map((m) => m.id);
  for (const id of ['row', 'hinge', 'overheadpress', 'lateralraise']) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes('benchpress'));
  assert.equal(ids.length, 16);
});

test('dumbbells and a bench add bench press', () => {
  const { visibleMoves } = loadLogic();
  const ids = visibleMoves(loadMoves(), ['dumbbells', 'bench']).map((m) => m.id);
  assert.ok(ids.includes('benchpress'));
});

test('a lone 50 lb dumbbell suits squats and not lateral raises before any log', () => {
  const { suitableWeights } = loadLogic();
  const moves = loadMoves();
  const byId = (id) => moves.find((m) => m.id === id);
  assert.deepEqual(suitableWeights(byId('lateralraise'), [50], null), []);
  assert.deepEqual(suitableWeights(byId('squat'), [50], null), [50]);
  assert.deepEqual(suitableWeights(byId('row'), [10, 30, 50], null), [10, 30]);
});

test("today's move comes from no-equipment, light or moderate moves and rotates by day", () => {
  const { todayPool, todayMove } = loadLogic();
  const moves = loadMoves();
  assert.deepEqual(
    todayPool(moves, []).map((m) => m.id),
    ['squat', 'bridge', 'deadbug', 'hipflexor', 'landing', 'pushup', 'splitsquat', 'calfraise', 'plank', 'sideplank'],
  );
  assert.equal(todayMove(moves, [], 0).id, 'squat');
  assert.equal(todayMove(moves, [], 3).id, 'hipflexor');
  assert.equal(todayMove(moves, ['dumbbells', 'bench'], 10).id, 'squat');
});

test('after a log, suitable weights run from half the last weight to the next owned weight above it', () => {
  const { suitableWeights } = loadLogic();
  const row = loadMoves().find((m) => m.id === 'row');
  assert.deepEqual(suitableWeights(row, [5, 10, 20, 25, 30, 50], 20), [10, 20, 25]);
});
