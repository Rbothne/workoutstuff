const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const L = require(path.join(root, 'js', 'logic.js'));
const Store = require(path.join(root, 'js', 'store.js'));
const moves = JSON.parse(fs.readFileSync(path.join(root, 'data', 'moves.json'), 'utf8'));
const move = (id) => moves.find((m) => m.id === id);
const sets = (...pairs) => pairs.map(([weight, reps]) => ({ weight, reps }));
const base = { equipment: [], dumbbells: [20, 30, 50], routine: ['squat', 'row', 'pushup'], prefs: {} };
const today = '2026-11-23';
const PURPOSES = ['Explosiveness', 'Strength', 'Endurance', 'Joint protection', 'Climbing', 'Mobility and posture'];

// ---- what each move is for ----
test('every card move says what it is for, with one or two purposes from the list', () => {
  for (const m of moves) {
    if (m.id === 'volleyball') continue;
    assert.ok(Array.isArray(m.for) && m.for.length >= 1 && m.for.length <= 2, m.id);
    for (const p of m.for) assert.ok(PURPOSES.includes(p), `${m.id}: ${p}`);
  }
  assert.deepEqual(L.PURPOSES, PURPOSES);
});

// ---- main bar and replacements ----
test('mainBar is the bar a move credits in full, or null', () => {
  assert.equal(L.mainBar(move('squat')), 'quads');
  assert.equal(L.mainBar(move('hinge')), 'hips');
  assert.equal(L.mainBar(move('hipflexor')), null);
});

test('replacementsFor lists other moves with the same main bar, never the move itself or volleyball', () => {
  const ids = L.replacementsFor(moves, 'squat').map((m) => m.id);
  assert.ok(ids.includes('splitsquat'));
  assert.ok(!ids.includes('squat'));
  assert.ok(!ids.includes('volleyball'));
  assert.ok(L.replacementsFor(moves, 'row').map((m) => m.id).includes('deadhang'));
  assert.deepEqual(L.replacementsFor(moves, 'hipflexor'), []);
  assert.deepEqual(L.replacementsFor(moves, 'nope'), []);
});

// ---- week bars ----
test('emptiestBars gives the n bars furthest from full, ties in bar order', () => {
  const c = { quads: 6, hips: 9, core: 2, push: 3, pull: 2, jump: 7 };
  assert.deepEqual(L.emptiestBars(c, 2), ['core', 'pull']);
  assert.deepEqual(L.emptiestBars({ quads: 0, hips: 0, core: 0, push: 0, pull: 0, jump: 0 }, 2), ['quads', 'hips']);
});

test('barLayers fills the first round, then paints each extra round over it', () => {
  assert.deepEqual(L.barLayers(0, 4), []);
  assert.deepEqual(L.barLayers(3, 4), [0.75]);
  assert.deepEqual(L.barLayers(4, 4), [1]);
  assert.deepEqual(L.barLayers(6, 4), [1, 0.5]);
  assert.deepEqual(L.barLayers(13, 4), [1, 1, 1, 0.25]);
  assert.deepEqual(L.barLayers(40, 4), [1, 1, 1, 1], 'never more than four layers');
});

// ---- related reading ----
test('relatedArticles picks the articles most linked to the routine, at most four', () => {
  const ids = L.relatedArticles(moves, ['squat', 'row', 'landing', 'deadhang']);
  assert.ok(ids.length >= 1 && ids.length <= 4);
  assert.ok(ids.includes('strength-training'));
  assert.ok(ids.includes('climbing'), 'dead hang and row are for climbing');
  assert.deepEqual(L.relatedArticles(moves, []), ['habits', 'strength']);
});

// ---- the day's plan, with sticky preferences ----
test('planSession uses the routine order and three sets when he has set nothing', () => {
  const plan = L.planSession(moves, base, [], today);
  assert.deepEqual(plan.map((r) => r.move.id), ['squat', 'row', 'pushup']);
  assert.equal(plan[1].sets.length, 3);
  assert.equal(plan[1].status, null);
});

test('a chosen set count sticks for every later session', () => {
  const settings = { ...base, prefs: { pushup: { sets: 4, reps: 8, weight: 0, date: '2026-11-10' } } };
  const entries = [{ id: '2026-11-16_pushup', date: '2026-11-16', moveId: 'pushup', sets: sets([0, 9], [0, 9], [0, 9], [0, 9]) }];
  const push = L.planSession(moves, settings, entries, today).find((r) => r.move.id === 'pushup');
  assert.equal(push.sets.length, 4);
  assert.deepEqual(push.sets[0], { weight: 0, reps: 10 }, 'progression still builds on the last session');
});

test('numbers he changed after his last session open as he left them', () => {
  const settings = { ...base, prefs: { row: { sets: 3, reps: 9, weight: 30, date: '2026-11-20' } } };
  const entries = [{ id: '2026-11-16_row', date: '2026-11-16', moveId: 'row', sets: sets([20, 12], [20, 12], [20, 12]) }];
  const row = L.planSession(moves, settings, entries, today).find((r) => r.move.id === 'row');
  assert.deepEqual(row.sets, sets([30, 9], [30, 9], [30, 9]));
});

test('a session logged after his last change takes over, so progression continues', () => {
  const settings = { ...base, prefs: { row: { sets: 3, reps: 9, weight: 30, date: '2026-11-16' } } };
  const entries = [{ id: '2026-11-16_row', date: '2026-11-16', moveId: 'row', sets: sets([30, 12], [30, 12], [30, 12]) }];
  const row = L.planSession(moves, settings, entries, today).find((r) => r.move.id === 'row');
  assert.deepEqual(row.sets[0], { weight: 50, reps: 8 });
});

test('a move with preferences but no sessions opens with his preferences', () => {
  const settings = { ...base, prefs: { squat: { sets: 5, reps: 6, weight: 50, date: '2026-11-22' } } };
  const squat = L.planSession(moves, settings, [], today).find((r) => r.move.id === 'squat');
  assert.deepEqual(squat.sets, sets([50, 6], [50, 6], [50, 6], [50, 6], [50, 6]));
});

test('today\'s completed and passed moves are reported as such', () => {
  const entries = [
    { id: today + '_squat', date: today, moveId: 'squat', sets: sets([30, 10], [30, 10], [30, 10]) },
    { id: today + '_row', date: today, moveId: 'row', sets: [], pass: true },
  ];
  const plan = L.planSession(moves, base, entries, today);
  assert.equal(plan[0].status, 'done');
  assert.deepEqual(plan[0].sets, sets([30, 10], [30, 10], [30, 10]));
  assert.equal(plan[1].status, 'pass');
  assert.equal(plan[1].sets.length, 3, 'a passed move still shows its planned numbers');
});

test('a pass never counts as a last session and adds nothing to the week', () => {
  const entries = [
    { id: '2026-11-20_row', date: '2026-11-20', moveId: 'row', sets: [], pass: true },
    { id: '2026-11-16_row', date: '2026-11-16', moveId: 'row', sets: sets([20, 10], [20, 10], [20, 10]) },
  ];
  const row = L.planSession(moves, base, entries, today).find((r) => r.move.id === 'row');
  assert.equal(row.last.date, '2026-11-16');
  const credits = L.weekCredits(entries, moves, new Date(2026, 10, 16));
  assert.equal(credits.pull, 3);
});

test('stepSets stays between one and six', () => {
  assert.equal(L.stepSets(3, 1), 4);
  assert.equal(L.stepSets(6, 1), 6);
  assert.equal(L.stepSets(1, -1), 1);
});

// ---- preferences are kept by the store ----
test('the store keeps per-move preferences in settings', async () => {
  const store = await Store.open({});
  const s = await store.getSettings();
  assert.deepEqual(s.prefs, {});
  await store.setSettings({ ...s, prefs: { row: { sets: 4, reps: 9, weight: 30, date: '2026-11-22' } } });
  assert.deepEqual((await store.getSettings()).prefs.row, { sets: 4, reps: 9, weight: 30, date: '2026-11-22' });
});

test('the store drops malformed preferences instead of failing', async () => {
  const store = await Store.open({});
  await store.setSettings({ equipment: [], dumbbells: [], routine: [], prefs: { a: { sets: 'x' }, b: null, row: { sets: 4, reps: 9, weight: 30, date: '2026-11-22' } } });
  assert.deepEqual(Object.keys((await store.getSettings()).prefs), ['row']);
});

test('movesForArticle lists the moves whose purposes that article explains', () => {
  const climbing = L.movesForArticle(moves, 'climbing').map((m) => m.id);
  assert.ok(climbing.includes('deadhang') && climbing.includes('row'));
  assert.ok(!climbing.includes('squat'));
  assert.deepEqual(L.movesForArticle(moves, 'eating'), []);
});

// ---- bank tags ----
test('with no tags picked, every move shows', () => {
  assert.equal(L.filterByTags(moves, []).length, moves.length);
});

test('several purposes show moves for any of them', () => {
  const ids = L.filterByTags(moves, ['Climbing', 'Explosiveness']).map((m) => m.id);
  assert.ok(ids.includes('deadhang') && ids.includes('pogo'));
  assert.ok(!ids.includes('plank'));
  for (const id of ids) assert.ok(move(id).for.some((p) => p === 'Climbing' || p === 'Explosiveness'), id);
});

test('Staples narrows the purposes picked, and alone shows every staple', () => {
  assert.deepEqual(L.filterByTags(moves, ['Staples']).map((m) => m.id), moves.filter((m) => m.staple).map((m) => m.id));
  const ids = L.filterByTags(moves, ['Staples', 'Explosiveness']).map((m) => m.id);
  assert.ok(ids.includes('landing') && ids.includes('squat'));
  assert.ok(!ids.includes('pogo') && !ids.includes('plank'));
});
