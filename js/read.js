// One Move: the Read view (article list, articles with contents and a rail) and today's line on Train.
(function () {
  var LABEL = {
    strong: 'Strong evidence', moderate: 'Moderate evidence', weak: 'Weak evidence',
    guideline: 'Official guideline', unverified: 'Unverified',
  };
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  var articles = null;
  var moves = null;

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
  function jump(id) {
    return function (e) { e.preventDefault(); var t = document.getElementById(id); if (t) t.scrollIntoView({ block: 'start' }); };
  }

  function renderList(root) {
    root.className = 'read list-only';
    var wrap = el('div', 'col');
    [['topic', 'Topics'], ['sport', 'Sports']].forEach(function (group) {
      wrap.appendChild(el('h2', '', group[1]));
      var grid = el('div', 'article-grid');
      articles.filter(function (a) { return a.kind === group[0]; }).forEach(function (a) {
        var link = el('a', 'article-link');
        link.href = '#read-' + a.id;
        link.appendChild(el('span', 'name', a.title));
        link.appendChild(el('span', 'dose', a.bluf[0].text));
        grid.appendChild(link);
      });
      wrap.appendChild(grid);
    });
    root.appendChild(wrap);
  }

  function rail(a) {
    var box = el('div', 'col');
    var worth = a.sources.filter(function (s) { return s.kind === 'authority'; }).slice(0, 4);
    if (worth.length) {
      var w = el('section', 'box'); w.appendChild(el('span', 'label', 'Worth reading'));
      var ul = el('ul', 'links');
      worth.forEach(function (s) {
        var li = el('li'); li.appendChild(el('span', 'kind', 'Official guidance'));
        var link = el('a', '', s.title); link.href = s.url; link.target = '_blank'; link.rel = 'noopener';
        li.appendChild(link); li.appendChild(el('small', '', s.publisher)); ul.appendChild(li);
      });
      w.appendChild(ul); box.appendChild(w);
    }
    var mv = moves ? OneMove.movesForArticle(moves, a.id) : [];
    if (mv.length) {
      var m = el('section', 'box'); m.appendChild(el('span', 'label', 'Moves for this'));
      m.appendChild(el('p', 'small', mv.slice(0, 8).map(function (x) { return x.name; }).join(', ') + '.'));
      var go = el('a', 'small', 'Open them in Train'); go.href = '#train'; m.appendChild(go);
      box.appendChild(m);
    }
    var at = articles.indexOf(a), next = articles[(at + 1) % articles.length];
    var n = el('section', 'box'); n.appendChild(el('span', 'label', 'Read next'));
    var nl = el('a', '', next.title); nl.href = '#read-' + next.id; n.appendChild(nl);
    n.appendChild(el('p', 'note', next.bluf[0].text)); box.appendChild(n);
    return box;
  }

  function renderArticle(root, a) {
    root.className = 'read';
    var toc = el('nav', 'toc'); toc.setAttribute('aria-label', 'In this article');
    toc.appendChild(el('span', 'label', 'In this article'));
    var main = el('article', 'prose');
    var back = el('a', 'small', 'All articles'); back.href = '#read'; main.appendChild(back);
    main.appendChild(el('h2', '', a.title));

    var bluf = el('div', 'box bluf'); bluf.id = 'sec-bluf';
    bluf.appendChild(el('span', 'label', 'Bottom line'));
    var list = el('ul');
    a.bluf.forEach(function (goal) { var li = el('li', '', goal.text + ' '); li.appendChild(cites(goal.cites)); list.appendChild(li); });
    bluf.appendChild(list); main.appendChild(bluf);
    var t0 = el('a', '', 'Bottom line'); t0.href = '#read-' + a.id; t0.addEventListener('click', jump('sec-bluf')); toc.appendChild(t0);

    var mobile = el('details', 'mobile-rail'); mobile.appendChild(el('summary', '', 'Worth reading, moves and what to read next'));
    mobile.appendChild(rail(a)); main.appendChild(mobile);

    var deeperShown = false;
    a.sections.forEach(function (s, i) {
      if (s.deeper && !deeperShown) {
        deeperShown = true;
        var rule = el('div', 'deeper-rule'); rule.id = 'sec-deeper'; rule.appendChild(el('span', 'label', 'Going deeper')); main.appendChild(rule);
        toc.appendChild(el('span', 'label deeper', 'Going deeper'));
      }
      var h = el('h3', '', s.heading); h.id = 'sec-' + i; main.appendChild(h);
      var t = el('a', '', s.heading); t.href = '#read-' + a.id; t.addEventListener('click', jump('sec-' + i)); toc.appendChild(t);
      s.paragraphs.forEach(function (para) {
        var pEl = el('p', '', para.text + ' ');
        if (para.cites.length) pEl.appendChild(cites(para.cites));
        if (para.strength) pEl.appendChild(el('span', 'ev ev-' + para.strength, LABEL[para.strength]));
        else if (!para.cites.length) pEl.appendChild(el('span', 'ev ev-note', 'Not from a source'));
        main.appendChild(pEl);
      });
    });

    var sh = el('h3', '', 'Sources'); sh.id = 'sec-sources'; main.appendChild(sh);
    var ts = el('a', '', 'Sources'); ts.href = '#read-' + a.id; ts.addEventListener('click', jump('sec-sources')); toc.appendChild(ts);
    var ol = el('ol', 'sources');
    a.sources.forEach(function (s) {
      var li = el('li'); li.id = 'src-' + s.n;
      var link = el('a', '', s.title); link.href = s.url; link.target = '_blank'; link.rel = 'noopener';
      li.appendChild(link);
      li.appendChild(el('span', 'pub', ' ' + s.publisher + (s.country && s.country !== 'INT' ? ' (' + s.country + ')' : '') + '.'));
      ol.appendChild(li);
    });
    main.appendChild(ol);
    main.appendChild(el('p', 'note', 'Each link was opened and checked against the claim it supports. A paragraph marked "not from a source" is context or a rule of thumb, not a finding. Evidence labels: strong means a meta-analysis or large trial, moderate a single trial or cohort, weak a small study or review, and official guideline a recommendation from a health authority.'));

    var r = rail(a); r.className = 'rail desk';
    root.appendChild(toc); root.appendChild(main); root.appendChild(r);
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
    $('line-text').textContent = line.text + (line.by ? ' (' + line.by + ')' : '');
    var why = $('line-why');
    why.href = line.url || '#read-' + line.page;
    if (line.url) { why.target = '_blank'; why.rel = 'noopener'; }
  }

  window.addEventListener('hashchange', render);

  Promise.all([
    fetch('data/reading.json').then(function (r) { if (!r.ok) throw new Error('reading'); return r.json(); }),
    fetch('data/moves.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
  ]).then(function (got) {
    articles = got[0]; moves = got[1];
    $('read-status').hidden = true;
    render();
  }).catch(function () {
    $('read-status').textContent = "Couldn't load the articles. Reload to try again.";
  });

  fetch('data/lines.json')
    .then(function (r) { if (!r.ok) throw new Error('lines'); return r.json(); })
    .then(showLine)
    .catch(function () {});
})();
