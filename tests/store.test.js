const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const Store = require(path.join(__dirname, '..', 'js', 'store.js'));
const { DEFAULT_ROUTINE } = require(path.join(__dirname, '..', 'js', 'logic.js'));

const entry = (date, moveId, reps) => ({ date, moveId, sets: [{ weight: 20, reps }] });

// A stand-in for browser storage.
function fakeStorage({ broken = false } = {}) {
  const map = new Map();
  return {
    getItem(k) { if (broken) throw new Error('blocked'); return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { if (broken) throw new Error('blocked'); map.set(k, String(v)); },
  };
}

// A stand-in for the artifact database: just enough of the documented surface.
function fakeDb({ broken = false } = {}) {
  const docs = new Map();
  const snap = (p) => ({ id: p.split('/').pop(), exists: docs.has(p), data: () => docs.get(p) });
  const doc = (p) => ({
    get: async () => { if (broken) throw { code: 'unavailable' }; return snap(p); },
    set: async (d) => { if (broken) throw { code: 'unavailable' }; docs.set(p, JSON.parse(JSON.stringify(d))); },
    delete: async () => { docs.delete(p); },
  });
  const collection = (c) => {
    const q = {
      orderBy: () => q,
      limit: () => q,
      doc: (id) => doc(c + '/' + id),
      get: async () => {
        if (broken) throw { code: 'unavailable' };
        const found = [...docs.keys()].filter((k) => k.startsWith(c + '/')).map(snap);
        return { docs: found, size: found.length, empty: !found.length };
      },
    };
    return q;
  };
  return { doc, collection };
}

test('with nothing to save to, the store keeps entries in memory and says so', async () => {
  const store = await Store.open({});
  assert.equal(store.kind, 'memory');
  await store.add(entry('2026-11-22', 'squat', 8));
  const all = await store.list();
  assert.equal(all.length, 1);
  assert.equal(all[0].id, '2026-11-22_squat');
  assert.equal(all[0].sets[0].reps, 8);
});

test('logging the same move twice on one day keeps one entry with the later values', async () => {
  const store = await Store.open({});
  await store.add(entry('2026-11-22', 'squat', 8));
  await store.add(entry('2026-11-22', 'squat', 10));
  const all = await store.list();
  assert.equal(all.length, 1);
  assert.equal(all[0].sets[0].reps, 10);
});

test('remove deletes an entry', async () => {
  const store = await Store.open({});
  await store.add(entry('2026-11-22', 'squat', 8));
  await store.remove('2026-11-22_squat');
  assert.deepEqual(await store.list(), []);
});

test('settings start at the defaults and round-trip', async () => {
  const store = await Store.open({});
  assert.deepEqual(await store.getSettings(), { equipment: [], dumbbells: [], routine: DEFAULT_ROUTINE });
  await store.setSettings({ equipment: ['bench'], dumbbells: [20, 50], routine: ['squat'] });
  assert.deepEqual(await store.getSettings(), { equipment: ['bench'], dumbbells: [20, 50], routine: ['squat'] });
});

test('browser storage is used when there is no database, and survives reopening', async () => {
  const storage = fakeStorage();
  const first = await Store.open({ storage });
  assert.equal(first.kind, 'browser');
  await first.add(entry('2026-11-22', 'row', 9));
  const second = await Store.open({ storage });
  assert.equal((await second.list())[0].moveId, 'row');
});

test('browser storage that throws falls back to memory', async () => {
  const store = await Store.open({ storage: fakeStorage({ broken: true }) });
  assert.equal(store.kind, 'memory');
  await store.add(entry('2026-11-22', 'squat', 8));
  assert.equal((await store.list()).length, 1);
});

test('the database is preferred when it answers', async () => {
  const db = fakeDb();
  const store = await Store.open({ db, storage: fakeStorage() });
  assert.equal(store.kind, 'db');
  await store.add(entry('2026-11-22', 'squat', 8));
  await store.add(entry('2026-11-22', 'squat', 9));
  await store.setSettings({ equipment: [], dumbbells: [50], routine: ['squat'] });
  const reopened = await Store.open({ db, storage: fakeStorage() });
  const all = await reopened.list();
  assert.equal(all.length, 1);
  assert.equal(all[0].sets[0].reps, 9);
  assert.deepEqual((await reopened.getSettings()).dumbbells, [50]);
});

test('a database that does not answer falls back to browser storage', async () => {
  const store = await Store.open({ db: fakeDb({ broken: true }), storage: fakeStorage() });
  assert.equal(store.kind, 'browser');
});

test('entries come back newest first', async () => {
  const store = await Store.open({});
  await store.add(entry('2026-11-20', 'squat', 8));
  await store.add(entry('2026-11-22', 'squat', 9));
  await store.add(entry('2026-11-21', 'row', 9));
  assert.deepEqual((await store.list()).map((e) => e.date), ['2026-11-22', '2026-11-21', '2026-11-20']);
});
