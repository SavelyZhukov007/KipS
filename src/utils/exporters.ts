// @ts-ignore - vite raw imports
import renderTsRaw from '../anim/render.ts?raw'
// @ts-ignore
import animCanvasRaw from '../anim/AnimationCanvas.tsx?raw'
// @ts-ignore
import indexCssRaw from '../index.css?raw'
// @ts-ignore
import typesRaw from '../types/index.ts?raw'

import JSZip from 'jszip'
import type { Book, Chapter, Note, Block } from '../types'

// ═══════════════════════ ВСПОМОГАТЕЛЬНОЕ ═══════════════════════
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(url)
    a.remove()
  }, 0)
}

function safeName(s: string) {
  return s
    .replace(/[^\p{L}\p{N}\s\-_.]+/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'codex'
}

// Уникальный «необычный» порт. 47000-49000 — диапазон редко используемых регистрируемых портов.
function uniquePort(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  // диапазон 47100..48900 (явно не 5000/8000/3000/4173/5173/8080)
  return 47100 + (Math.abs(h) % 1801)
}

// ═══════════════════════ JSON ═══════════════════════
export function exportBookJSON(book: Book) {
  const data = JSON.stringify(book, null, 2)
  download(new Blob([data], { type: 'application/json' }), `${safeName(book.title)}.codex.json`)
}

// ═══════════════════════ MARKDOWN ═══════════════════════
function blockToMarkdown(b: Block): string {
  switch (b.type) {
    case 'header': return `${'#'.repeat(b.level + 1)} ${b.content}\n`
    case 'theory': return `${b.highlight ? '> ' : ''}${b.content}\n`
    case 'python': return `${b.title ? `**${b.title}**\n\n` : ''}\`\`\`python\n${b.content}\n\`\`\`${b.description ? `\n\n*${b.description}*` : ''}\n`
    case 'image': return b.src
      ? `![${b.alt || b.caption || ''}](${b.src.startsWith('data:') ? '#image' : b.src})${b.caption ? `\n*${b.caption}*` : ''}\n`
      : ''
    case 'animation': return `> 🎞 *Анимация: ${b.animType}* ${b.caption ? `— ${b.caption}` : ''}\n>\n> _(интерактивна в HTML/Vite-экспорте)_\n`
    case 'exercise': return `**Задача${b.number ? ` ${b.number}` : ''}.** ${b.question}\n\n<details><summary>Решение</summary>\n\n${b.answer ? `**Ответ:** ${b.answer}\n\n` : ''}${b.explanation}\n\n</details>\n`
    case 'quote': return `> ${b.content}${b.author ? `\n>\n> — *${b.author}*` : ''}\n`
    case 'divider': return `\n---\n`
  }
}

function noteToMarkdown(n: Note): string {
  return `## ${n.title}\n\n` + n.blocks.map(blockToMarkdown).join('\n')
}

function chapterToMarkdown(c: Chapter): string {
  return `# ${c.title}\n\n` + c.notes.map(noteToMarkdown).join('\n\n---\n\n')
}

export function bookToMarkdown(book: Book): string {
  let md = `# ${book.title}\n\n`
  if (book.author) md += `*${book.author}*\n\n`
  if (book.description) md += `${book.description}\n\n`
  md += '---\n\n'
  md += '## Оглавление\n\n'
  book.chapters.forEach((c, i) => {
    md += `${i + 1}. **${c.title}**\n`
    c.notes.forEach((n, j) => { md += `    - ${i + 1}.${j + 1}. ${n.title}\n` })
  })
  md += '\n---\n\n'
  for (const c of book.chapters) md += chapterToMarkdown(c) + '\n\n'
  return md
}

export function exportBookMarkdown(book: Book) {
  download(new Blob([bookToMarkdown(book)], { type: 'text/markdown;charset=utf-8' }), `${safeName(book.title)}.md`)
}

// ═══════════════════════ HTML — самодостаточный одностраничник ═══════════════════════
// Стратегия: статически генерируем HTML+SVG-фоллбэки для всего, кроме анимаций.
// Анимации в SingleHTML рендерятся через встроенный JS — render.ts вкомпилирован как строка.
export function exportBookSingleHTML(book: Book) {
  const html = buildSingleHTML(book)
  download(new Blob([html], { type: 'text/html;charset=utf-8' }), `${safeName(book.title)}.html`)
}

function buildSingleHTML(book: Book): string {
  // Превращаем render.ts (TypeScript) в JS «на лету».
  // Поскольку render.ts использует только синтаксис без типов в рантайме,
  // нам достаточно: убрать тайп-импорты, заменить `export function` на `function` и регистрировать через окно.
  const renderJs = stripTypes(renderTsRaw as string)

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>${escapeHtml(book.title)} — Codex</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
${indexCssRaw}
.codex-page { max-width: 760px; margin: 0 auto; background: var(--paper);
  padding: 60px 70px; box-shadow: 0 4px 16px rgba(33,26,18,0.18); margin-bottom: 30px; }
body { background: linear-gradient(135deg, #2a221a 0%, #1c160f 100%); padding: 40px 16px; }
.codex-cover h1 { font-family: var(--font-serif); font-size: 42px; text-align: center; margin: 40px 0 20px; }
.codex-cover .author { text-align: center; font-style: italic; color: var(--ink-soft); }
.codex-toc-row { display: flex; gap: 8px; padding: 4px 0 4px 24px; font-family: var(--font-serif-body); }
.codex-toc-row .leader { flex: 1; border-bottom: 1px dotted var(--rule); transform: translateY(-3px); }
.codex-h { font-family: var(--font-serif); font-weight: 500; color: var(--ink); }
.codex-p { font-family: var(--font-serif-body); font-size: 16px; line-height: 1.75; text-align: justify; }
.codex-pre { background: #211a12; color: #f3eddc; padding: 18px; font-family: var(--font-mono);
  font-size: 13px; line-height: 1.55; border-radius: 3px; overflow: auto; }
.codex-quote { border-left: 3px solid var(--gold); padding: 4px 24px; font-style: italic;
  background: rgba(160,122,60,0.04); margin: 22px 0; font-family: var(--font-serif-body); }
.codex-fig { margin: 22px 0; text-align: center; }
.codex-fig img { max-width: 100%; border-radius: 4px; }
.codex-fig figcaption { font-family: var(--font-serif-body); font-style: italic; color: var(--ink-soft); font-size: 13px; margin-top: 8px; }
.codex-anim-wrap { border: 1px solid var(--rule); border-radius: 3px; padding: 12px; background: rgba(245,239,225,0.5); }
.codex-anim-wrap canvas { display: block; width: 100%; height: 280px; }
.codex-divider { text-align: center; margin: 24px 0; color: var(--gold); font-family: var(--font-serif); }
.codex-ex { margin: 20px 0; padding: 18px; border: 1px solid var(--rule); border-radius: 3px; background: rgba(160,122,60,0.04); }
.codex-ex summary { cursor: pointer; color: var(--accent); font-family: var(--font-ui); font-size: 13px; font-style: italic; }
.codex-page-num { text-align: center; font-family: var(--font-serif); font-style: italic; color: var(--ink-soft); font-size: 12px; margin-top: 30px; }
.codex-chapter-h { font-size: 30px; margin: 0 0 28px; text-align: center; font-family: var(--font-serif); }
.codex-chapter-num { font-family: var(--font-mono); font-size: 12px; color: var(--gold); letter-spacing: 0.12em; text-align: center; display: block; margin-bottom: 4px; }
.codex-toc-h { font-size: 30px; text-align: center; font-family: var(--font-serif); margin: 0 0 36px; }
.codex-toc-ch { display: flex; align-items: baseline; gap: 10px; font-family: var(--font-serif); font-size: 18px;
  border-bottom: 1px solid var(--rule); padding-bottom: 4px; margin: 18px 0 8px; }
.codex-toc-ch span { font-style: italic; }
.codex-anchor { color: var(--ink); text-decoration: none; cursor: pointer; }
.codex-anchor:hover { color: var(--accent); }
.codex-divider-flourish { letter-spacing: 0.6em; font-size: 24px; color: var(--gold); }
</style>
</head>
<body>
${buildSingleHTMLBody(book)}

<script>
${renderJs}

// Запуск всех canvas с data-anim
window.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('canvas[data-anim]').forEach(function (c) {
    var type = c.getAttribute('data-anim');
    var params = JSON.parse(c.getAttribute('data-params') || '{}');
    var dpr = window.devicePixelRatio || 1;
    function resize() {
      var rect = c.getBoundingClientRect();
      c.width = rect.width * dpr; c.height = rect.height * dpr;
    }
    resize(); window.addEventListener('resize', resize);
    var ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var t0 = performance.now();
    function loop(now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var rect = c.getBoundingClientRect();
      window.__renderAnim(type, ctx, rect.width, rect.height, (now - t0) / 1000, params);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });
});
</script>
</body>
</html>`
}

function buildSingleHTMLBody(book: Book): string {
  let html = ''

  // Обложка
  html += `<section class="codex-page codex-cover" id="cover">
    <div style="text-align:center; color: var(--gold); font-family: var(--font-serif); font-size: 32px; letter-spacing: 0.4em; margin-bottom: 30px;">❦ ❦ ❦</div>
    <h1>${escapeHtml(book.title)}</h1>
    ${book.author ? `<div class="author" style="font-family: var(--font-serif-body); font-size: 18px; margin-top: 20px;">${escapeHtml(book.author)}</div>` : ''}
    ${book.description ? `<div style="text-align:center; max-width: 520px; margin: 30px auto 0; font-family: var(--font-serif-body); color: var(--ink-soft); line-height: 1.7;">${escapeHtml(book.description)}</div>` : ''}
    <div style="text-align:center; color: var(--gold); font-family: var(--font-serif); font-size: 22px; letter-spacing: 0.5em; margin-top: 50px;">✦</div>
  </section>`

  // Оглавление
  html += `<section class="codex-page" id="toc">
    <h1 class="codex-toc-h">Оглавление</h1>`
  let global = 0
  book.chapters.forEach((c, ci) => {
    html += `<div class="codex-toc-ch"><span style="font-family: var(--font-mono); font-size: 12px; color: var(--gold);">${romanize(ci + 1)}</span><span>${escapeHtml(c.title)}</span></div>`
    c.notes.forEach((n, ni) => {
      global += 1
      html += `<div class="codex-toc-row">
        <span style="font-family: var(--font-mono); font-size: 11px; color: var(--ink-soft);">§${ni + 1}.</span>
        <a class="codex-anchor" href="#note-${escapeHtml(n.id)}" style="flex:1;">${escapeHtml(n.title)}</a>
        <span class="leader"></span>
        <span style="font-family: var(--font-mono); font-size: 11px; color: var(--ink-soft);">${global}</span>
      </div>`
    })
  })
  html += `</section>`

  // Конспекты
  global = 0
  book.chapters.forEach((c, ci) => {
    c.notes.forEach((n, ni) => {
      global += 1
      html += `<section class="codex-page" id="note-${escapeHtml(n.id)}">
        <div style="text-align:center; color: var(--gold); margin-bottom: 24px; font-family: var(--font-serif); font-size: 14px;">✦ &nbsp; ❦ &nbsp; ✦</div>
        <header style="margin-bottom: 28px;">
          <span class="codex-chapter-num" style="text-align:left;">§ ${ni + 1} · ${escapeHtml(c.title.toUpperCase())}</span>
          <h1 class="codex-h" style="font-size: 28px; margin: 0;">${escapeHtml(n.title)}</h1>
        </header>`
      n.blocks.forEach((b, idx) => { html += blockToHTML(b, idx) })
      html += `<div class="codex-page-num">— ${global} —</div></section>`
    })
  })

  return html
}

function blockToHTML(b: Block, idx: number): string {
  switch (b.type) {
    case 'header': {
      const tag = b.level === 1 ? 'h2' : b.level === 2 ? 'h3' : 'h4'
      const sz = b.level === 1 ? 26 : b.level === 2 ? 21 : 18
      return `<${tag} class="codex-h" style="font-size:${sz}px;margin-top:32px;margin-bottom:12px;line-height:1.3;">${escapeHtml(b.content)}</${tag}>`
    }
    case 'theory': {
      const inner = inlineMd(b.content)
      const dropFirst = idx === 0 && /^[a-zA-Zа-яА-Я]/.test(b.content)
      const body = dropFirst
        ? `<span style="float:left;font-family:var(--font-serif);font-size:56px;line-height:0.85;color:var(--accent);margin-right:6px;margin-top:4px;font-weight:600;">${escapeHtml(b.content[0])}</span>${inlineMd(b.content.slice(1))}`
        : inner
      const styles = b.highlight
        ? 'background:rgba(160,122,60,0.08);padding:12px 16px;border-left:2px solid var(--gold);'
        : ''
      return `<p class="codex-p" style="margin:14px 0;${styles}">${body}</p>`
    }
    case 'python':
      return `<figure style="margin:20px 0;">
        ${b.title ? `<figcaption style="font-family:var(--font-mono);font-size:11px;color:var(--ink-soft);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;">листинг — ${escapeHtml(b.title)}</figcaption>` : ''}
        <pre class="codex-pre">${escapeHtml(b.content)}</pre>
        ${b.description ? `<figcaption style="font-family:var(--font-serif-body);font-style:italic;color:var(--ink-soft);font-size:13px;text-align:center;margin-top:6px;">${escapeHtml(b.description)}</figcaption>` : ''}
      </figure>`
    case 'image':
      if (!b.src) return ''
      return `<figure class="codex-fig">
        <img src="${b.src}" alt="${escapeHtml(b.alt)}" style="object-fit:${b.fit ?? 'contain'};border-radius:${b.borderRadius ?? 4}px;filter:brightness(${b.brightness ?? 100}%) contrast(${b.contrast ?? 100}%);max-height:420px;">
        ${b.caption ? `<figcaption><span style="font-family:var(--font-serif);font-weight:500;">Илл. </span>${escapeHtml(b.caption)}</figcaption>` : ''}
      </figure>`
    case 'animation':
      return `<figure style="margin:24px 0;">
        <div class="codex-anim-wrap">
          <canvas data-anim="${escapeHtml(b.animType)}" data-params='${escapeHtml(JSON.stringify(b.params))}'></canvas>
        </div>
        ${b.caption ? `<figcaption style="text-align:center;font-family:var(--font-serif-body);font-style:italic;color:var(--ink-soft);font-size:13px;margin-top:8px;"><span style="font-family:var(--font-serif);font-weight:500;">Рис. </span>${escapeHtml(b.caption)}</figcaption>` : ''}
      </figure>`
    case 'exercise':
      return `<div class="codex-ex">
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--accent);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">Задача${b.number ? ` № ${escapeHtml(b.number)}` : ''}</div>
        <div style="font-family:var(--font-serif-body);font-size:15px;line-height:1.7;">${escapeHtml(b.question)}</div>
        ${(b.answer || b.explanation) ? `<details style="margin-top:8px;">
          <summary>показать решение</summary>
          <div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--rule);">
            ${b.answer ? `<div style="margin-bottom:8px;font-family:var(--font-mono);font-size:13px;"><strong>Ответ:</strong> ${escapeHtml(b.answer)}</div>` : ''}
            ${b.explanation ? `<div style="font-family:var(--font-serif-body);font-size:14px;line-height:1.7;">${escapeHtml(b.explanation)}</div>` : ''}
          </div>
        </details>` : ''}
      </div>`
    case 'quote':
      return `<blockquote class="codex-quote">
        <p style="margin:0;">${escapeHtml(b.content)}</p>
        ${b.author ? `<footer style="text-align:right;margin-top:6px;font-size:13px;color:var(--ink-soft);">— ${escapeHtml(b.author)}</footer>` : ''}
      </blockquote>`
    case 'divider':
      if (b.style === 'plain') return `<hr style="border:none;border-top:1px solid var(--rule);margin:20px 0;">`
      if (b.style === 'flourish') return `<div class="codex-divider codex-divider-flourish">❦ ❦ ❦</div>`
      return `<div class="codex-divider" style="display:flex;align-items:center;gap:14px;"><div style="flex:1;height:1px;background:var(--rule);"></div><span style="font-family:var(--font-serif);font-size:18px;">✦</span><div style="flex:1;height:1px;background:var(--rule);"></div></div>`
  }
}

function inlineMd(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code style="font-family:var(--font-mono);font-size:0.9em;background:rgba(160,122,60,0.12);padding:1px 4px;border-radius:2px;">$1</code>')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function romanize(n: number): string {
  const map: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let out = '', x = n
  for (const [v, s] of map) while (x >= v) { out += s; x -= v }
  return out
}

// stripTypes: транспилирует render.ts (TS) → JS через Sucrase.
// Sucrase хорошо справляется с произвольным TS-кодом без необходимости в полном TypeScript-компиляторе.
import { transform } from 'sucrase'

function stripTypes(src: string): string {
  // Убираем строки `import type ...` и `import { ... } from '../types'` (они не нужны в рантайме —
  // render.ts использует только AnimType как тип-параметр)
  let pre = src
    .replace(/^\s*import\s+type[\s\S]*?;?\s*$/gm, '')
    .replace(/^\s*import\s+\{[^}]*\}\s+from\s+['"][^'"]*types['"]\s*;?\s*$/gm, '')
  const result = transform(pre, { transforms: ['typescript'] })
  // Превращаем `export function renderAnim(...)` в обычное объявление + регистрацию в window
  let out = result.code.replace(/^export\s+function\s+/gm, 'function ')
    .replace(/^export\s+const\s+/gm, 'const ')
  out += '\n;window.__renderAnim = renderAnim;\n'
  return out
}

// ═══════════════════════ VITE-ПРОЕКТ ═══════════════════════
export async function exportBookVite(book: Book) {
  const port = uniquePort(book.id + book.title)
  const zip = new JSZip()

  zip.file('package.json', JSON.stringify({
    name: safeName(book.title),
    private: true, version: '1.0.0', type: 'module',
    scripts: {
      dev: `vite --port ${port} --strictPort --open`,
      build: 'tsc -b && vite build',
      preview: `vite preview --port ${port} --strictPort --open`,
    },
    dependencies: {
      react: '^19.0.0',
      'react-dom': '^19.0.0',
    },
    devDependencies: {
      '@types/react': '^19.0.0',
      '@types/react-dom': '^19.0.0',
      '@vitejs/plugin-react': '^5.0.0',
      typescript: '^5.6.0',
      vite: '^7.0.0',
      'vite-plugin-singlefile': '^2.0.0',
    },
  }, null, 2))

  zip.file('vite.config.ts', `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: ${port}, strictPort: true, open: true },
  preview: { port: ${port}, strictPort: true, open: true },
})
`)

  zip.file('tsconfig.json', JSON.stringify({
    compilerOptions: {
      target: 'ES2020', module: 'ESNext', moduleResolution: 'bundler',
      jsx: 'react-jsx', strict: false, skipLibCheck: true,
      esModuleInterop: true, allowSyntheticDefaultImports: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'], isolatedModules: true,
    },
    include: ['src'],
  }, null, 2))

  zip.file('index.html', `<!doctype html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(book.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
</head>
<body>
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
</body>
</html>
`)

  zip.file('src/index.css', indexCssRaw)
  zip.file('src/types.ts', typesRaw as string)
  zip.file('src/render.ts', (renderTsRaw as string).replace(/from '\.\.\/types'/g, "from './types'"))
  zip.file('src/AnimationCanvas.tsx',
    (animCanvasRaw as string)
      .replace(/from '\.\/render'/g, "from './render'")
      .replace(/from '\.\.\/types'/g, "from './types'"))

  // встраиваем содержимое книги
  zip.file('src/book.ts', `import type { Book } from './types'
export const BOOK: Book = ${JSON.stringify(book, null, 2)} as Book
`)

  zip.file('src/main.tsx', `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
`)

  // Reader-логика — упрощённая копия страницы Reader, но без store (книга встроена)
  zip.file('src/App.tsx', readerStandaloneSource())

  // run.sh / run.bat
  zip.file('run.sh', `#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo "→ Установка зависимостей…"
if [ -d "node_modules" ]; then echo "  (node_modules найдены, пропускаю)"; else npm install; fi
echo "→ Запуск Codex Reader на http://localhost:${port} (порт зарезервирован)"
case "$(uname -s)" in
  Darwin*) (sleep 2 && open "http://localhost:${port}") & ;;
  Linux*)  (sleep 2 && (xdg-open "http://localhost:${port}" 2>/dev/null || true)) & ;;
esac
npm run dev
`, { unixPermissions: 0o755 })

  zip.file('run.bat', `@echo off
cd /d "%~dp0"
echo Установка зависимостей...
if not exist node_modules (call npm install)
echo Запуск Codex Reader на http://localhost:${port}
start "" "http://localhost:${port}"
call npm run dev
`)

  zip.file('README.md', `# ${book.title}

Экспорт из платформы **Codex** — самостоятельный Vite-проект.

## Запуск

\`\`\`bash
./run.sh        # macOS / Linux
\`\`\`

или на Windows:

\`\`\`
run.bat
\`\`\`

Reader откроется в браузере на порту **${port}**.

## Что внутри

* \`src/book.ts\` — данные книги (можно править вручную)
* \`src/render.ts\` — все 20 анимаций (математика + физика)
* \`src/AnimationCanvas.tsx\` — обёртка React над canvas-рендерером

## Скрипты

* \`npm run dev\` — режим разработки (порт ${port})
* \`npm run build\` — продакшен-сборка
* \`npm run preview\` — предпросмотр сборки

---

Сгенерировано Codex.
`)

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  download(blob, `${safeName(book.title)}.codex-vite.zip`)
}

function readerStandaloneSource(): string {
  // Это упрощённая версия Reader — встраивает книгу из book.ts, без store.
  // Использует перелистывание, обложку, оглавление, анимации.
  return `import { useEffect, useMemo, useState } from 'react'
import { BOOK } from './book'
import { AnimationCanvas } from './AnimationCanvas'
import type { Block } from './types'

interface Page {
  kind: 'cover' | 'toc' | 'note'
  chapterId?: string
  chapterTitle?: string
  noteId?: string
  noteTitle?: string
  blocks?: Block[]
  noteIndex?: number
  globalIndex?: number
}

function pluralize(n: number, forms: [string, string, string]) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1]
  return forms[2]
}
function romanize(n: number) {
  const map: [number, string][] = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]
  let out='',x=n; for (const [v,s] of map) while(x>=v){out+=s;x-=v}; return out
}

export function App() {
  const pages = useMemo<Page[]>(() => {
    const out: Page[] = [{ kind: 'cover' }, { kind: 'toc' }]
    let g = 1
    for (const ch of BOOK.chapters) {
      ch.notes.forEach((n, i) => {
        out.push({ kind: 'note', chapterId: ch.id, chapterTitle: ch.title, noteId: n.id, noteTitle: n.title, blocks: n.blocks, noteIndex: i + 1, globalIndex: g++ })
      })
    }
    return out
  }, [])

  const [idx, setIdx] = useState(0)
  const [flipping, setFlipping] = useState<'next'|'prev'|null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key==='ArrowRight'||e.key==='PageDown'||e.key===' '){e.preventDefault();flip('next')}
      else if (e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();flip('prev')}
      else if (e.key==='Home') setIdx(0)
      else if (e.key==='End') setIdx(pages.length-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  function flip(d: 'next'|'prev') {
    if (flipping) return
    if (d==='next' && idx>=pages.length-1) return
    if (d==='prev' && idx<=0) return
    setFlipping(d)
    setTimeout(() => { setIdx(p => p + (d==='next' ? 1 : -1)); setFlipping(null) }, 280)
  }

  const page = pages[idx]
  const totalNotes = pages.length - 2

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#2a221a,#1c160f)',padding:'40px 20px',position:'relative'}}>
      {page?.kind==='note' && page.chapterTitle && (
        <div style={{position:'fixed',top:16,right:20,color:'rgba(245,239,225,0.65)',fontFamily:'var(--font-serif)',fontSize:13,fontStyle:'italic',maxWidth:320,textAlign:'right'}}>{page.chapterTitle}</div>
      )}
      <div style={{maxWidth:760,margin:'0 auto',position:'relative',perspective:1800}}>
        <div style={{
          background:'var(--paper)',
          backgroundImage:'radial-gradient(ellipse at 30% 20%,rgba(255,255,255,0.4),transparent 60%)',
          minHeight:'calc(100vh - 130px)',
          boxShadow:'0 30px 60px rgba(0,0,0,0.5),0 8px 16px rgba(0,0,0,0.3)',
          padding:'70px 80px 60px',
          transformOrigin:flipping==='next'?'left center':'right center',
          transform: flipping ? 'rotateY(' + (flipping==='next'?-8:8) + 'deg)' : 'rotateY(0deg)',
          transition:'transform 0.28s ease-in-out',opacity:flipping?0.85:1,
        }}>
          {page?.kind!=='cover' && <div style={{textAlign:'center',color:'var(--gold)',marginBottom:24,fontFamily:'var(--font-serif)',fontSize:14}}>✦ &nbsp; ❦ &nbsp; ✦</div>}
          {page?.kind==='cover' && (
            <div style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{color:'var(--gold)',fontSize:32,fontFamily:'var(--font-serif)',letterSpacing:'0.4em',marginBottom:40}}>❦ ❦ ❦</div>
              <h1 style={{fontFamily:'var(--font-serif)',fontSize:42,color:'var(--ink)',fontWeight:500,margin:0,lineHeight:1.2}}>{BOOK.title}</h1>
              {BOOK.author && <div style={{marginTop:24,fontFamily:'var(--font-serif-body)',fontSize:18,fontStyle:'italic',color:'var(--ink-soft)'}}>{BOOK.author}</div>}
              {BOOK.description && <div style={{marginTop:36,maxWidth:480,marginLeft:'auto',marginRight:'auto',fontFamily:'var(--font-serif-body)',fontSize:15,color:'var(--ink-soft)',lineHeight:1.7}}>{BOOK.description}</div>}
              <div style={{marginTop:60,color:'var(--gold)',fontSize:22,fontFamily:'var(--font-serif)',letterSpacing:'0.5em'}}>✦</div>
              <div style={{marginTop:20,fontFamily:'var(--font-mono)',fontSize:11,color:'var(--ink-soft)',letterSpacing:'0.1em'}}>
                {BOOK.chapters.length} {pluralize(BOOK.chapters.length,['ГЛАВА','ГЛАВЫ','ГЛАВ'])} · {totalNotes} {pluralize(totalNotes,['СТРАНИЦА','СТРАНИЦЫ','СТРАНИЦ'])}
              </div>
            </div>
          )}
          {page?.kind==='toc' && (
            <div>
              <h1 style={{fontFamily:'var(--font-serif)',fontSize:30,textAlign:'center',color:'var(--ink)',fontWeight:500,margin:'0 0 36px'}}>Оглавление</h1>
              {BOOK.chapters.map((ch, ci) => (
                <div key={ch.id} style={{marginBottom:24}}>
                  <div style={{display:'flex',alignItems:'baseline',gap:10,fontFamily:'var(--font-serif)',fontSize:18,color:'var(--ink)',borderBottom:'1px solid var(--rule)',paddingBottom:4,marginBottom:8}}>
                    <span style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--gold)'}}>{romanize(ci+1)}</span>
                    <span style={{fontStyle:'italic'}}>{ch.title}</span>
                  </div>
                  {ch.notes.map((n, ni) => {
                    const target = pages.findIndex(p => p.kind==='note' && p.noteId===n.id)
                    const g = (pages[target] as Page).globalIndex
                    return (
                      <div key={n.id} onClick={() => setIdx(target)} style={{display:'flex',alignItems:'baseline',gap:6,padding:'3px 0 3px 24px',fontSize:14,color:'var(--ink)',cursor:'pointer'}}>
                        <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--ink-soft)'}}>§{ni+1}.</span>
                        <span style={{flex:1}}>{n.title}</span>
                        <span style={{flex:1,borderBottom:'1px dotted var(--rule)',margin:'0 6px',transform:'translateY(-3px)'}} />
                        <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--ink-soft)'}}>{g}</span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
          {page?.kind==='note' && <NoteView page={page} />}
          <div style={{position:'absolute',bottom:28,left:0,right:0,textAlign:'center',fontFamily:'var(--font-serif)',fontSize:12,color:'var(--ink-soft)',fontStyle:'italic'}}>
            {page?.kind==='cover'?'':page?.kind==='toc'?'— Оглавление —':'— ' + (page?.globalIndex ?? '') + ' —'}
          </div>
        </div>
        <button onClick={() => flip('prev')} disabled={idx===0} style={{position:'absolute',top:'50%',transform:'translateY(-50%)',left:-64,width:48,height:48,borderRadius:'50%',background:'rgba(245,239,225,0.1)',color:'rgba(245,239,225,0.7)',border:'1px solid rgba(245,239,225,0.2)',cursor:'pointer',fontSize:28,fontFamily:'var(--font-serif)'}}>‹</button>
        <button onClick={() => flip('next')} disabled={idx>=pages.length-1} style={{position:'absolute',top:'50%',transform:'translateY(-50%)',right:-64,width:48,height:48,borderRadius:'50%',background:'rgba(245,239,225,0.1)',color:'rgba(245,239,225,0.7)',border:'1px solid rgba(245,239,225,0.2)',cursor:'pointer',fontSize:28,fontFamily:'var(--font-serif)'}}>›</button>
      </div>
      <div style={{position:'fixed',bottom:16,left:'50%',transform:'translateX(-50%)',color:'rgba(245,239,225,0.5)',fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.08em'}}>{idx+1} / {pages.length}</div>
    </div>
  )
}

function NoteView({ page }: { page: Page }) {
  return (
    <article style={{fontFamily:'var(--font-serif-body)'}}>
      <header style={{marginBottom:28}}>
        <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--ink-soft)',letterSpacing:'0.12em',marginBottom:4}}>§ {page.noteIndex} · {(page.chapterTitle||'').toUpperCase()}</div>
        <h1 style={{fontFamily:'var(--font-serif)',fontSize:28,fontWeight:500,color:'var(--ink)',margin:0,lineHeight:1.25}}>{page.noteTitle}</h1>
      </header>
      {(page.blocks ?? []).map((b, i) => <RenderBlock key={b.id} block={b} idx={i} />)}
    </article>
  )
}

function inlineMd(s: string) {
  // primitive
  const parts: any[] = []
  let last = 0; const re = /(\\*\\*[^*]+\\*\\*|\\*[^*]+\\*|\\\`[^\`]+\\\`)/g
  let m: RegExpExecArray | null, k = 0
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(s.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('**')) parts.push(<strong key={k++}>{t.slice(2,-2)}</strong>)
    else if (t.startsWith('\`')) parts.push(<code key={k++} style={{fontFamily:'var(--font-mono)',fontSize:'0.9em',background:'rgba(160,122,60,0.12)',padding:'1px 4px',borderRadius:2}}>{t.slice(1,-1)}</code>)
    else parts.push(<em key={k++}>{t.slice(1,-1)}</em>)
    last = m.index + t.length
  }
  if (last < s.length) parts.push(s.slice(last))
  return parts
}

function Divider({ style }: { style: 'plain'|'fancy'|'flourish' }) {
  if (style==='plain') return <hr style={{border:'none',borderTop:'1px solid var(--rule)',margin:'20px 0'}} />
  if (style==='flourish') return <div style={{textAlign:'center',margin:'24px 0',color:'var(--gold)',fontFamily:'var(--font-serif)',fontSize:24,letterSpacing:'0.6em'}}>❦ ❦ ❦</div>
  return <div style={{display:'flex',alignItems:'center',gap:14,margin:'24px 0',color:'var(--gold)'}}><div style={{flex:1,height:1,background:'var(--rule)'}}/><span style={{fontFamily:'var(--font-serif)',fontSize:18}}>✦</span><div style={{flex:1,height:1,background:'var(--rule)'}}/></div>
}

function ExBlock({ block }: { block: any }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{margin:'20px 0',padding:18,border:'1px solid var(--rule)',borderRadius:3,background:'rgba(160,122,60,0.04)'}}>
      <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--accent)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:6}}>Задача{block.number?\` № \${block.number}\`:''}</div>
      <div style={{fontFamily:'var(--font-serif-body)',fontSize:15,color:'var(--ink)',lineHeight:1.7}}>{block.question}</div>
      <button onClick={() => setOpen(o=>!o)} style={{marginTop:8,background:'transparent',border:'none',color:'var(--accent)',cursor:'pointer',fontFamily:'var(--font-ui)',fontSize:12,padding:0,fontStyle:'italic'}}>{open?'▾ скрыть решение':'▸ показать решение'}</button>
      {open && (
        <div style={{marginTop:10,paddingTop:10,borderTop:'1px dashed var(--rule)'}}>
          {block.answer && <div style={{marginBottom:8,fontFamily:'var(--font-mono)',fontSize:13}}><strong>Ответ:</strong> {block.answer}</div>}
          {block.explanation && <div style={{fontFamily:'var(--font-serif-body)',fontSize:14,lineHeight:1.7}}>{block.explanation}</div>}
        </div>
      )}
    </div>
  )
}

function RenderBlock({ block, idx }: { block: Block, idx: number }) {
  switch (block.type) {
    case 'header': {
      const sz = block.level===1?26:block.level===2?21:18
      const Tag = (block.level===1?'h2':block.level===2?'h3':'h4') as any
      return <Tag style={{fontFamily:'var(--font-serif)',fontWeight:500,color:'var(--ink)',fontSize:sz,marginTop:32,marginBottom:12,lineHeight:1.3}}>{block.content}</Tag>
    }
    case 'theory': {
      const c0 = block.content.charAt(0)
      const drop = idx===0 && /[a-zA-Zа-яА-Я]/.test(c0)
      return (
        <p style={{fontFamily:'var(--font-serif-body)',fontSize:16,color:'var(--ink)',lineHeight:1.75,textAlign:'justify',margin:'14px 0',background:block.highlight?'rgba(160,122,60,0.08)':'transparent',padding:block.highlight?'12px 16px':'0',borderLeft:block.highlight?'2px solid var(--gold)':'none'}}>
          {drop ? <><span style={{float:'left',fontFamily:'var(--font-serif)',fontSize:56,lineHeight:0.85,color:'var(--accent)',marginRight:6,marginTop:4,fontWeight:600}}>{c0}</span>{inlineMd(block.content.slice(1))}</> : inlineMd(block.content)}
        </p>
      )
    }
    case 'python':
      return (
        <figure style={{margin:'20px 0'}}>
          {block.title && <figcaption style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--ink-soft)',letterSpacing:'0.06em',marginBottom:4,textTransform:'uppercase'}}>листинг — {block.title}</figcaption>}
          <pre style={{background:'#211a12',color:'#f3eddc',padding:18,fontFamily:'var(--font-mono)',fontSize:13,lineHeight:1.55,borderRadius:3,overflow:'auto',margin:0}}>{block.content}</pre>
          {block.description && <figcaption style={{fontFamily:'var(--font-serif-body)',fontStyle:'italic',color:'var(--ink-soft)',fontSize:13,marginTop:6,textAlign:'center'}}>{block.description}</figcaption>}
        </figure>
      )
    case 'image':
      if (!block.src) return null
      return (
        <figure style={{margin:'24px 0',textAlign:'center'}}>
          <img src={block.src} alt={block.alt} style={{maxWidth:'100%',maxHeight:420,objectFit:block.fit??'contain',borderRadius:block.borderRadius??4,filter:\`brightness(\${block.brightness??100}%) contrast(\${block.contrast??100}%)\`,boxShadow:'0 4px 12px rgba(33,26,18,0.15)'}}/>
          {block.caption && <figcaption style={{fontFamily:'var(--font-serif-body)',fontStyle:'italic',color:'var(--ink-soft)',fontSize:13,marginTop:8}}><span style={{fontFamily:'var(--font-serif)',fontWeight:500}}>Илл. </span>{block.caption}</figcaption>}
        </figure>
      )
    case 'animation':
      return (
        <figure style={{margin:'24px 0'}}>
          <div style={{border:'1px solid var(--rule)',borderRadius:3,padding:12,background:'rgba(245,239,225,0.5)'}}>
            <AnimationCanvas type={block.animType} params={block.params} height={280} />
          </div>
          {block.caption && <figcaption style={{textAlign:'center',fontFamily:'var(--font-serif-body)',fontStyle:'italic',color:'var(--ink-soft)',fontSize:13,marginTop:8}}><span style={{fontFamily:'var(--font-serif)',fontWeight:500}}>Рис. </span>{block.caption}</figcaption>}
        </figure>
      )
    case 'exercise': return <ExBlock block={block} />
    case 'quote':
      return (
        <blockquote style={{margin:'22px 0',padding:'4px 24px',borderLeft:'3px solid var(--gold)',fontFamily:'var(--font-serif-body)',fontStyle:'italic',fontSize:16,color:'var(--ink)',lineHeight:1.7,background:'rgba(160,122,60,0.04)'}}>
          <p style={{margin:0}}>{block.content}</p>
          {block.author && <footer style={{textAlign:'right',marginTop:6,fontSize:13,color:'var(--ink-soft)'}}>— {block.author}</footer>}
        </blockquote>
      )
    case 'divider': return <Divider style={block.style ?? 'fancy'} />
  }
}
`
}

// ═══════════════════════ ЭКСПОРТ ГЛАВЫ И КОНСПЕКТА ═══════════════════════
type SubFmt = 'json' | 'md' | 'html'

export function exportChapter(book: Book, chapterId: string, fmt: SubFmt) {
  const ch = book.chapters.find(c => c.id === chapterId)
  if (!ch) return
  const sub: Book = { ...book, chapters: [ch] }
  if (fmt === 'json') {
    download(new Blob([JSON.stringify(sub, null, 2)], { type: 'application/json' }),
      `${safeName(book.title)}-${safeName(ch.title)}.codex.json`)
  } else if (fmt === 'md') {
    download(new Blob([bookToMarkdown(sub)], { type: 'text/markdown;charset=utf-8' }),
      `${safeName(ch.title)}.md`)
  } else {
    download(new Blob([buildSingleHTML(sub)], { type: 'text/html;charset=utf-8' }),
      `${safeName(ch.title)}.html`)
  }
}

export function exportNote(book: Book, chapterId: string, noteId: string, fmt: SubFmt) {
  const ch = book.chapters.find(c => c.id === chapterId)
  const n = ch?.notes.find(nn => nn.id === noteId)
  if (!ch || !n) return
  const sub: Book = { ...book, chapters: [{ ...ch, notes: [n] }] }
  if (fmt === 'json') {
    download(new Blob([JSON.stringify(sub, null, 2)], { type: 'application/json' }),
      `${safeName(n.title)}.codex.json`)
  } else if (fmt === 'md') {
    download(new Blob([bookToMarkdown(sub)], { type: 'text/markdown;charset=utf-8' }),
      `${safeName(n.title)}.md`)
  } else {
    download(new Blob([buildSingleHTML(sub)], { type: 'text/html;charset=utf-8' }),
      `${safeName(n.title)}.html`)
  }
}
