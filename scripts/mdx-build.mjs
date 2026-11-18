// Сборка mdx/*.mdx в HTML c классами сайта (тестовый формат документации).
// Запуск из папки сайта: node scripts/mdx-build.mjs
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'mdx');
const PAGE = path.join(ROOT, 'mdx-test.html');
const START = '<!-- mdx:start -->';
const END = '<!-- mdx:end -->';

const PART_CLASS = { 'Описание': 'desc', 'Настройка': 'set', 'Права': 'perm' };
const SCOPE = {
  all: ['по умолчанию у всех', ''],
  op: ['по умолчанию у операторов', ' is-op'],
  true: ['по умолчанию включено', ' is-op'],
  manual: ['выдают вручную', '']
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const inline = (s) => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');

const slug = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');

const splitRow = (line) => line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

function frontmatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(src);
  if (!m) throw new Error('нет frontmatter');
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([a-z-]+):\s*(.*)$/.exec(line.trim());
    if (kv) meta[kv[1]] = kv[2];
  }
  return { meta, body: src.slice(m[0].length) };
}

// Блоки компонентов: <Tag attr="v"> ... </Tag>, закрывающий тег на своей строке, без вложенных тегов.
function component(tag, attrs, body) {
  const lines = body.split(/\r?\n/).filter((l, i, a) => !(l.trim() === '' && (i === 0 || i === a.length - 1)));
  if (tag === 'Callout') {
    return `<div class="callout callout-${attrs.type || 'info'}">${markdown(lines.join('\n'))}</div>`;
  }
  if (tag === 'Cmd') {
    return `<div class="code-block code-cmd"><button class="copy-btn" type="button">Копировать</button><pre><code>${esc(lines.join('\n'))}</code></pre></div>`;
  }
  if (tag === 'Config') {
    const link = attrs.link ? `<a class="doc-file-link" href="${attrs.link}">${attrs.linktext || 'как устроен блок'}</a>` : '';
    return `<p class="doc-file"><code class="doc-file-name">${attrs.file}</code><span class="doc-file-path">${attrs.path}</span>${link}</p>\n`
      + `<div class="code-block"><button class="copy-btn" type="button">Копировать</button><pre><code>${esc(lines.join('\n'))}</code></pre></div>`;
  }
  if (tag === 'Keys') {
    const rows = lines.map((l) => {
      const i = l.indexOf('|');
      if (i < 0) throw new Error('Keys: строка без разделителя |');
      return `<dt><code>${esc(l.slice(0, i).trim())}</code></dt><dd>${inline(l.slice(i + 1).trim())}</dd>`;
    });
    return `<dl class="doc-keys">\n${rows.map((r) => '  ' + r).join('\n')}\n</dl>`;
  }
  if (tag === 'Perms') {
    const rows = lines.map((l) => {
      const [name, scope, desc] = l.split('|').map((c) => c.trim());
      const [label, cls] = SCOPE[scope] || SCOPE.manual;
      return `<div class="doc-perm"><code>${esc(name)}</code><span class="perm-scope${cls}">${label}</span><p class="perm-desc">${inline(desc)}</p></div>`;
    });
    return `<div class="doc-perms">\n${rows.map((r) => '  ' + r).join('\n')}\n</div>`;
  }
  throw new Error('неизвестный компонент ' + tag);
}

function markdown(src) {
  const out = [];
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  let para = [];
  const flush = () => {
    if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; }
  };
  while (i < lines.length) {
    const line = lines[i];

    const comp = /^<([A-Z][A-Za-z]*)\b([^>]*)>$/.exec(line.trim());
    if (comp) {
      const attrs = {};
      for (const a of comp[2].matchAll(/([a-z-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
      const close = `</${comp[1]}>`;
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== close) j++;
      if (j >= lines.length) throw new Error(`${comp[1]}: нет закрывающего ${close}`);
      flush();
      out.push(component(comp[1], attrs, lines.slice(i + 1, j).join('\n')));
      i = j + 1;
      continue;
    }

    const fence = /^```(\S*)$/.exec(line.trim());
    if (fence) {
      flush();
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== '```') j++;
      if (j >= lines.length) throw new Error('незакрытый блок кода');
      const body = lines.slice(i + 1, j);
      out.push(`<div class="code-block"><button class="copy-btn" type="button">Копировать</button><pre><code>${esc(body.join('\n'))}</code></pre></div>`);
      i = j + 1;
      continue;
    }

    if (/^\|/.test(line.trim())) {
      flush();
      const rows = [];
      let j = i;
      while (j < lines.length && /^\|/.test(lines[j].trim())) { rows.push(splitRow(lines[j].trim())); j++; }
      const head = rows[0];
      const keepHead = head.some((c) => c && !/^-+$/.test(c));
      const noHead = (r) => r.every((c) => /^-+$/.test(c) || !c);
      const body = (keepHead ? rows.slice(1) : rows).filter((r) => !noHead(r));
      const thead = keepHead ? `<thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>` : '';
      const cells = (r) => r.map((c, k) => (!keepHead && k === 0 ? `<th>${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join('');
      const trs = body.map((r) => `<tr>${cells(r)}</tr>`);
      out.push(`<table class="req req-wide">${thead}<tbody>\n${trs.map((t) => '  ' + t).join('\n')}\n</tbody></table>`);
      i = j;
      continue;
    }

    if (/^- /.test(line.trim())) {
      flush();
      const items = [];
      let j = i;
      while (j < lines.length && /^(- |\d+ )/.test(lines[j].trim())) { items.push(`<li>${inline(lines[j].trim().replace(/^(- |\d+ )/, ''))}</li>`); j++; }
      out.push(`<ul class="steps">\n${items.map((t) => '  ' + t).join('\n')}\n</ul>`);
      i = j;
      continue;
    }

    const h = /^(#{2,3})\s+(.*)$/.exec(line.trim());
    if (h) {
      flush();
      out.push(h[1] === '##' ? `##${h[2]}` : `<h3 id="${slug(h[2])}">${inline(h[2])}</h3>`);
      i++;
      continue;
    }

    if (!line.trim()) { flush(); i++; continue; }
    para.push(line.trim());
    i++;
  }
  flush();
  return out.join('\n');
}

// «## Название» превращает следующий блок в секцию карточки.
function sections(src) {
  const parts = [];
  let cur = { name: null, body: [] };
  for (const line of markdown(src).split('\n')) {
    const m = /^##(.*)$/.exec(line);
    if (m) {
      if (cur.name !== null || cur.body.length) parts.push(cur);
      cur = { name: m[1].trim(), body: [] };
      continue;
    }
    cur.body.push(line);
  }
  parts.push(cur);
  return parts.map((p) => {
    let body = p.body.join('\n').replace(/^\n+|\n+$/g, '');
    if (p.name === null) return body;
    if (p.name === 'Описание') body = body.replace('<p>', '<p class="doc-lead">');
    const cls = PART_CLASS[p.name] ? ` doc-part-${PART_CLASS[p.name]}` : '';
    return `<section class="doc-part${cls}">\n  <h3 class="doc-part-name">${esc(p.name)}</h3>\n${body}\n</section>`;
  }).join('\n');
}

function article(file, src) {
  const { meta, body } = frontmatter(src);
  if (!meta.id || !meta.title) throw new Error(`${file}: нужны id и title`);
  const crumbs = (meta.crumbs || '').split('/').map((c) => c.trim()).filter(Boolean);
  const crumbHtml = crumbs.length
    ? `<p class="doc-crumbs">${esc(crumbs[0])}${crumbs.slice(1).map((c) => ` <span>/</span> ${esc(c)}`).join('')}</p>`
    : '';
  return `<!-- ${file}: собрано scripts/mdx-build.mjs, не править вручную -->\n`
    + `<article class="doc is-active" id="doc-${meta.id}" data-group="${esc(meta.group || '')}">\n`
    + `  ${crumbHtml}\n  <h2>${inline(meta.title)}</h2>\n${sections(body)}\n</article>`;
}

const files = (await fs.readdir(SRC)).filter((f) => f.endsWith('.mdx')).sort();
const built = [];
for (const f of files) {
  built.push(article(f, await fs.readFile(path.join(SRC, f), 'utf8')));
}

const html = await fs.readFile(PAGE, 'utf8');
const from = html.indexOf(START), to = html.indexOf(END);
if (from < 0 || to < from) throw new Error(`${PAGE}: нет маркеров сборки`);
await fs.writeFile(PAGE, html.slice(0, from + START.length) + '\n' + built.join('\n\n') + '\n          ' + html.slice(to), 'utf8');
console.log(`собрано статей: ${built.length} (${files.join(', ')})`);
