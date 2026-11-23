// Storage for One Move. The account has the artifact `db` capability (checked 2026-11-22), so the
// published page saves to the artifact's shared database: phone and laptop see the same log, and
// Claude can read and write it. Without it the store falls back to this browser, then to memory.
//
// Database layout: collection `entries`, one document per day and move (id `YYYY-MM-DD_moveId`),
// and one document `config/settings`.
(function (root, factory) {
  var logic = typeof module === 'object' && module.exports ? require('./logic.js') : root.OneMove;
  var api = factory(logic);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OneMoveStore = api;
})(typeof self !== 'undefined' ? self : this, function (OneMove) {
  var ENTRIES_KEY = 'onemove.entries';
  var SETTINGS_KEY = 'onemove.store-settings';
  var DB_TIMEOUT_MS = 10000;

  function defaults() {
    return { equipment: [], dumbbells: [], routine: OneMove.DEFAULT_ROUTINE.slice(), prefs: {} };
  }
  // Per-move preferences: the sets, reps and weight he last chose, and the day he chose them.
  function cleanPrefs(p) {
    var out = {};
    if (!p || typeof p !== 'object') return out;
    Object.keys(p).forEach(function (id) {
      var x = p[id];
      if (!x || typeof x !== 'object') return;
      var ok = isFinite(x.sets) && x.sets >= 1 && x.sets <= 6 && isFinite(x.reps) && x.reps > 0
        && isFinite(x.weight) && x.weight >= 0 && typeof x.date === 'string';
      if (ok) out[id] = { sets: Math.round(x.sets), reps: x.reps, weight: x.weight, date: x.date };
    });
    return out;
  }
  function cleanSettings(s) {
    var d = defaults();
    if (!s) return d;
    return {
      equipment: Array.isArray(s.equipment) ? s.equipment.slice() : d.equipment,
      dumbbells: Array.isArray(s.dumbbells) ? s.dumbbells.slice() : d.dumbbells,
      routine: Array.isArray(s.routine) ? s.routine.slice() : d.routine,
      prefs: cleanPrefs(s.prefs),
    };
  }
  function withId(entry) {
    return { id: entry.date + '_' + entry.moveId, date: entry.date, moveId: entry.moveId, sets: entry.sets };
  }
  function newestFirst(entries) {
    return entries.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  }
  function timeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject({ code: 'unavailable' }); }, ms);
      promise.then(function (v) { clearTimeout(timer); resolve(v); }, function (e) { clearTimeout(timer); reject(e); });
    });
  }

  function memoryBackend() {
    var entries = {};
    var settings = null;
    return {
      kind: 'memory',
      list: function () { return Promise.resolve(newestFirst(Object.keys(entries).map(function (k) { return entries[k]; }))); },
      add: function (e) { var x = withId(e); entries[x.id] = x; return Promise.resolve(x); },
      remove: function (id) { delete entries[id]; return Promise.resolve(); },
      getSettings: function () { return Promise.resolve(cleanSettings(settings)); },
      setSettings: function (s) { settings = cleanSettings(s); return Promise.resolve(); },
    };
  }

  function browserBackend(storage) {
    function read(key, fallback) {
      var raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }
    read(ENTRIES_KEY, {}); // throws here if this browser blocks storage
    storage.setItem('onemove.probe', '1');
    return {
      kind: 'browser',
      list: function () {
        var all = read(ENTRIES_KEY, {});
        return Promise.resolve(newestFirst(Object.keys(all).map(function (k) { return all[k]; })));
      },
      add: function (e) {
        var all = read(ENTRIES_KEY, {});
        var x = withId(e);
        all[x.id] = x;
        storage.setItem(ENTRIES_KEY, JSON.stringify(all));
        return Promise.resolve(x);
      },
      remove: function (id) {
        var all = read(ENTRIES_KEY, {});
        delete all[id];
        storage.setItem(ENTRIES_KEY, JSON.stringify(all));
        return Promise.resolve();
      },
      getSettings: function () { return Promise.resolve(cleanSettings(read(SETTINGS_KEY, null))); },
      setSettings: function (s) { storage.setItem(SETTINGS_KEY, JSON.stringify(cleanSettings(s))); return Promise.resolve(); },
    };
  }

  function dbBackend(db) {
    var entries = db.collection('entries');
    var settingsDoc = db.doc('config/settings');
    return {
      kind: 'db',
      list: function () {
        return entries.orderBy('date', 'desc').limit(1000).get().then(function (snap) {
          return newestFirst(snap.docs.map(function (d) { return d.data(); }).filter(Boolean));
        });
      },
      add: function (e) { var x = withId(e); return entries.doc(x.id).set(x).then(function () { return x; }); },
      remove: function (id) { return entries.doc(id).delete(); },
      getSettings: function () {
        return settingsDoc.get().then(function (snap) { return cleanSettings(snap.exists ? snap.data() : null); });
      },
      setSettings: function (s) { return settingsDoc.set(cleanSettings(s)); },
    };
  }

  // env: { db?: the artifact db namespace or null, storage?: localStorage or a stand-in }
  function open(env) {
    env = env || {};
    function local() {
      if (env.storage) {
        try { return browserBackend(env.storage); } catch (e) { /* fall through to memory */ }
      }
      return memoryBackend();
    }
    if (!env.db) return Promise.resolve(local());
    var backend;
    try { backend = dbBackend(env.db); } catch (e) { return Promise.resolve(local()); }
    // One read proves the database answers before anything depends on it.
    return timeout(backend.getSettings(), DB_TIMEOUT_MS).then(function () { return backend; }, function () { return local(); });
  }

  return { open: open, defaults: defaults };
});
