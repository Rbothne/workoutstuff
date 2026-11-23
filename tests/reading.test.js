const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const load = () => JSON.parse(fs.readFileSync(path.join(root, 'data', 'reading.json'), 'utf8'));
const check = () => fs.readFileSync(path.join(root, 'docs', 'source-check.md'), 'utf8');

const IDS = ['eating', 'energy', 'sleep-appetite', 'strength', 'weight', 'habits', 'injury', 'volleyball', 'climbing', 'strength-training', 'walking'];
// 'guideline' marks an official recommendation, which is a consensus and not a study finding.
const STRENGTHS = ['strong', 'moderate', 'weak', 'unverified', 'guideline'];

test('there are eleven articles with the planned ids', () => {
  assert.deepEqual(load().map((a) => a.id), IDS);
  for (const a of load()) assert.ok(['topic', 'sport'].includes(a.kind), a.id);
});

test('every article has at least five sources, two of them an authority or a journal', () => {
  for (const a of load()) {
    assert.ok(a.sources.length >= 5, `${a.id} has ${a.sources.length} sources`);
    const trusted = a.sources.filter((s) => s.kind === 'authority' || s.kind === 'journal');
    assert.ok(trusted.length >= 2, `${a.id} trusted sources`);
    a.sources.forEach((s, i) => assert.equal(s.n, i + 1, `${a.id} source numbering`));
  }
});

test('every source link is https and was recorded as opened in the source check', () => {
  const log = check();
  for (const a of load()) {
    for (const s of a.sources) {
      assert.ok(s.url.startsWith('https://'), `${a.id} ${s.url}`);
      assert.ok(log.includes(s.url), `${a.id}: ${s.url} missing from source-check.md`);
      assert.ok(['authority', 'journal', 'other'].includes(s.kind), `${a.id} source kind`);
      assert.ok(s.title && s.publisher, `${a.id} source title and publisher`);
    }
  }
});

test('the bottom line has three to five goals and each cites a real source', () => {
  for (const a of load()) {
    assert.ok(a.bluf.length >= 3 && a.bluf.length <= 5, `${a.id} bluf length`);
    for (const g of a.bluf) {
      assert.ok(g.cites.length >= 1, `${a.id} goal without a cite: ${g.text}`);
      for (const n of g.cites) assert.ok(n >= 1 && n <= a.sources.length, `${a.id} bad cite ${n}`);
    }
  }
});

test('a paragraph that states a finding carries both a cite and an evidence label', () => {
  for (const a of load()) {
    for (const s of a.sections) {
      for (const p of s.paragraphs) {
        for (const n of p.cites) assert.ok(n >= 1 && n <= a.sources.length, `${a.id} bad cite ${n}`);
        if (p.cites.length) assert.ok(STRENGTHS.includes(p.strength), `${a.id}: cited paragraph without a label`);
        if (p.strength) assert.ok(p.cites.length >= 1, `${a.id}: labelled paragraph without a cite`);
      }
    }
  }
});

test('every article has a section on what is normal', () => {
  for (const a of load()) {
    assert.ok(a.sections.some((s) => s.heading === "What's normal"), a.id);
  }
});

test('every source in an article is cited somewhere in it', () => {
  for (const a of load()) {
    const used = new Set();
    a.bluf.forEach((g) => g.cites.forEach((n) => used.add(n)));
    a.sections.forEach((s) => s.paragraphs.forEach((p) => p.cites.forEach((n) => used.add(n))));
    for (const s of a.sources) assert.ok(used.has(s.n), `${a.id}: source ${s.n} is never cited`);
  }
});

test('the eating article draws on Japan, Korea, China and Germany and sets no calorie target', () => {
  const eating = load().find((a) => a.id === 'eating');
  const countries = eating.sources.map((s) => s.country);
  for (const c of ['JP', 'KR', 'CN', 'DE']) assert.ok(countries.includes(c), c);
  const text = JSON.stringify([eating.bluf, eating.sections]);
  assert.ok(!/kcal|calorie/i.test(text), 'eating article mentions calories');
});

// Wording that went beyond what the checked source said. Found in review; pinned so it does not return.
test('articles do not carry the overclaims found in review', () => {
  const text = JSON.stringify(load());
  for (const phrase of [
    'All of them limit', 'half of most plates', 'no minimum', 'Heavy logging is what people quit',
    'The largest study', 'most happen to a previously', 'limiting factor', 'most people do',
    'Climbing is muscle-strengthening activity',
  ]) {
    assert.ok(!text.includes(phrase), `still says: ${phrase}`);
  }
});

test('a daily line never opens mid-thought', () => {
  const lines = JSON.parse(fs.readFileSync(path.join(root, 'data', 'lines.json'), 'utf8'));
  for (const l of lines) {
    assert.ok(!/^(Muscle does not change this much|Cramming your activity|Your forearms will give out)/.test(l.text), l.text);
  }
});
