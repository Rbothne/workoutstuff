const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..');
const { build } = require(path.join(root, 'scripts', 'build-pages.js'));

test('the Pages build is a full document that keeps the page and loads its scripts and data', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'onemove-pages-'));
  try {
    build(out);
    const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
    assert.ok(html.startsWith('<!doctype html>'));
    assert.match(html, /<meta name="viewport" content="width=device-width/);
    assert.ok(html.indexOf('<title>One Move</title>') < html.indexOf('</head>'));
    assert.ok(html.indexOf('<body>') < html.indexOf('<div id="library" hidden>'));
    for (const f of ['logic', 'store', 'train', 'read']) {
      assert.ok(html.includes(`<script src="js/${f}.js"></script>`), f);
      assert.ok(fs.existsSync(path.join(out, 'js', f + '.js')), f);
    }
    for (const f of ['moves.json', 'reading.json', 'lines.json']) assert.ok(fs.existsSync(path.join(out, 'data', f)), f);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
