const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const lines = () => JSON.parse(fs.readFileSync(path.join(root, 'data', 'lines.json'), 'utf8'));
const pages = () => JSON.parse(fs.readFileSync(path.join(root, 'data', 'reading.json'), 'utf8'));

test('there are at least a hundred daily lines and no two are the same', () => {
  const all = lines();
  assert.ok(all.length >= 100, `only ${all.length} lines`);
  assert.equal(new Set(all.map((l) => l.text)).size, all.length);
});

test('every line is short and points at a real article', () => {
  const ids = pages().map((a) => a.id);
  for (const l of lines()) {
    assert.ok(l.text.length > 0 && l.text.length <= 200, `too long: ${l.text}`);
    assert.ok(ids.includes(l.page), `unknown page ${l.page}`);
  }
});

test('a line with a named author carries a link to where the quote was checked', () => {
  for (const l of lines()) {
    if (l.by) assert.ok(typeof l.url === 'string' && l.url.startsWith('https://'), l.text);
  }
});

test('every line is taken word for word from its article, so nothing unchecked slips in', () => {
  const byId = {};
  for (const a of pages()) {
    byId[a.id] = [...a.bluf.map((g) => g.text), ...a.sections.flatMap((s) => s.paragraphs.filter((p) => p.cites.length).map((p) => p.text))];
  }
  for (const l of lines()) {
    if (l.by) continue;
    assert.ok(byId[l.page].some((t) => t.startsWith(l.text)), `not in ${l.page}: ${l.text}`);
  }
});

test('neighbouring days come from different articles', () => {
  const all = lines();
  let repeats = 0;
  for (let i = 1; i < all.length; i++) if (all[i].page === all[i - 1].page) repeats++;
  assert.ok(repeats <= all.length * 0.1, `${repeats} back-to-back repeats`);
});
