/* ExtendedManager — интерактив сайта: меню, прокрутка, документация, анимации. */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----- Мобильное меню ----- */
  var toggle = $('.nav-toggle');
  var nav = $('#site-nav');

  function closeMenu() {
    nav.classList.remove('is-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    toggle.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });

  nav.addEventListener('click', function (event) {
    if (event.target.closest('a')) closeMenu();
  });

  /* ----- Тень шапки и кнопка наверх ----- */
  var header = $('.site-header');
  var toTop = $('.to-top');

  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });

  /* ----- Тень шапки, кнопка наверх, оглавление ----- */
  var markToc = function () {};

  function onScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
    toTop.classList.toggle('is-visible', window.scrollY > 600);
    markToc();
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      onScroll();
      ticking = false;
    });
  }, { passive: true });

  /* ----- Появление блоков и счётчики ----- */
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });

  $$('.reveal').forEach(function (el) { revealObserver.observe(el); });

  function countUp(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (reduced) { el.textContent = String(target); return; }
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / 900, 1);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  var countObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      countUp(entry.target);
      countObserver.unobserve(entry.target);
    });
  }, { threshold: .6 });

  $$('[data-count]').forEach(function (el) { countObserver.observe(el); });

  /* ----- Документация: разделы, оглавление, поиск ----- */
  function initDocs() {
    var docLinks = $$('.docs-link');
    var docs = $$('.doc');
    var shell = $('.docs-shell');
    var main = $('.docs-main');
    var tocList = $('#docs-toc-list');
    var prevBtn = $('#doc-prev');
    var nextBtn = $('#doc-next');
    var search = $('#docs-search');
    var emptyNote = $('.docs-empty');
    var activeDoc = docs[0];

    function buildToc() {
      tocList.textContent = '';
      $$('h3[id]', activeDoc).forEach(function (heading) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#' + heading.id;
        a.textContent = heading.textContent;
        li.appendChild(a);
        tocList.appendChild(li);
      });
      markToc();
    }

    markToc = function () {
      var links = $$('a', tocList);
      if (!links.length) return;
      var currentId = links[0].getAttribute('href').slice(1);
      $$('h3[id]', activeDoc).forEach(function (heading) {
        if (heading.getBoundingClientRect().top <= 140) currentId = heading.id;
      });
      links.forEach(function (link) {
        link.classList.toggle('is-active', link.getAttribute('href') === '#' + currentId);
      });
    };

    function openDoc(id, push) {
      var doc = $('#doc-' + id);
      var link = docLinks.filter(function (item) { return item.getAttribute('data-doc') === id; })[0];
      if (!doc || !link) return;
      activeDoc = doc;
      docs.forEach(function (item) { item.classList.toggle('is-active', item === doc); });
      docLinks.forEach(function (item) { item.classList.toggle('is-active', item === link); });
      var index = docLinks.indexOf(link);
      prevBtn.disabled = index === 0;
      nextBtn.disabled = index === docLinks.length - 1;
      buildToc();
      if (push) history.replaceState(null, '', '#doc-' + id);
    }

    function pageTop(el) {
      var top = 0;
      while (el) { top += el.offsetTop; el = el.offsetParent; }
      return top;
    }

    function goDoc(id) {
      openDoc(id, true);
      var top = pageTop(main) - 84;
      if (window.scrollY > top) window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
    }

    docLinks.forEach(function (link) {
      link.addEventListener('click', function () { goDoc(link.getAttribute('data-doc')); });
    });

    prevBtn.addEventListener('click', function () {
      var index = docLinks.indexOf($('.docs-link.is-active'));
      if (index > 0) goDoc(docLinks[index - 1].getAttribute('data-doc'));
    });

    nextBtn.addEventListener('click', function () {
      var index = docLinks.indexOf($('.docs-link.is-active'));
      if (index > -1 && index < docLinks.length - 1) goDoc(docLinks[index + 1].getAttribute('data-doc'));
    });

    function filterDocs() {
      var query = search.value.trim().toLowerCase();
      var visible = 0;
      var group = null;
      var groupVisible = 0;
      $$('.docs-nav > *').forEach(function (el) {
        if (el.classList.contains('docs-group')) {
          if (group) group.hidden = groupVisible === 0;
          group = el;
          groupVisible = 0;
          return;
        }
        var show = !query || el.textContent.toLowerCase().indexOf(query) !== -1;
        el.hidden = !show;
        if (show) { visible++; groupVisible++; }
      });
      if (group) group.hidden = groupVisible === 0;
      emptyNote.hidden = visible !== 0;
    }

    search.addEventListener('input', filterDocs);

    search.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        var first = docLinks.filter(function (link) { return !link.hidden; })[0];
        if (first) goDoc(first.getAttribute('data-doc'));
      }
      if (event.key === 'Escape') {
        search.value = '';
        filterDocs();
        search.blur();
      }
    });

    document.addEventListener('keydown', function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        search.focus();
        search.select();
      }
      if (event.key === 'Escape') closeMenu();
    });

    var hash = window.location.hash;
    var startId = null;
    var anchor = null;
    if (hash.indexOf('#doc-') === 0) {
      startId = hash.slice(5);
      anchor = shell;
    } else if (hash.length > 1) {
      var target = document.getElementById(hash.slice(1));
      var owner = target && target.closest('.doc');
      if (owner) {
        startId = owner.id.slice(4);
        anchor = target;
      }
    }

    if (startId && $('#doc-' + startId)) {
      openDoc(startId, false);
      window.scrollTo({ top: pageTop(anchor) - 84, behavior: 'instant' });
    } else {
      openDoc(docLinks[0].getAttribute('data-doc'), false);
    }
  }

  if ($('.docs-link')) initDocs();

  /* ----- Подсветка синтаксиса YAML ----- */
  var YAML_VALUE = /("[^"]*"|'[^']*')|((?:^|\s)#.*)|(\b(?:true|false|null|yes|no|on|off)\b)|(-?\d+(?:\.\d+)?)/g;
  var YAML_INNER = /(%[a-z_]+%|<\/?[a-z_][a-z_0-9:#-]*>)/gi;

  function tok(cls, text) {
    var el = document.createElement('span');
    el.className = cls;
    el.textContent = text;
    return el;
  }

  function plain(text) { return document.createTextNode(text); }

  function stringValue(text) {
    var node = tok('tok-str', '');
    var body = text.slice(1, -1);
    node.appendChild(plain(text.charAt(0)));
    var last = 0;
    var m;
    YAML_INNER.lastIndex = 0;
    while ((m = YAML_INNER.exec(body))) {
      if (m.index > last) node.appendChild(plain(body.slice(last, m.index)));
      node.appendChild(tok(m[0].charAt(0) === '%' ? 'tok-ph' : 'tok-tag', m[0]));
      last = m.index + m[0].length;
    }
    if (last < body.length) node.appendChild(plain(body.slice(last)));
    node.appendChild(plain(text.charAt(text.length - 1)));
    return node;
  }

  function valueNodes(text) {
    var out = [];
    var last = 0;
    var m;
    YAML_VALUE.lastIndex = 0;
    while ((m = YAML_VALUE.exec(text))) {
      if (m.index > last) out.push(plain(text.slice(last, m.index)));
      if (m[1]) out.push(stringValue(m[1]));
      else if (m[2]) {
        var sharp = m[2].indexOf('#');
        if (sharp > 0) out.push(plain(m[2].slice(0, sharp)));
        out.push(tok('tok-com', m[2].slice(sharp)));
      } else if (m[3]) out.push(tok('tok-bool', m[3]));
      else out.push(tok('tok-num', m[4]));
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(plain(text.slice(last)));
    return out;
  }

  function highlightYaml(code) {
    var lines = code.textContent.split('\n');
    code.textContent = '';
    lines.forEach(function (line, i) {
      if (i) code.appendChild(plain('\n'));
      var head = /^(\s*)(-\s+)?/.exec(line);
      var rest = line.slice(head[0].length);
      if (head[1]) code.appendChild(plain(head[1]));
      if (head[2]) code.appendChild(tok('tok-punc', head[2]));
      var key = /^([A-Za-z0-9_.-]+):(?=\s|$)/.exec(rest);
      if (key) {
        code.appendChild(tok('tok-key', key[1]));
        code.appendChild(tok('tok-punc', ':'));
        rest = rest.slice(key[0].length);
      }
      valueNodes(rest).forEach(function (node) { code.appendChild(node); });
    });
  }

  $$('.code-block code').forEach(highlightYaml);

  /* ----- Копирование примеров ----- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy') ? resolve() : reject(new Error('copy'));
      } catch (error) {
        reject(error);
      }
      document.body.removeChild(area);
    });
  }

  $$('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var code = $('code', btn.parentElement);
      copyText(code.innerText).then(function () {
        btn.classList.add('is-copied');
        btn.textContent = 'Скопировано';
        window.setTimeout(function () {
          btn.classList.remove('is-copied');
          btn.textContent = 'Копировать';
        }, 1400);
      }).catch(function () {
        btn.textContent = 'Не вышло';
        window.setTimeout(function () { btn.textContent = 'Копировать'; }, 1400);
      });
    });
  });

  onScroll();
})();