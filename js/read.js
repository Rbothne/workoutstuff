// One Move: the Read view (article list and articles) and today's line on the Today view.
(function () {
  var LABEL = {
    strong: 'Strong evidence', moderate: 'Moderate evidence', weak: 'Weak evidence',
    guideline: 'Official guideline', unverified: 'Unverified',
  };
  var el = OneMoveApp.el;
  var $ = OneMoveApp.$;
  var articles = null;

  function cites(nums) {
    var sup = el('sup', 'cites');
    nums.forEach(function (n, i) {
      if (i) sup.appendChild(document.createTextNode(', '));
      var a = el('a', '', String(n));
      a.href = '#src-' + n;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.getElementById('src-' + n);
        if (target) target.scrollIntoView({ block: 'center' });
      });
      sup.appendChild(a);
    });
    return sup;
  }

  function renderList(root) {
    [['topic', 'Topics'], ['sport', 'Sports']].forEach(function (group) {
      var box = el('div', 'set');
      box.appendChild(el('h3', 'group', group[1]));
      articles.filter(function (a) { return a.kind === group[0]; }).forEach(function (a) {
        var link = el('a', 'article-link');
        link.href = '#read-' + a.id;
        link.appendChild(el('span', 'name', a.title));
        link.appendChild(el('span', 'dose', a.bluf[0].text));
        box.appendChild(link);
      });
      root.appendChild(box);
    });
  }

  function renderArticle(root, a) {
    var back = el('a', 'back', 'All articles');
    back.href = '#read';
    root.appendChild(back);
    root.appendChild(el('h2', '', a.title));

    var bluf = el('div', 'bluf');
    bluf.appendChild(el('span', 'label', 'Bottom line'));
    var list = el('ul');
    a.bluf.forEach(function (goal) {
      var li = el('li', '', goal.text + ' ');
      li.appendChild(cites(goal.cites));
      list.appendChild(li);
    });
    bluf.appendChild(list);
    root.appendChild(bluf);

    a.sections.forEach(function (s) {
      var sec = el('div', 'prose');
      sec.appendChild(el('h3', '', s.heading));
      s.paragraphs.forEach(function (para) {
        var pEl = el('p', '', para.text + ' ');
        if (para.cites.length) pEl.appendChild(cites(para.cites));
        if (para.strength) pEl.appendChild(el('span', 'ev ev-' + para.strength, LABEL[para.strength]));
        sec.appendChild(pEl);
      });
      root.appendChild(sec);
    });

    var src = el('div', 'prose');
    src.appendChild(el('h3', '', 'Sources'));
    var ol = el('ol', 'sources');
    a.sources.forEach(function (s) {
      var li = el('li');
      li.id = 'src-' + s.n;
      var link = el('a', '', s.title);
      link.href = s.url;
      link.target = '_blank';
      link.rel = 'noopener';
      li.appendChild(link);
      li.appendChild(el('span', 'pub', ' ' + s.publisher + (s.country && s.country !== 'INT' ? ' (' + s.country + ')' : '') + '.'));
      ol.appendChild(li);
    });
    src.appendChild(ol);
    src.appendChild(el('p', 'note', 'Each link was opened and checked against the claim it supports. Evidence labels: strong means a meta-analysis or large trial, moderate a single trial or cohort, weak a small study or review, and official guideline a recommendation from a health authority.'));
    root.appendChild(src);
  }

  function render() {
    var root = $('read-root');
    if (!root || !articles) return;
    root.textContent = '';
    var hash = location.hash.slice(1);
    var id = hash.indexOf('read-') === 0 ? hash.slice(5) : null;
    var article = id ? articles.filter(function (a) { return a.id === id; })[0] : null;
    if (article) { renderArticle(root, article); window.scrollTo(0, 0); } else renderList(root);
  }

  function showLine(lines) {
    if (!lines.length) return;
    var line = OneMove.pickLine(lines, new Date());
    var box = $('line');
    $('line-text').textContent = line.text + (line.by ? ' (' + line.by + ')' : '');
    var why = $('line-why');
    why.href = line.url || '#read-' + line.page;
    if (line.url) { why.target = '_blank'; why.rel = 'noopener'; }
    box.hidden = false;
  }

  window.addEventListener('hashchange', render);

  fetch('data/reading.json')
    .then(function (r) { if (!r.ok) throw new Error('reading'); return r.json(); })
    .then(function (data) {
      articles = data;
      $('read-status').hidden = true;
      render();
    })
    .catch(function () {
      $('read-status').textContent = "Couldn't load the articles. Reload to try again.";
    });

  fetch('data/lines.json')
    .then(function (r) { if (!r.ok) throw new Error('lines'); return r.json(); })
    .then(showLine)
    .catch(function () {});
})();
