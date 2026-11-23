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
  assert.deepEqual(L.nextMove(credits, 4, noGear), { bar: 'pull', moveId: null });
});
