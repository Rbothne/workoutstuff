const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const L = require(path.join(root, 'js', 'logic.js'));
const moves = JSON.parse(fs.readFileSync(path.join(root, 'data', 'moves.json'), 'utf8'));
const move = (id) => moves.find((m) => m.id === id);
const sets = (...pairs) => pairs.map(([weight, reps]) => ({ weight, reps }));
const lines = Array.from({ length: 365 }, (_, i) => ({ text: 'line ' + i }));

test('pickLine: 1 January is the first line', () => {
  assert.equal(L.pickLine(lines, new Date(2027, 0, 1)), lines[0]);
});

test('pickLine: 31 December of a normal year is the last line', () => {
  assert.equal(L.pickLine(lines, new Date(2027, 11, 31)), lines[364]);
});

test('pickLine: day 366 of a leap year wraps to the first line', () => {
  assert.equal(L.dayOfYear(new Date(2028, 11, 31)), 366);
  assert.equal(L.pickLine(lines, new Date(2028, 11, 31)), lines[0]);
});

test('dateKey is zero-padded local YYYY-MM-DD', () => {
  assert.equal(L.dateKey(new Date(2027, 0, 5, 23, 59)), '2027-01-05');
});

test('weekStart: late Sunday belongs to the week that began the Monday before', () => {
  assert.equal(L.dateKey(L.weekStart(new Date(2026, 10, 22, 23, 59))), '2026-11-16');
});

test('weekStart: Monday midnight starts a new week', () => {
  const start = L.weekStart(new Date(2026, 10, 23, 0, 0));
  assert.equal(L.dateKey(start), '2026-11-23');
  assert.equal(start.getHours(), 0);
});

test('suggestNext: every set at the top of the range moves up one step and back to the bottom reps', () => {
  assert.deepEqual(L.suggestNext(move('squat'), sets([20, 12], [20, 12], [20, 12])), { weight: 25, reps: 8 });
});

test('suggestNext: a set short of the top keeps the weight and adds a rep to the lowest', () => {
  assert.deepEqual(L.suggestNext(move('squat'), sets([20, 12], [20, 10])), { weight: 20, reps: 11 });
});

test('suggestNext: mixed weights use the lowest weight', () => {
  assert.deepEqual(L.suggestNext(move('squat'), sets([25, 9], [20, 9])), { weight: 20, reps: 10 });
});

test('suggestNext: no usable sets gives no suggestion', () => {
  assert.equal(L.suggestNext(move('squat'), []), null);
  assert.equal(L.suggestNext(move('squat'), sets([20, NaN])), null);
  assert.equal(L.suggestNext(move('squat'), undefined), null);
});

test('suggestNext: a bodyweight move at the top of its range stays there', () => {
  assert.deepEqual(L.suggestNext(move('pushup'), sets([0, 12], [0, 12])), { weight: 0, reps: 12 });
});

test('suggestNext: timed moves go up five seconds', () => {
  assert.deepEqual(L.suggestNext(move('plank'), sets([0, 20])), { weight: 0, reps: 25 });
  assert.deepEqual(L.suggestNext(move('plank'), sets([0, 58])), { weight: 0, reps: 60 });
});

test('suggestNext: steps to the next dumbbell he owns', () => {
  assert.deepEqual(L.suggestNext(move('squat'), sets([20, 12], [20, 12]), [20, 30]), { weight: 30, reps: 8 });
});

test('suggestNext: with no heavier dumbbell owned it holds at the top', () => {
  assert.deepEqual(L.suggestNext(move('squat'), sets([20, 12], [20, 12]), [20]), { weight: 20, reps: 12 });
});

test('suggestNext: bodyweight squats with no dumbbells owned do not invent a weight', () => {
  assert.deepEqual(L.suggestNext(move('squat'), sets([0, 12], [0, 12]), []), { weight: 0, reps: 12 });
});

test('weekCredits: sets and a volleyball night add up per bar', () => {
  const entries = [
    { id: 'a', date: '2026-11-17', moveId: 'squat', sets: sets([20, 8], [20, 8], [20, 8]) },
    { id: 'b', date: '2026-11-18', moveId: 'volleyball', sets: sets([0, 1]) },
  ];
  assert.deepEqual(L.weekCredits(entries, moves, new Date(2026, 10, 16)), {
    quads: 5, hips: 2.5, core: 0, push: 0, pull: 0, jump: 3,
  });
});

test('weekCredits: entries outside the week and unknown moves are left out', () => {
  const entries = [
    { id: 'a', date: '2026-11-15', moveId: 'squat', sets: sets([20, 8]) },
    { id: 'b', date: '2026-11-23', moveId: 'squat', sets: sets([20, 8]) },
    { id: 'c', date: '2026-11-17', moveId: 'nope', sets: sets([20, 8]) },
    { id: 'd', date: '2026-11-22', moveId: 'row', sets: sets([20, 8]) },
  ];
  assert.deepEqual(L.weekCredits(entries, moves, new Date(2026, 10, 16)), {
    quads: 0, hips: 0, core: 0, push: 0, pull: 1, jump: 0,
  });
});

test('nextMove: with nothing done it names quads and the squat', () => {
  const zero = { quads: 0, hips: 0, core: 0, push: 0, pull: 0, jump: 0 };
  assert.deepEqual(L.nextMove(zero, 4, moves), { bar: 'quads', moveId: 'squat' });
});

test('nextMove: names the emptiest bar and a move that fills it', () => {
  const credits = { quads: 4, hips: 4, core: 2, push: 3, pull: 0, jump: 6 };
  assert.deepEqual(L.nextMove(credits, 4, moves), { bar: 'pull', moveId: 'row' });
});

test('nextMove: only suggests from the moves it is given', () => {
  const credits = { quads: 4, hips: 4, core: 4, push: 4, pull: 0, jump: 4 };
  const noGear = L.visibleMoves(moves, []);
  assert.deepEqual(L.nextMove(credits, 4, noGear), { bar: 'pull', moveId: 'proney' });
  const noPull = noGear.filter((m) => m.id !== 'proney');
  assert.deepEqual(L.nextMove(credits, 4, noPull), { bar: 'pull', moveId: null });
});

const base = { equipment: [], dumbbells: [], routine: L.DEFAULT_ROUTINE };
const today = '2026-11-22';

test('planSession: with no equipment it lists the routine moves he can do, three sets each', () => {
  const plan = L.planSession(moves, base, [], today);
  assert.deepEqual(plan.map((r) => r.move.id), ['landing', 'squat', 'pushup', 'deadbug', 'bridge']);
  const squat = plan[1];
  assert.equal(squat.sets.length, 3);
  assert.deepEqual(squat.sets[0], { weight: 0, reps: 8 });
  assert.equal(squat.first, true);
  assert.equal(squat.done, false);
});

test('planSession: a first-time dumbbell move starts on the lightest weight that suits it', () => {
  const plan = L.planSession(moves, { ...base, dumbbells: [20, 50] }, [], today);
  const byId = Object.fromEntries(plan.map((r) => [r.move.id, r]));
  assert.equal(byId.row.sets[0].weight, 20);
  assert.equal(byId.hinge.sets[0].weight, 20);
  assert.equal(byId.squat.sets[0].weight, 0);
});

test('planSession: fills in the suggestion from the last session', () => {
  const entries = [{ id: '2026-11-15_squat', date: '2026-11-15', moveId: 'squat', sets: sets([20, 12], [20, 12], [20, 12]) }];
  const plan = L.planSession(moves, { ...base, dumbbells: [20, 50] }, entries, today);
  const squat = plan.find((r) => r.move.id === 'squat');
  assert.deepEqual(squat.sets, sets([50, 8], [50, 8], [50, 8]));
  assert.equal(squat.first, false);
});

test('planSession: what was already logged today is shown as logged, not replaced by a suggestion', () => {
  const entries = [
    { id: '2026-11-22_squat', date: today, moveId: 'squat', sets: sets([20, 9], [20, 8]) },
    { id: '2026-11-15_squat', date: '2026-11-15', moveId: 'squat', sets: sets([20, 12]) },
  ];
  const squat = L.planSession(moves, base, entries, today).find((r) => r.move.id === 'squat');
  assert.deepEqual(squat.sets, sets([20, 9], [20, 8]));
  assert.equal(squat.done, true);
});

test('planSession: a routine entry for a move that no longer exists is skipped', () => {
  const plan = L.planSession(moves, { ...base, routine: ['gone', 'squat'] }, [], today);
  assert.deepEqual(plan.map((r) => r.move.id), ['squat']);
});

test('stepWeight: moves through the dumbbells he owns', () => {
  assert.equal(L.stepWeight(move('row'), 20, 1, [20, 30, 50]), 30);
  assert.equal(L.stepWeight(move('row'), 20, -1, [20, 30, 50]), 20);
  assert.equal(L.stepWeight(move('row'), 50, 1, [20, 30, 50]), 50);
});

test('stepWeight: an optional-weight move can drop back to bodyweight', () => {
  assert.equal(L.stepWeight(move('squat'), 20, -1, [20, 50]), 0);
  assert.equal(L.stepWeight(move('squat'), 0, 1, [20, 50]), 20);
});

test('stepWeight: with no dumbbells ticked it moves in 5 lb steps and never below zero', () => {
  assert.equal(L.stepWeight(move('row'), 20, 1, []), 25);
  assert.equal(L.stepWeight(move('row'), 0, -1, []), 0);
});

test('planSession: a dumbbell move with no suitable weight starts on the lightest one he owns, never bodyweight', () => {
  const plan = L.planSession(moves, { ...base, dumbbells: [50] }, [], today);
  assert.equal(plan.find((r) => r.move.id === 'row').sets[0].weight, 50);
  assert.equal(plan.find((r) => r.move.id === 'squat').sets[0].weight, 0);
});

test('planSession: a one-set "Mark done" entry does not reset the next lift suggestion', () => {
  const entries = [
    { id: '2026-11-17_squat', date: '2026-11-17', moveId: 'squat', sets: sets([0, 8]) },
    { id: '2026-11-16_squat', date: '2026-11-16', moveId: 'squat', sets: sets([30, 12], [30, 12], [30, 12]) },
  ];
  const squat = L.planSession(moves, { ...base, dumbbells: [30, 40] }, entries, today).find((r) => r.move.id === 'squat');
  assert.deepEqual(squat.sets[0], { weight: 40, reps: 8 });
  assert.equal(squat.last.date, '2026-11-16');
});

test('planSession: a move only ever marked done on Today still counts as first time in the log', () => {
  const entries = [{ id: '2026-11-17_bridge', date: '2026-11-17', moveId: 'bridge', sets: sets([0, 10]) }];
  const bridge = L.planSession(moves, base, entries, today).find((r) => r.move.id === 'bridge');
  assert.equal(bridge.first, true);
  assert.deepEqual(bridge.sets[0], { weight: 0, reps: 10 });
});

test('lastWeight: the weight of the most recent real session, ignoring Mark done and bodyweight', () => {
  const entries = [
    { id: 'c', date: '2026-11-18', moveId: 'row', sets: sets([0, 8]) },
    { id: 'b', date: '2026-11-17', moveId: 'row', sets: sets([50, 8], [50, 8], [50, 7]) },
    { id: 'a', date: '2026-11-10', moveId: 'row', sets: sets([30, 8], [30, 8]) },
    { id: 'd', date: '2026-11-17', moveId: 'pushup', sets: sets([0, 8], [0, 8]) },
  ];
  assert.equal(L.lastWeight(entries, 'row'), 50);
  assert.equal(L.lastWeight(entries, 'pushup'), null);
  assert.equal(L.lastWeight(entries, 'hinge'), null);
  assert.equal(L.lastWeight(undefined, 'row'), null);
});
