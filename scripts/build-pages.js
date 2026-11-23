// Builds the GitHub Pages site: index.html wrapped as a full document, plus the scripts and data it loads.
// The artifact host supplies the document skeleton for index.html; Pages needs it written out.
// Usage: node scripts/build-pages.js [outDir]   (default: _site)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const RESET = '*,*::before,*::after{box-sizing:border-box}html,body{margin:0}';

function wrap(page) {
  const cut = page.indexOf('</style>');
  if (cut === -1) throw new Error('index.html has no <style> block');
  const head = page.slice(0, cut + '</style>'.length);
  const body = page.slice(cut + '</style>'.length);
  return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
    + '<style>' + RESET + '</style>\n' + head + '\n</head>\n<body>' + body + '\n</body>\n</html>\n';
}

function build(out) {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), wrap(fs.readFileSync(path.join(root, 'index.html'), 'utf8')));
  for (const dir of ['js', 'data']) fs.cpSync(path.join(root, dir), path.join(out, dir), { recursive: true });
  fs.writeFileSync(path.join(out, '.nojekyll'), '');
}

if (require.main === module) {
  const out = path.resolve(process.argv[2] || path.join(root, '_site'));
  build(out);
  console.log('built', out);
}

module.exports = { wrap, build };
