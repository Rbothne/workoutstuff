const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..');
const { build } = require(path.join(root, 'scripts', 'build-reading.js'));
const opening = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'opening.json'), 'utf8'));

// A small, valid expansion for the energy article: one new source, one existing source.
function sample() {
  return {
    id: 'energy',
    sources: {
      x_energy_demo: {
        title: 'A demo paper', publisher: 'Journal of Demos, 2020', url: 'https://example.org/demo',
        kind: 'journal', country: 'INT', how: 'page opened', says: 'Demo finding: 12 of 20 people.',
      },
    },
    reviewed: [{ title: 'A paper that did not hold up', url: 'https://example.org/no', why_not: 'Too small.' }],
    sections: [
      { heading: 'How it works', paragraphs: [
        { text: 'Twelve of twenty people in a demo study felt better. It was a small study.', cites: ['x_energy_demo'], strength: 'weak',
          support: [{ key: 'x_energy_demo', quote: '12 of 20 people' }] },
        { text: 'The WHO says some activity is better than none.', cites: ['who'], strength: 'guideline',
          support: [{ key: 'who', quote: 'some physical activity is better than none' }] },
        { text: 'A common rule of thumb, not from a source: start small.', cites: [], strength: null, support: [] },
      ] },
    ],
  };
}

function run(expansion) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'onemove-exp-'));
  const exp = path.join(dir, 'expansions');
  fs.mkdirSync(exp);
  if (expansion) fs.writeFileSync(path.join(exp, expansion.id + '.json'), JSON.stringify(expansion));
  build({ expansionsDir: exp, outDir: dir, quiet: true });
  return {
    articles: JSON.parse(fs.readFileSync(path.join(dir, 'data', 'reading.json'), 'utf8')),
    check: fs.readFileSync(path.join(dir, 'docs', 'source-check.md'), 'utf8'),
    lines: JSON.parse(fs.readFileSync(path.join(dir, 'data', 'lines.json'), 'utf8')),
  };
}
const broken = (change) => { const x = sample(); change(x); return x; };

test('the published articles still open with exactly the text they had before expansion', () => {
  const articles = JSON.parse(fs.readFileSync(path.join(root, 'data', 'reading.json'), 'utf8'));
  for (const a of articles) {
    const was = opening[a.id];
    assert.ok(was, a.id);
    assert.deepEqual(a.bluf.map((g) => g.text), was.bluf, `${a.id} bottom line changed`);
    const first = a.sections.filter((s) => !s.deeper);
    assert.deepEqual(first.map((s) => ({ heading: s.heading, paragraphs: s.paragraphs.map((p) => p.text) })), was.sections, `${a.id} opening sections changed`);
    const firstDeeper = a.sections.findIndex((s) => s.deeper);
    if (firstDeeper !== -1) assert.ok(a.sections.slice(firstDeeper).every((s) => s.deeper), `${a.id}: an opening section sits below a deeper one`);
  }
});

test('with no expansions the build gives the opening articles and nothing is marked deeper', () => {
  const { articles } = run(null);
  assert.equal(articles.length, 11);
  assert.ok(articles.every((a) => a.sections.every((s) => s.deeper === false)));
});

test('an expansion is added below the opening and marked deeper', () => {
  const energy = run(sample()).articles.find((a) => a.id === 'energy');
  const last = energy.sections[energy.sections.length - 1];
  assert.equal(last.heading, 'How it works');
  assert.equal(last.deeper, true);
  assert.equal(energy.sections.filter((s) => s.deeper).length, 1);
  assert.deepEqual(energy.sections.filter((s) => !s.deeper).map((s) => s.heading), opening.energy.sections.map((s) => s.heading));
});

test('new sources are numbered after the existing ones and cites point at them', () => {
  const energy = run(sample()).articles.find((a) => a.id === 'energy');
  const demo = energy.sources.find((s) => s.url === 'https://example.org/demo');
  assert.equal(demo.n, energy.sources.length);
  const para = energy.sections[energy.sections.length - 1].paragraphs;
  assert.deepEqual(para[0].cites, [demo.n]);
  const who = energy.sources.find((s) => s.url.includes('PMC7719906'));
  assert.deepEqual(para[1].cites, [who.n]);
  assert.equal(para[0].support, undefined, 'supporting quotes are for checking, not for the page');
});

test('new sources and the count of sources reviewed are written to the source check', () => {
  const { check } = run(sample());
  assert.ok(check.includes('https://example.org/demo'));
  assert.ok(check.includes('Demo finding: 12 of 20 people.'));
  assert.ok(/energy[^\n]*1 opened and not cited/i.test(check), 'reviewed count missing');
  assert.ok(check.includes('A paper that did not hold up'));
});

test('first sentences of new cited paragraphs become daily lines', () => {
  const { lines } = run(sample());
  assert.ok(lines.some((l) => l.text === 'Twelve of twenty people in a demo study felt better.' && l.page === 'energy'));
});

test('the build refuses a paragraph that cites a source nobody defined', () => {
  assert.throws(() => run(broken((x) => { x.sections[0].paragraphs[0].cites = ['x_energy_missing']; })), /x_energy_missing/);
});

test('the build refuses a cited paragraph with no supporting quote for a cited source', () => {
  assert.throws(() => run(broken((x) => { x.sections[0].paragraphs[0].support = []; })), /support/i);
  assert.throws(() => run(broken((x) => { x.sections[0].paragraphs[1].support = [{ key: 'who', quote: '' }]; })), /support/i);
});

test('the build refuses a cited paragraph without a valid evidence label, and a label without a cite', () => {
  assert.throws(() => run(broken((x) => { x.sections[0].paragraphs[0].strength = 'certain'; })), /strength/i);
  assert.throws(() => run(broken((x) => { x.sections[0].paragraphs[2].strength = 'strong'; })), /strength/i);
});

test('the build refuses a source that is defined but never cited', () => {
  assert.throws(() => run(broken((x) => { x.sources.x_energy_unused = { ...x.sources.x_energy_demo, url: 'https://example.org/u' }; })), /x_energy_unused/);
});

test('the build refuses a new source key that could collide with the library, or a non-https link', () => {
  assert.throws(() => run(broken((x) => { x.sources.who = x.sources.x_energy_demo; })), /who/);
  assert.throws(() => run(broken((x) => { x.sources.x_energy_demo.url = 'http://example.org/demo'; })), /https/);
});

test('the build refuses an expansion for an article that does not exist', () => {
  assert.throws(() => run(broken((x) => { x.id = 'nonsense'; })), /nonsense/);
});

test('the build refuses more than two uncited paragraphs in one expansion', () => {
  assert.throws(() => run(broken((x) => {
    const note = { text: 'Context only.', cites: [], strength: null, support: [] };
    x.sections[0].paragraphs.push(note, { ...note, text: 'More context.' });
  })), /uncited/i);
});
