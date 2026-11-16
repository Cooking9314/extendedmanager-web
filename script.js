/* ExtendedManager, интерактив сайта: меню, прокрутка, документация, анимации. */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----- Анимированный фон ----- */
  function initBackground() {
    var layer = document.createElement('div');
    layer.className = 'bg-ambient';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = '<div class="bg-aurora"></div><div class="bg-grid"></div>';
    var canvas = document.createElement('canvas');
    canvas.className = 'bg-particles';
    layer.appendChild(canvas);
    document.body.insertBefore(layer, document.body.firstChild);
    if (reduced) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var colors = ['79,169,255', '85,224,208', '125,92,255', '199,146,234'];
    var W = 0, H = 0, parts = [], running = true, raf = 0;

    function make() {
      return {
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.7 + .6,
        vy: -(Math.random() * .22 + .07), vx: (Math.random() - .5) * .12,
        a: Math.random() * .45 + .18, tw: Math.random() * Math.PI * 2,
        c: colors[(Math.random() * colors.length) | 0]
      };
    }
    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.max(24, Math.min(72, Math.round(W * H / 26000)));
      parts = [];
      for (var i = 0; i < count; i++) parts.push(make());
    }
    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y += p.vy; p.x += p.vx; p.tw += .02;
        if (p.y < -12) { p.y = H + 12; p.x = Math.random() * W; }
        if (p.x < -12) p.x = W + 12; else if (p.x > W + 12) p.x = -12;
        var alpha = p.a * (.6 + .4 * Math.sin(p.tw));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fillStyle = 'rgba(' + p.c + ',' + alpha.toFixed(3) + ')';
        ctx.fill();
      }
      raf = window.requestAnimationFrame(frame);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { running = false; window.cancelAnimationFrame(raf); }
      else if (!running) { running = true; frame(); }
    });
    window.addEventListener('resize', resize);
    resize();
    frame();
  }
  initBackground();

  /* ----- Источник прокрутки: окно или центр документации ----- */
  var docsMain = $('.docs-main');
  function appMode() { return !!docsMain && window.matchMedia('(min-width: 901px)').matches; }
  function getScroll() { return appMode() ? docsMain.scrollTop : window.scrollY; }
  function getMax() {
    if (appMode()) return docsMain.scrollHeight - docsMain.clientHeight;
    var doc = document.documentElement;
    return doc.scrollHeight - doc.clientHeight;
  }
  function scrollToTop() {
    var behavior = reduced ? 'auto' : 'smooth';
    if (appMode()) docsMain.scrollTo({ top: 0, behavior: behavior });
    else window.scrollTo({ top: 0, behavior: behavior });
  }

  /* ----- Прогресс прокрутки ----- */
  var progress = document.createElement('div');
  progress.className = 'scroll-progress';
  document.body.appendChild(progress);
  var markRail = function () {};
  var markToc = function () {};
  var markTimeline = function () {};

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

  /* ----- Шапка, кнопка наверх, прогресс ----- */
  var header = $('.site-header');
  var toTop = $('.to-top');

  toTop.addEventListener('click', scrollToTop);

  function onScroll() {
    var y = getScroll();
    header.classList.toggle('is-scrolled', y > 8);
    toTop.classList.toggle('is-visible', y > (appMode() ? 300 : 600));
    var max = getMax();
    progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    markToc();
    markRail();
    markTimeline();
  }

  var ticking = false;
  function requestScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { onScroll(); ticking = false; });
  }
  window.addEventListener('scroll', requestScroll, { passive: true });
  if (docsMain) docsMain.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', requestScroll);

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
      var p = Math.min((ts - start) / 900, 1);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) window.requestAnimationFrame(step);
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

  /* ----- Типы примечаний в документации ----- */
  var CALLOUTS = {
    info: { title: 'Информация', icon: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>' },
    warn: { title: 'Предупреждение', icon: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>' },
    note: { title: 'Примечание', icon: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>' },
    danger: { title: 'Внимание', icon: '<polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86"/><path d="M12 8v4"/><path d="M12 16h.01"/>' },
    important: { title: 'Важно', icon: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>' }
  };

  $$('.callout').forEach(function (c) {
    if ($('.callout-head', c)) return;
    var type = ['info', 'warn', 'note', 'danger', 'important'].filter(function (t) { return c.classList.contains('callout-' + t); })[0] || 'info';
    var cfg = CALLOUTS[type];
    var head = document.createElement('div');
    head.className = 'callout-head';
    head.innerHTML = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + cfg.icon + '</svg><span>' + cfg.title + '</span>';
    c.insertBefore(head, c.firstChild);
  });

  /* ----- Документация ----- */
  var COMMANDS = [
    ['afk', 'cmd-afk', '', 'Режим AFK с таймером и сообщением.'],
    ['ban', 'cmd-ban', '', 'Бан игрока по нику или адресу.'],
    ['banlist', 'cmd-banlist', '', 'Список активных банов.'],
    ['bansid', 'cmd-bansid', '', 'Бан по идентификатору аккаунта (SID).'],
    ['broadcasts', 'cmd-broadcasts', '', 'Управление рассылкой сообщений.'],
    ['cloak', 'cmd-cloak', '', 'Скрыть игрока от других.'],
    ['damage', 'cmd-damage', '', 'Нанести игроку урон.'],
    ['em', 'cmd-em', '', 'Ядро плагина: справка, модули, перезагрузка.'],
    ['endersee', 'cmd-endersee', '', 'Открыть эндер-сундук игрока.'],
    ['feed', 'cmd-feed', '', 'Восстановить сытость игрока.'],
    ['fly', 'cmd-fly', '', 'Включить или выключить полёт.'],
    ['freeze', 'cmd-freeze', '', 'Заморозить игрока на месте.'],
    ['gag', 'cmd-gag', '', 'Запретить голосовой чат (гаг).'],
    ['gaglist', 'cmd-gaglist', '', 'Список активных гагов.'],
    ['gamemode', 'cmd-gamemode', '', 'Сменить игровой режим.'],
    ['geolocate', 'cmd-geolocate', '', 'Геолокация адреса игрока.'],
    ['givedonate', 'cmd-givedonate', '', 'Выдать донат-привилегию.'],
    ['god', 'cmd-god', '', 'Режим бессмертия.'],
    ['heal', 'cmd-heal', '', 'Вылечить игрока.'],
    ['hp', 'cmd-hp', '', 'Установить или посмотреть здоровье.'],
    ['hub', 'cmd-hub', '', 'Перенести игрока на HUB.'],
    ['ignite', 'cmd-ignite', '', 'Поджечь игрока.'],
    ['invsee', 'cmd-invsee', '', 'Открыть инвентарь игрока.'],
    ['kick', 'cmd-kick', '', 'Кикнуть игрока с сервера.'],
    ['kickall', 'cmd-kickall', '', 'Кикнуть всех игроков.'],
    ['kill', 'cmd-kill', '', 'Убить игрока.'],
    ['link', 'cmd-link', '', 'Привязать аккаунт к адресу.'],
    ['login', 'cmd-login', '', 'Войти в аккаунт.'],
    ['mute', 'cmd-mute', '', 'Запретить игроку писать в чат.'],
    ['mutelist', 'cmd-mutelist', '', 'Список активных мьютов.'],
    ['npc', 'cmd-npc', '', 'Управление NPC.'],
    ['register', 'cmd-register', '', 'Зарегистрировать аккаунт.'],
    ['respawn', 'cmd-respawn', '', 'Вернуть игрока на точку возрождения.'],
    ['say', 'cmd-say', '', 'Сообщение в чат или админ-чат.'],
    ['scale', 'cmd-scale', '', 'Изменить размер игрока.'],
    ['setrank', 'cmd-setrank', '', 'Назначить группу привилегий.'],
    ['setspawn', 'cmd-setspawn', '', 'Установить точку спавна.'],
    ['spawn', 'cmd-spawn', '', 'Телепорт на спавн.'],
    ['speed', 'cmd-speed', '', 'Изменить скорость игрока.'],
    ['sprite', 'cmd-sprite', '', 'Спрайты игры в тексте.'],
    ['tp', 'cmd-tp', '', 'Телепортироваться к игроку.'],
    ['tphere', 'cmd-tphere', '', 'Телепортировать игрока к себе.'],
    ['tpsend', 'cmd-tpsend', '', 'Перенести игрока на другой сервер.'],
    ['trade', 'cmd-trade', '', 'Обмен предметами между игроками.'],
    ['unban', 'cmd-unban', '', 'Снять бан.'],
    ['uncloak', 'cmd-uncloak', '', 'Вернуть видимость игрока.'],
    ['unfreeze', 'cmd-unfreeze', '', 'Разморозить игрока.'],
    ['ungag', 'cmd-ungag', '', 'Снять гаг.'],
    ['unignite', 'cmd-unignite', '', 'Потушить игрока.'],
    ['unmute', 'cmd-unmute', '', 'Снять мьют.'],
    ['unwarn', 'cmd-unwarn', '', 'Снять предупреждение.'],
    ['vanish', 'cmd-vanish', '', 'Полная невидимость: TAB и команды.'],
    ['warn', 'cmd-warn', '', 'Выдать предупреждение.'],
    ['warnlist', 'cmd-warnlist', '', 'Список предупреждений.'],
    ['whitelist', 'cmd-whitelist', '', 'Управление белым списком.'],
    ['world', 'cmd-world', '', 'Управление мирами.']
  ];  var CHEVRON = '<svg class="cat-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  var CAT_ICONS = {
    'FAQs': '<circle cx="12" cy="12" r="9"/><path d="M9.2 9.3a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.4-2.8 4"/><path d="M12 17.4h.01"/>',
    'Конфигурация': '<path d="M4 7h9"/><path d="M17 7h3"/><path d="M4 17h3"/><path d="M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    'Модули': '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
    'Команды': '<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>',
    'Интеграции': '<path d="M10 13.6a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.3 1.3"/><path d="M14 10.4a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.3-1.3"/>',
    'Сообщения': '<path d="M20 14a3 3 0 0 1-3 3H9l-5 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z"/>'
  };
  var CAT_FALLBACK = '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19"/>';

  function catIcon(label) {
    return '<svg class="cat-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (CAT_ICONS[label] || CAT_FALLBACK) + '</svg>';
  }

  function initDocs() {
    var shell = $('.docs-shell');
    var sideNav = $('.docs-nav');
    var tocList = $('#docs-toc-list');
    var prevBtn = $('#doc-prev');
    var nextBtn = $('#doc-next');
    var search = $('#docs-search');
    var emptyNote = $('.docs-empty');
    var foundNote = $('#docs-found');
    var docs = $$('.doc');
    if (!sideNav || !docs.length) return;
    var activeDoc = docs[0];

    /* Собираем группы из исходной разметки, затем строим сворачиваемые категории. */
    var groups = [];
    var cur = null;
    Array.prototype.slice.call(sideNav.children).forEach(function (el) {
      if (el.classList.contains('docs-group')) { cur = { label: el.textContent.trim(), items: [] }; groups.push(cur); return; }
      if (el.classList.contains('docs-link') && cur) {
        cur.items.push({ doc: el.getAttribute('data-doc'), title: el.textContent.trim() });
      }
    });
    groups.forEach(function (g) { if (g.label === 'Команды') { g.commands = true; } });

    sideNav.textContent = '';
    groups.forEach(function (g) {
      var cat = document.createElement('div');
      cat.className = 'docs-cat';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'docs-cat-toggle';
      btn.setAttribute('aria-expanded', 'true');
      var count = g.items.length + (g.commands ? COMMANDS.length : 0);
      btn.innerHTML = catIcon(g.label) + '<span>' + g.label + '</span><span class="cat-count">' + count + '</span>' + CHEVRON;
      var body = document.createElement('div');
      body.className = 'docs-cat-body';
      var inner = document.createElement('div');
      inner.className = 'docs-cat-inner';

      g.items.forEach(function (it) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'docs-link';
        b.setAttribute('data-doc', it.doc);
        b.innerHTML = '<span>' + it.title + '</span>';
        inner.appendChild(b);
      });
      if (g.commands) {
        COMMANDS.forEach(function (c) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'docs-link docs-cmd';
          b.setAttribute('data-doc', c[1]);
          if (c[2]) b.setAttribute('data-anchor', c[2]);
          b.title = c[3];
          b.innerHTML = '<span>/' + c[0] + '</span>';
          inner.appendChild(b);
        });
      }

      body.appendChild(inner);
      btn.addEventListener('click', function () {
        var collapsed = cat.classList.toggle('is-collapsed');
        btn.setAttribute('aria-expanded', String(!collapsed));
      });
      cat.appendChild(btn);
      cat.appendChild(body);
      sideNav.appendChild(cat);
    });

    var docLinks = $$('.docs-link', sideNav);
    var pagerOrder = [];
    docLinks.forEach(function (l) { var d = l.getAttribute('data-doc'); if (pagerOrder.indexOf(d) === -1) pagerOrder.push(d); });

    function pageTop(el) {
      var top = 0;
      while (el) { top += el.offsetTop; el = el.offsetParent; }
      return top;
    }

    function scrollToHeading(el, behavior) {
      var b = reduced ? 'auto' : behavior;
      if (appMode()) {
        var top = el.getBoundingClientRect().top - docsMain.getBoundingClientRect().top + docsMain.scrollTop - 18;
        docsMain.scrollTo({ top: top, behavior: b });
      } else {
        window.scrollTo({ top: pageTop(el) - 84, behavior: b });
      }
    }

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
      /* У командных разделов нет подразделов: панель остаётся без заголовка списка. */
      var tocBox = $('.docs-toc');
      if (tocBox) tocBox.classList.toggle('no-headings', !tocList.children.length);
    }

    markToc = function () {
      var links = $$('a', tocList);
      if (!links.length) return;
      var base = appMode() ? docsMain.getBoundingClientRect().top : 0;
      var threshold = appMode() ? 24 : 140;
      var currentId = links[0].getAttribute('href').slice(1);
      $$('h3[id]', activeDoc).forEach(function (heading) {
        if (heading.getBoundingClientRect().top - base <= threshold) currentId = heading.id;
      });
      links.forEach(function (link) {
        link.classList.toggle('is-active', link.getAttribute('href') === '#' + currentId);
      });
    };

    tocList.addEventListener('click', function (event) {
      var a = event.target.closest('a');
      if (!a) return;
      event.preventDefault();
      var el = document.getElementById(a.getAttribute('href').slice(1));
      if (!el) return;
      scrollToHeading(el, 'smooth');
      history.replaceState(null, '', a.getAttribute('href'));
    });

    function setPager(btn, docId) {
      var title = $('.pager-title', btn);
      var desc = $('.pager-desc', btn);
      if (!docId) { btn.disabled = true; title.textContent = ''; desc.textContent = ''; return; }
      btn.disabled = false;
      var art = $('#doc-' + docId);
      var h2 = art && $('h2', art);
      var lead = art && $('.doc-lead', art);
      title.textContent = h2 ? h2.textContent : docId;
      var d = lead ? lead.textContent.trim() : '';
      desc.textContent = d.length > 110 ? d.slice(0, 107).trim() + '…' : d;
    }

    function openDoc(id, anchorId, push) {
      var doc = $('#doc-' + id);
      if (!doc) return;
      activeDoc = doc;
      docs.forEach(function (item) { item.classList.toggle('is-active', item === doc); });
      var link = null;
      if (anchorId) link = docLinks.filter(function (l) { return l.getAttribute('data-doc') === id && l.getAttribute('data-anchor') === anchorId; })[0];
      if (!link) link = docLinks.filter(function (l) { return l.getAttribute('data-doc') === id; })[0];
      docLinks.forEach(function (l) { l.classList.toggle('is-active', l === link); });
      if (link) {
        var cat = link.closest('.docs-cat');
        if (cat) {
          cat.classList.remove('is-collapsed');
          var t = $('.docs-cat-toggle', cat);
          if (t) t.setAttribute('aria-expanded', 'true');
        }
        if (appMode()) link.scrollIntoView({ block: 'nearest' });
      }
      var idx = pagerOrder.indexOf(id);
      setPager(prevBtn, idx > 0 ? pagerOrder[idx - 1] : null);
      setPager(nextBtn, idx > -1 && idx < pagerOrder.length - 1 ? pagerOrder[idx + 1] : null);
      buildToc();
      if (push) history.replaceState(null, '', anchorId ? '#' + anchorId : '#doc-' + id);
    }

    function goDoc(id, anchorId) {
      openDoc(id, anchorId, true);
      var anchorEl = anchorId ? document.getElementById(anchorId) : null;
      if (appMode()) {
        if (anchorEl) scrollToHeading(anchorEl, 'smooth');
        else docsMain.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      } else if (anchorEl) {
        scrollToHeading(anchorEl, 'smooth');
      } else {
        var top = pageTop(shell) - 84;
        if (window.scrollY > top) window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
      }
    }

    docLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        goDoc(link.getAttribute('data-doc'), link.getAttribute('data-anchor') || null);
      });
    });

    /* Ссылки на другой раздел прямо в тексте статьи. */
    docsMain.addEventListener('click', function (event) {
      var link = event.target.closest ? event.target.closest('a[href^="#"]') : null;
      if (!link) return;
      var target = document.getElementById(link.getAttribute('href').slice(1));
      if (!target) return;
      var owner = target.closest('.doc');
      if (!owner) return;
      event.preventDefault();
      goDoc(owner.id.slice(4), target.id);
    });

    prevBtn.addEventListener('click', function () {
      var idx = pagerOrder.indexOf(activeDoc.id.slice(4));
      if (idx > 0) goDoc(pagerOrder[idx - 1], null);
    });
    nextBtn.addEventListener('click', function () {
      var idx = pagerOrder.indexOf(activeDoc.id.slice(4));
      if (idx > -1 && idx < pagerOrder.length - 1) goDoc(pagerOrder[idx + 1], null);
    });

    function filterDocs() {
      var query = search.value.trim().toLowerCase();
      var visible = 0;
      $$('.docs-cat', sideNav).forEach(function (cat) {
        var links = $$('.docs-link', cat);
        var vis = 0;
        links.forEach(function (l) {
          var hay = (l.textContent + ' ' + (l.title || '')).toLowerCase();
          var show = !query || hay.indexOf(query) !== -1;
          l.hidden = !show;
          if (show) vis++;
        });
        var t = $('.docs-cat-toggle', cat);
        if (query) { cat.classList.remove('is-collapsed'); if (t) t.setAttribute('aria-expanded', 'true'); }
        cat.hidden = vis === 0;
        var badge = $('.cat-count', cat);
        if (badge) badge.textContent = query ? vis : links.length;
        visible += vis;
      });
      emptyNote.hidden = visible !== 0;
      if (foundNote) {
        foundNote.hidden = !query;
        if (query) foundNote.textContent = 'Разделов по запросу: ' + visible;
      }
    }

    search.addEventListener('input', filterDocs);
    search.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        var first = docLinks.filter(function (link) { return !link.hidden; })[0];
        if (first) goDoc(first.getAttribute('data-doc'), first.getAttribute('data-anchor') || null);
      }
      if (event.key === 'Escape') { search.value = ''; filterDocs(); search.blur(); }
    });

    document.addEventListener('keydown', function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        search.focus();
        search.select();
      }
      if (event.key === 'Escape') closeMenu();
    });

    var hash = window.location.hash;
    var defaultId = $('#doc-start') ? 'start' : pagerOrder[0];
    /* Старые ссылки вида #cmd-ban (без doc-) тоже открывают раздел о команде. */
    if (hash.length > 1 && hash.indexOf('#doc-') !== 0
        && !document.getElementById(hash.slice(1)) && $('#doc-' + hash.slice(1))) {
      hash = '#doc-' + hash.slice(1);
    }
    if (hash.indexOf('#doc-') === 0) {
      var id = hash.slice(5);
      if ($('#doc-' + id)) {
        openDoc(id, null, false);
        if (appMode()) docsMain.scrollTo({ top: 0, behavior: 'instant' });
        else window.scrollTo({ top: pageTop(shell) - 84, behavior: 'instant' });
      } else openDoc(defaultId, null, false);
    } else if (hash.length > 1) {
      var target = document.getElementById(hash.slice(1));
      var owner = target && target.closest('.doc');
      if (owner) {
        openDoc(owner.id.slice(4), target.id, false);
        var land = function () { scrollToHeading(target, 'instant'); };
        land();
        var settled = false;
        ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (ev) {
          window.addEventListener(ev, function () { settled = true; }, { once: true, passive: true });
        });
        var reland = function () { if (!settled) land(); };
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(reland);
        window.addEventListener('load', reland);
      } else openDoc(defaultId, null, false);
    } else {
      openDoc(defaultId, null, false);
    }
  }

  if ($('.docs-link')) initDocs();

  /* ----- Обновления: панель версий, фильтр, мета, прогресс ----- */
  var KIND_LABEL = { add: 'добавлено', change: 'изменено', fix: 'исправлено', sec: 'безопасность', net: 'сеть', remove: 'удалено' };
  var KIND_ORDER = ['add', 'change', 'fix', 'sec', 'net', 'remove'];
  var CAT_LABEL = { major: 'Крупное обновление', minor: 'Обновление', patch: 'Патч' };
  var MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  function initUpdates() {
    var rail = $('#release-rail');
    var releases = $$('.release');
    if (!releases.length) return;

    var kindBtns = $$('.kind-btn');
    var catBtns = $$('.cat-btn');
    var note = $('#updates-filter-note');
    var empty = $('#updates-empty');
    var search = $('#updates-search');
    var clearBtn = $('#updates-clear');
    var resetBtn = $('#updates-reset');
    var KEEP_OPEN = 5;
    var FOLD_ITEMS = 6;
    var expanded = false;
    var openCards = {};

    function plural(n, one, few, many) {
      var m10 = n % 10, m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return one;
      if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
      return many;
    }

    /* Категория берётся из номера версии: x.0.0 крупная, x.y.0 обновление, остальное патч */
    function catOf(r) {
      if (r.classList.contains('release-first')) return 'major';
      var el = $('.release-version', r);
      var p = el ? el.textContent.trim().split('.').map(Number) : [];
      if (p.length < 3 || p.some(function (n) { return isNaN(n); })) return 'patch';
      if (!p[1] && !p[2]) return 'major';
      return p[2] ? 'patch' : 'minor';
    }

    var catTotals = { major: 0, minor: 0, patch: 0 };
    var kindTotals = {};
    var totalItems = 0;

    releases.forEach(function (r) {
      var cat = catOf(r);
      var card = $('.release-card', r);
      var head = $('.release-head', r);
      var list = $('.release-list', r);
      var items = list ? $$('.release-list li', list) : [];
      var time = head ? $('time', head) : null;

      r.setAttribute('data-cat', cat);
      catTotals[cat]++;
      totalItems += items.length;
      if (time && time.getAttribute('datetime')) r.setAttribute('data-period', time.getAttribute('datetime').slice(0, 7));

      var counts = {};
      items.forEach(function (li) {
        KIND_ORDER.forEach(function (k) {
          if (!li.classList.contains('k-' + k)) return;
          counts[k] = (counts[k] || 0) + 1;
          kindTotals[k] = (kindTotals[k] || 0) + 1;
        });
      });

      var link = rail ? $('.rail-link[href="#' + r.id + '"]', rail) : null;
      if (link) {
        link.setAttribute('data-cat', cat);
        if (time) link.title = time.textContent.trim() + ' · ' + CAT_LABEL[cat];
      }

      if (!head || !card || !list) return;

      /* Шапка карточки: слева номер и категория, справа дата и счётчики по типам */
      var ver = $('.release-version', head);
      var badge = $('.release-badge', head);
      var tags = $('.release-tags', card);
      var noteEl = $('.release-note', card);
      if (!ver) return;

      var meta = document.createElement('div');
      meta.className = 'release-meta';
      KIND_ORDER.forEach(function (k) {
        if (!counts[k]) return;
        var s = document.createElement('span');
        s.title = KIND_LABEL[k] + ': ' + counts[k];
        s.innerHTML = '<i class="k-' + k + '"></i>' + counts[k];
        meta.appendChild(s);
      });

      var chip = document.createElement('span');
      chip.className = 'rel-cat cat-' + cat;
      chip.textContent = CAT_LABEL[cat];

      var top = document.createElement('div');
      top.className = 'release-top';
      var left = document.createElement('div');
      left.className = 'release-id';
      var right = document.createElement('div');
      right.className = 'release-side';

      left.appendChild(ver);
      left.appendChild(chip);
      if (badge) left.appendChild(badge);
      if (time) right.appendChild(time);
      right.appendChild(meta);
      top.appendChild(left);
      top.appendChild(right);

      card.textContent = '';
      card.appendChild(top);
      if (noteEl) card.appendChild(noteEl);
      card.appendChild(list);
      if (tags) {
        tags.classList.add('is-foot');
        card.appendChild(tags);
      }

      /* Длинные списки показываем по частям */
      if (items.length > FOLD_ITEMS) {
        var more = document.createElement('button');
        more.type = 'button';
        more.className = 'rel-more';
        more.addEventListener('click', function () {
          openCards[r.id] = !openCards[r.id];
          applyFilter();
        });
        card.appendChild(more);
        r._more = more;
      }
    });

    /* Маркеры периодов на шкале времени */
    var lastPeriod = null;
    releases.forEach(function (r) {
      var d = r.getAttribute('data-period');
      if (!d || d === lastPeriod) return;
      lastPeriod = d;
      var m = document.createElement('div');
      m.className = 'tl-period';
      m.setAttribute('data-period', d);
      var parts = d.split('-');
      m.innerHTML = '<span class="tl-period-name">' + (MONTHS[parseInt(parts[1], 10) - 1] || d) + ' ' + parts[0] + '</span>' +
        '<span class="tl-period-count"></span>';
      r.parentNode.insertBefore(m, r);
    });
    var periods = $$('.tl-period');
    periods.forEach(function (p) {
      var d = p.getAttribute('data-period');
      var n = releases.filter(function (r) { return r.getAttribute('data-period') === d; }).length;
      p.querySelector('.tl-period-count').textContent = n + ' ' + plural(n, 'релиз', 'релиза', 'релизов');
    });

    var expandBtn = null;
    if (releases.length > KEEP_OPEN) {
      expandBtn = document.createElement('button');
      expandBtn.type = 'button';
      expandBtn.className = 'updates-expand';
      expandBtn.addEventListener('click', function () {
        expanded = !expanded;
        applyFilter();
      });
      $('.timeline').appendChild(expandBtn);
    }

    function applyFilter() {
      var kind = 'all', cat = 'all';
      kindBtns.forEach(function (b) { if (b.classList.contains('is-active')) kind = b.getAttribute('data-kind'); });
      catBtns.forEach(function (b) { if (b.classList.contains('is-active')) cat = b.getAttribute('data-cat'); });
      var query = search ? search.value.trim().toLowerCase() : '';
      var plain = !query && kind === 'all' && cat === 'all';
      var shownReleases = 0, shownItems = 0, oldTotal = releases.length - KEEP_OPEN;

      releases.forEach(function (r, idx) {
        var items = $$('.release-list li', r);
        var match = 0;
        items.forEach(function (li) {
          var okKind = kind === 'all' || li.classList.contains('k-' + kind);
          var okText = !query || li.textContent.toLowerCase().indexOf(query) !== -1;
          li.classList.toggle('is-out', !okText);
          li.classList.toggle('is-dimmed', okText && !okKind);
          if (okKind && okText) match++;
        });

        var folded = !!r._more && plain && !openCards[r.id];
        items.forEach(function (li, i) { li.classList.toggle('is-cut', folded && i >= FOLD_ITEMS); });
        if (r._more) {
          r._more.hidden = !plain;
          r._more.classList.toggle('is-open', !folded);
          r._more.textContent = folded
            ? 'Показать все ' + items.length + ' ' + plural(items.length, 'изменение', 'изменения', 'изменений')
            : 'Свернуть список';
        }

        var foldedOld = idx >= KEEP_OPEN && !expanded && plain;
        var wrongCat = cat !== 'all' && r.getAttribute('data-cat') !== cat;
        var hidden = foldedOld || wrongCat || (!!query && match === 0);
        r.classList.toggle('is-out', hidden);
        r.classList.toggle('is-dimmed', !hidden && kind !== 'all' && match === 0);
        if (!hidden) { shownReleases++; shownItems += match; }
      });

      periods.forEach(function (p) {
        var d = p.getAttribute('data-period');
        var any = releases.some(function (r) {
          return r.getAttribute('data-period') === d && !r.classList.contains('is-out');
        });
        p.classList.toggle('is-out', !any);
      });

      if (expandBtn) {
        expandBtn.hidden = !plain;
        expandBtn.classList.toggle('is-open', expanded);
        expandBtn.textContent = expanded ? 'Свернуть старые версии' : 'Показать старые версии (' + oldTotal + ')';
      }
      if (clearBtn) clearBtn.hidden = !query;
      if (empty) empty.hidden = shownReleases !== 0;
      if (!note) return;
      if (plain) { note.hidden = true; return; }
      var where = shownReleases + ' ' + plural(shownReleases, 'релизе', 'релизах', 'релизах');
      note.textContent = (query
        ? 'Совпадений: ' + shownItems + ' в ' + where + '.'
        : 'Показано изменений: ' + shownItems + ' в ' + where + '.') +
        (cat === 'all' ? '' : ' Категория: ' + CAT_LABEL[cat].toLowerCase() + '.');
    }

    catBtns.forEach(function (b) {
      var c = b.getAttribute('data-cat');
      var n = c === 'all' ? releases.length : catTotals[c];
      b.insertAdjacentHTML('beforeend', '<em class="uc-count">' + n + '</em>');
      b.addEventListener('click', function () {
        catBtns.forEach(function (o) { o.classList.toggle('is-active', o === b); });
        applyFilter();
      });
    });
    kindBtns.forEach(function (b) {
      var k = b.getAttribute('data-kind');
      var n = k === 'all' ? totalItems : (kindTotals[k] || 0);
      b.insertAdjacentHTML('beforeend', '<em class="uc-count">' + n + '</em>');
      b.addEventListener('click', function () {
        kindBtns.forEach(function (o) { o.classList.toggle('is-active', o === b); });
        applyFilter();
      });
    });

    if (search) {
      search.addEventListener('input', applyFilter);
      search.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        search.value = '';
        applyFilter();
        search.blur();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (!search) return;
        search.value = '';
        search.focus();
        applyFilter();
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (search) search.value = '';
        kindBtns.forEach(function (o, i) { o.classList.toggle('is-active', i === 0); });
        catBtns.forEach(function (o, i) { o.classList.toggle('is-active', i === 0); });
        expanded = false;
        openCards = {};
        applyFilter();
      });
    }
    document.addEventListener('keydown', function (event) {
      if (!search || !(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() !== 'f') return;
      event.preventDefault();
      search.focus();
      search.select();
    });

    applyFilter();
    /* Ссылка на свёрнутую версию должна раскрыть список. */
    if (window.location.hash) {
      var land = document.getElementById(window.location.hash.slice(1));
      if (land && land.classList.contains('release')) {
        if (!land.offsetParent) expanded = true;
        openCards[land.id] = true;
        applyFilter();
      }
    }

    /* Прогресс чтения: по шкале релизов и по панели версий */
    var fill = $('.timeline-progress i');
    var railFill = $('.rail-progress i');
    var timeline = $('.timeline');
    markTimeline = function () {
      if (fill && timeline) {
        var rect = timeline.getBoundingClientRect();
        var passed = Math.min(Math.max(window.innerHeight * .5 - rect.top, 0), rect.height);
        fill.style.height = (rect.height > 0 ? (passed / rect.height) * 100 : 0) + '%';
      }
      if (railFill) {
        var doc = document.documentElement;
        var max = doc.scrollHeight - doc.clientHeight;
        railFill.style.width = (max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0) + '%';
      }
    };

    if (!rail) { markTimeline(); return; }
    var links = $$('.rail-link', rail);
    var box = $('.rail-links', rail);
    var readout = $('#rail-current');
    var prevBtn = $('[data-rail-prev]', rail);
    var nextBtn = $('[data-rail-next]', rail);
    var lastActive = null;

    links.forEach(function (a) {
      a.addEventListener('click', function (event) {
        var el = document.getElementById(a.getAttribute('href').slice(1));
        if (!el) return;
        event.preventDefault();
        if (!el.offsetParent && !expanded) expanded = true;
        openCards[el.id] = true;
        applyFilter();
        var top = el.getBoundingClientRect().top + window.scrollY - 150;
        window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
        history.replaceState(null, '', a.getAttribute('href'));
      });
    });

    function railEdges() {
      if (!box || !prevBtn || !nextBtn) return;
      prevBtn.disabled = box.scrollLeft <= 4;
      nextBtn.disabled = box.scrollLeft + box.clientWidth >= box.scrollWidth - 4;
    }
    function railScroll(dir) {
      if (!box) return;
      box.scrollBy({ left: dir * Math.max(160, box.clientWidth * .8), behavior: reduced ? 'auto' : 'smooth' });
    }
    if (prevBtn) prevBtn.addEventListener('click', function () { railScroll(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { railScroll(1); });
    if (box) {
      box.addEventListener('scroll', railEdges, { passive: true });
      window.addEventListener('resize', railEdges);
    }

    markRail = function () {
      var shown = releases.filter(function (r) { return !!r.offsetParent; });
      if (!shown.length) return;
      var current = shown[0];
      shown.forEach(function (r) { if (r.getBoundingClientRect().top <= 150) current = r; });
      var doc = document.documentElement;
      if (window.scrollY + doc.clientHeight >= doc.scrollHeight - 4) current = shown[shown.length - 1];
      if (current === lastActive) return;
      lastActive = current;
      links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + current.id); });
      if (readout) {
        var v = $('.release-version', current);
        var t = $('time', current);
        var b = readout.querySelector('b');
        var em = readout.querySelector('em');
        if (v && b) b.textContent = v.textContent.trim();
        if (t && em) em.textContent = t.textContent.trim();
      }
      var act = $('.rail-link.is-active', rail);
      if (act && box) {
        var ar = act.getBoundingClientRect(), br = box.getBoundingClientRect();
        if (ar.left < br.left || ar.right > br.right) {
          box.scrollBy({ left: ar.left - br.left - (br.width - ar.width) / 2, behavior: reduced ? 'auto' : 'smooth' });
        }
      }
      railEdges();
    };

    markRail();
    markTimeline();
    railEdges();
  }

  if ($('.release')) initUpdates();

  /* ----- Карусели: возможности и модули ----- */
  function initCarousel() {
    $$('.carousel').forEach(function (root) {
    var track = $('.carousel-track', root);
    var cards = track ? Array.prototype.slice.call(track.children) : [];
    var prev = $('[data-car-prev]', root);
    var next = $('[data-car-next]', root);
    var dotsBox = $('[data-car-dots]', root);
    if (!track || !prev || !next || !dotsBox || !cards.length) return;

    function step() {
      var gap = parseFloat(getComputedStyle(track).gap) || 16;
      return cards[0].getBoundingClientRect().width + gap;
    }
    function perView() { return Math.max(1, Math.round(track.clientWidth / step())); }
    function maxIndex() { return Math.max(0, cards.length - perView()); }
    function currentIndex() { return Math.min(maxIndex(), Math.round(track.scrollLeft / step())); }

    var dots = [];
    function buildDots() {
      dotsBox.textContent = '';
      dots = [];
      for (var i = 0; i <= maxIndex(); i++) {
        var d = document.createElement('button');
        d.type = 'button';
        d.className = 'car-dot';
        d.setAttribute('aria-label', 'Карточка ' + (i + 1));
        (function (idx) { d.addEventListener('click', function () { track.scrollTo({ left: idx * step(), behavior: reduced ? 'auto' : 'smooth' }); }); })(i);
        dotsBox.appendChild(d);
        dots.push(d);
      }
    }
    function update() {
      var i = currentIndex();
      dots.forEach(function (d, k) { d.classList.toggle('is-active', k === i); });
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    }

    prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: reduced ? 'auto' : 'smooth' }); });

    var scrollTick = false;
    track.addEventListener('scroll', function () {
      if (scrollTick) return;
      scrollTick = true;
      window.requestAnimationFrame(function () { update(); scrollTick = false; });
    }, { passive: true });

    track.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowRight') { event.preventDefault(); next.click(); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); prev.click(); }
    });

    /* Перетаскивание мышью/пальцем без случайного перехода по ссылке */
    var down = false, startX = 0, startScroll = 0, moved = false, suppress = false;
    track.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      down = true; moved = false;
      startX = event.clientX; startScroll = track.scrollLeft;
    });
    track.addEventListener('pointermove', function (event) {
      if (!down) return;
      var dx = event.clientX - startX;
      if (!moved && Math.abs(dx) > 6) {
        moved = true;
        /* Захват только после начала перетаскивания: иначе клик по ссылке
           достаётся треку, а не карточке, и переход не происходит. */
        try { track.setPointerCapture(event.pointerId); } catch (e) {}
      }
      if (moved) { track.scrollLeft = startScroll - dx; event.preventDefault(); }
    });
    function endDrag(event) {
      if (!down) return;
      down = false;
      if (track.hasPointerCapture && track.hasPointerCapture(event.pointerId)) {
        try { track.releasePointerCapture(event.pointerId); } catch (e) {}
      }
      if (moved) { suppress = true; window.setTimeout(function () { suppress = false; }, 60); }
    }
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    track.addEventListener('click', function (event) {
      if (suppress) { event.preventDefault(); event.stopPropagation(); }
    }, true);

    window.addEventListener('resize', function () { buildDots(); update(); });
    buildDots();
    update();
    });
  }
  initCarousel();

  /* ----- Discord-виджет ----- */
  function initDiscord() {
    var widget = $('#discord-widget');
    if (!widget) return;
    var nameEl = $('#discord-name');
    var onlineEl = $('#discord-online');
    var membersEl = $('#discord-members');
    var icon = $('#discord-icon');
    var avatar = $('.discord-avatar', widget);
    if (icon && avatar) icon.addEventListener('error', function () { avatar.classList.add('is-fallback'); });

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? window.setTimeout(function () { controller.abort(); }, 7000) : null;
    fetch('https://discord.com/api/v9/invites/3KHgzWhAN9?with_counts=true', controller ? { signal: controller.signal } : {})
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('http')); })
      .then(function (j) {
        if (timer) window.clearTimeout(timer);
        if (j.guild && j.guild.name && nameEl) nameEl.textContent = j.guild.name;
        if (typeof j.approximate_presence_count === 'number' && onlineEl) onlineEl.textContent = String(j.approximate_presence_count);
        if (typeof j.approximate_member_count === 'number' && membersEl) membersEl.textContent = String(j.approximate_member_count);
        if (j.guild && j.guild.icon && icon && avatar) {
          /* Анимированный аватар отдаётся только как gif, png для него 404. */
          var ext = j.guild.icon.indexOf('a_') === 0 ? 'gif' : 'png';
          icon.src = 'https://cdn.discordapp.com/icons/' + j.guild.id + '/' + j.guild.icon + '.' + ext + '?size=256';
          avatar.classList.remove('is-fallback');
        }
        widget.classList.add('is-live');
      })
      .catch(function () {
        if (timer) window.clearTimeout(timer);
        widget.classList.add('is-fallback');
      });
  }
  initDiscord();

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

  $$('.code-block:not(.code-cmd) code').forEach(highlightYaml);

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

  /* ----- Заставка при загрузке ----- */
  var preloader = $('#preloader');
  if (preloader) {
    var pct = $('#preloader-pct');
    var barFill = $('#preloader-bar-fill');
    var tip = $('#preloader-tip');
    var tips = ['ядро', 'модули', 'конфигурация', 'интеграции', 'сообщество'];
    var loaded = false, tipI = 0, tipTimer = 0, start = null;

    function setP(v) {
      if (pct) pct.textContent = Math.round(v) + '%';
      if (barFill) barFill.style.transform = 'scaleX(' + (v / 100) + ')';
    }
    function ramp(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / 1300, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      setP(loaded ? 100 : Math.min(92, eased * 92));
      if (!loaded && t < 1) window.requestAnimationFrame(ramp);
    }
    function finish() {
      if (loaded) return;
      loaded = true;
      setP(100);
      window.clearInterval(tipTimer);
      if (tip) { tip.style.opacity = '1'; tip.textContent = 'готово'; }
      window.setTimeout(function () {
        preloader.classList.add('is-done');
        window.setTimeout(function () {
          if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
        }, 650);
      }, 380);
    }

    if (reduced) {
      finish();
    } else {
      window.requestAnimationFrame(ramp);
      tipTimer = window.setInterval(function () {
        tipI = (tipI + 1) % tips.length;
        if (!tip) return;
        tip.style.opacity = '0';
        window.setTimeout(function () { tip.textContent = tips[tipI]; tip.style.opacity = '1'; }, 180);
      }, 700);
      if (document.readyState === 'complete') window.setTimeout(finish, 500);
      else window.addEventListener('load', function () { window.setTimeout(finish, 420); });
      window.setTimeout(function () { if (!loaded) finish(); }, 4000);
    }
  }

  onScroll();
})();