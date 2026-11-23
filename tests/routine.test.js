const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const L = require(path.join(root, 'js', 'logic.js'));
const moves = JSON.parse(fs.readFileSync(path.join(root, 'data', 'moves.json'), 'utf8'));
const byId = (id) => moves.find((m) => m.id === id);
const monday = new Date(2026, 10, 23);
const daysBefore = (n) => L.dateKey(new Date(2026, 10, 23 - n));
const lift = (date, moveId) => ({ date, moveId, kind: 'lift', sets: [{ weight: 0, reps: 8 }, { weight: 0, reps: 8 }] });
const passed = (date, moveId) => ({ date, moveId, pass: true, sets: [] });
const vb = (date) => ({ date, moveId: 'volleyball', sets: [{ weight: 0, reps: 1 }] });
const settings = (over) => Object.assign({ equipment: [], dumbbells: [20, 30, 50], routine: L.DEFAULT_ROUTINE.slice(), prefs: {}, locked: [] }, over);
const bars = (ids) => ids.map((id) => L.mainBar(byId(id)));

// ---- favourites ----
test('favourites rise with what he completes and fall with what he passes, older days counting less', () => {
  const f = L.favorites([lift(daysBefore(1), 'squat'), lift(daysBefore(60), 'plank'), passed(daysBefore(1), 'pushup')], monday);
  assert.ok(f.squat > 0.9);
  assert.ok(f.plank > 0 && f.plank < 0.25);
  assert.ok(f.pushup < 0);
  assert.equal(f.volleyball, undefined);
});

// ---- the week ahead ----
test('with no history the week ahead assumes three volleyball nights and two lifts', () => {
  const p = L.projectWeek([], moves, monday);
  assert.deepEqual(p.credits, { quads: 6, hips: 3, core: 0, push: 0, pull: 0, jump: 9 });
  assert.equal(p.liftsLeft, 2);
});

test('volleyball already played this week is not projected again', () => {
  const p = L.projectWeek([vb(daysBefore(-1)), vb(daysBefore(-2)), vb(daysBefore(-3))], moves, new Date(2026, 10, 27));
  assert.equal(p.credits.jump, 9);
});

test('the projection follows his last four weeks when there are any', () => {
  const history = [1, 2, 3, 4].map((w) => lift(daysBefore(7 * w), 'squat'));
  const p = L.projectWeek(history, moves, monday);
  assert.equal(p.credits.jump, 0, 'no volleyball in four weeks, so none projected');
  assert.equal(p.liftsLeft, 1);
});

// ---- generating ----
test('a generated routine keeps its length, uses only loggable moves his gear allows, and never volleyball', () => {
  const out = L.generateRoutine(moves, settings(), [], monday, 0);
  assert.equal(out.length, 7);
  assert.equal(new Set(out).size, 7);
  const allowed = L.visibleMoves(moves, ['dumbbells']).filter((m) => m.logged).map((m) => m.id);
  for (const id of out) assert.ok(allowed.includes(id), id);
});

test('a full routine trains every muscle group his gear can reach', () => {
  assert.deepEqual(new Set(bars(L.generateRoutine(moves, settings(), [], monday, 0))), new Set(L.BARS));
  const bare = L.generateRoutine(moves, settings({ dumbbells: [] }), [], monday, 0);
  assert.deepEqual(new Set(bars(bare)), new Set(['quads', 'hips', 'core', 'push', 'jump']), 'no pull move needs nothing');
});

test('locked moves stay where they are', () => {
  const s = settings({ locked: ['row', 'bridge'] });
  for (let turn = 0; turn < 6; turn++) {
    const out = L.generateRoutine(moves, s, [], monday, turn);
    assert.equal(out[3], 'row');
    assert.equal(out[6], 'bridge');
  }
});

test('moves already logged or passed today stay', () => {
  const out = L.generateRoutine(moves, settings(), [lift(L.dateKey(monday), 'squat'), passed(L.dateKey(monday), 'pushup')], monday, 3);
  assert.equal(out[1], 'squat');
  assert.equal(out[4], 'pushup');
});

test('pressing it again rotates through every move he could do', () => {
  const pool = L.visibleMoves(moves, ['dumbbells', 'bench', 'band']).filter((m) => m.logged).map((m) => m.id);
  const seen = new Set();
  for (let turn = 0; turn < 8; turn++) L.generateRoutine(moves, settings({ equipment: ['bench', 'band'] }), [], monday, turn).forEach((id) => seen.add(id));
  assert.deepEqual([...seen].sort(), pool.sort());
});

test('the first pick in each group is his favourite', () => {
  const out = L.generateRoutine(moves, settings(), [lift(daysBefore(2), 'sideplank'), lift(daysBefore(9), 'sideplank')], monday, 0);
  assert.ok(out.includes('sideplank'));
});

test('a volleyball week steers a short routine to core, push and pull; a week without it starts from the legs', () => {
  const short = settings({ routine: ['squat', 'hinge', 'row'] });
  assert.deepEqual(new Set(bars(L.generateRoutine(moves, short, [], monday, 0))), new Set(['core', 'push', 'pull']));
  const noVolleyball = [1, 2, 3, 4].map((w) => lift(daysBefore(7 * w), 'plank'));
  // The squat already half-fills glutes and hamstrings, so the third slot goes to push.
  assert.deepEqual(new Set(bars(L.generateRoutine(moves, short, noVolleyball, monday, 0))), new Set(['quads', 'core', 'push']));
});

test('new moves are ordered jumps first and core last', () => {
  const out = bars(L.generateRoutine(moves, settings(), [], monday, 0));
  const order = ['jump', 'quads', 'hips', 'push', 'pull', 'core'];
  for (let i = 1; i < out.length; i++) assert.ok(order.indexOf(out[i - 1]) <= order.indexOf(out[i]), out.join(' '));
});

test('an empty routine generates the usual seven', () => {
  assert.equal(L.generateRoutine(moves, settings({ routine: [] }), [], monday, 0).length, 7);
});
