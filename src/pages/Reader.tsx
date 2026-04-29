import { useEffect, useMemo, useState } from 'react'
import type { Route } from '../App'
import { useLibrary, getBook } from '../store/library'
import type { Block } from '../types'
import { AnimationCanvas } from '../anim/AnimationCanvas'
import { DividerPreview } from './Constructor'

interface Props {
  bookId: string
  navigate: (r: Route) => void
}

interface Page {
  kind: 'cover' | 'toc' | 'note'
  chapterId?: string
  chapterTitle?: string
  noteId?: string
  noteTitle?: string
  blocks?: Block[]
  noteIndex?: number       // порядковый номер конспекта в главе
  globalIndex?: number     // сквозной номер от 1
}

export function Reader({ bookId, navigate }: Props) {
  const lib = useLibrary()
  const book = useMemo(() => lib.books.find(b => b.id === bookId) ?? getBook(bookId), [lib, bookId])

  const pages = useMemo<Page[]>(() => {
    if (!book) return []
    const out: Page[] = [
      { kind: 'cover' },
      { kind: 'toc' },
    ]
    let global = 1
    for (const ch of book.chapters) {
      ch.notes.forEach((n, i) => {
        out.push({
          kind: 'note',
          chapterId: ch.id,
          chapterTitle: ch.title,
          noteId: n.id,
          noteTitle: n.title,
          blocks: n.blocks,
          noteIndex: i + 1,
          globalIndex: global++,
        })
      })
    }
    return out
  }, [book])

  const [pageIdx, setPageIdx] = useState(0)
  const [flipping, setFlipping] = useState<'next' | 'prev' | null>(null)

  // Клавиши
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault(); flip('next')
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault(); flip('prev')
      } else if (e.key === 'Escape') {
        navigate({ name: 'constructor', bookId })
      } else if (e.key === 'Home') {
        setPageIdx(0)
      } else if (e.key === 'End') {
        setPageIdx(pages.length - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const flip = (dir: 'next' | 'prev') => {
    if (flipping) return
    if (dir === 'next' && pageIdx >= pages.length - 1) return
    if (dir === 'prev' && pageIdx <= 0) return
    setFlipping(dir)
    setTimeout(() => {
      setPageIdx(p => p + (dir === 'next' ? 1 : -1))
      setFlipping(null)
    }, 280)
  }

  if (!book) {
    return (
      <div style={{ padding: 60, textAlign: 'center', background: 'var(--paper)', minHeight: '100vh' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22 }}>Книга не найдена</p>
        <button onClick={() => navigate({ name: 'library' })} style={btnGhost}>← К библиотеке</button>
      </div>
    )
  }

  const page = pages[pageIdx]

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #2a221a 0%, #1c160f 100%)',
      padding: '40px 20px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Угловые декорации */}
      <div style={{ position: 'fixed', top: 16, left: 20, color: 'rgba(245,239,225,0.5)', fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '0.1em' }}>
        <button onClick={() => navigate({ name: 'constructor', bookId })}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', font: 'inherit' }}>
          ← Конструктор
        </button>
      </div>
      {page?.kind === 'note' && page.chapterTitle && (
        <div style={{
          position: 'fixed', top: 16, right: 20, color: 'rgba(245,239,225,0.65)',
          fontFamily: 'var(--font-serif)', fontSize: 13, fontStyle: 'italic',
          maxWidth: 320, textAlign: 'right',
        }}>
          {page.chapterTitle}
        </div>
      )}

      {/* Книга */}
      <div style={{
        maxWidth: 760, margin: '0 auto', position: 'relative',
        perspective: 1800,
      }}>
        <div style={{
          background: 'var(--paper)',
          backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.4), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(160,122,60,0.06), transparent 60%)',
          minHeight: 'calc(100vh - 130px)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.5), 0 8px 16px rgba(0,0,0,0.3), inset 0 0 80px rgba(160,122,60,0.04)',
          padding: '70px 80px 60px',
          position: 'relative',
          transformOrigin: flipping === 'next' ? 'left center' : 'right center',
          transform: flipping ? `rotateY(${flipping === 'next' ? -8 : 8}deg)` : 'rotateY(0deg)',
          transition: 'transform 0.28s ease-in-out',
          opacity: flipping ? 0.85 : 1,
        }}>
          {/* Верхний орнамент */}
          {page?.kind !== 'cover' && (
            <div style={{ textAlign: 'center', color: 'var(--gold)', marginBottom: 24, fontFamily: 'var(--font-serif)', fontSize: 14 }}>
              ✦ &nbsp; ❦ &nbsp; ✦
            </div>
          )}

          {page?.kind === 'cover' && <CoverPage book={book} totalPages={pages.length - 2} />}
          {page?.kind === 'toc' && <TocPage book={book} pages={pages} onJump={(idx) => setPageIdx(idx)} />}
          {page?.kind === 'note' && <NotePage page={page} />}

          {/* Номер страницы */}
          <div style={{
            position: 'absolute', bottom: 28, left: 0, right: 0, textAlign: 'center',
            fontFamily: 'var(--font-serif)', fontSize: 12, color: 'var(--ink-soft)',
            fontStyle: 'italic',
          }}>
            {page?.kind === 'cover' ? '' :
             page?.kind === 'toc'   ? '— Оглавление —' :
             page?.kind === 'note'  ? `— ${page.globalIndex} —` : ''}
          </div>
        </div>

        {/* Контролы листания — слева/справа */}
        <button onClick={() => flip('prev')} disabled={pageIdx === 0}
                style={{ ...flipBtn, left: -64 }} title="Предыдущая (←)">‹</button>
        <button onClick={() => flip('next')} disabled={pageIdx >= pages.length - 1}
                style={{ ...flipBtn, right: -64 }} title="Следующая (→)">›</button>
      </div>

      {/* Прогресс внизу */}
      <div style={{
        position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(245,239,225,0.5)', fontFamily: 'var(--font-mono)', fontSize: 11,
        letterSpacing: '0.08em',
      }}>
        {pageIdx + 1} / {pages.length}
      </div>
    </div>
  )
}

// ═══════════════════════ ОБЛОЖКА ═══════════════════════
function CoverPage({ book, totalPages }: { book: { title: string; author: string; description: string; chapters: any[] }; totalPages: number }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '70vh', textAlign: 'center', padding: '40px 20px',
    }}>
      <div style={{ color: 'var(--gold)', fontSize: 32, fontFamily: 'var(--font-serif)', letterSpacing: '0.4em', marginBottom: 40 }}>
        ❦ ❦ ❦
      </div>
      <h1 style={{
        fontFamily: 'var(--font-serif)', fontSize: 42, color: 'var(--ink)',
        fontWeight: 500, lineHeight: 1.2, margin: 0, letterSpacing: '0.01em',
      }}>
        {book.title}
      </h1>
      {book.author && (
        <div style={{
          marginTop: 24, fontFamily: 'var(--font-serif-body)', fontSize: 18,
          fontStyle: 'italic', color: 'var(--ink-soft)',
        }}>
          {book.author}
        </div>
      )}
      {book.description && (
        <div style={{
          marginTop: 36, maxWidth: 480, fontFamily: 'var(--font-serif-body)',
          fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7,
        }}>
          {book.description}
        </div>
      )}
      <div style={{
        marginTop: 60, color: 'var(--gold)', fontSize: 22,
        fontFamily: 'var(--font-serif)', letterSpacing: '0.5em',
      }}>
        ✦
      </div>
      <div style={{ marginTop: 20, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)', letterSpacing: '0.1em' }}>
        {book.chapters.length} {pluralize(book.chapters.length, ['ГЛАВА', 'ГЛАВЫ', 'ГЛАВ'])} · {totalPages} {pluralize(totalPages, ['СТРАНИЦА', 'СТРАНИЦЫ', 'СТРАНИЦ'])}
      </div>
    </div>
  )
}

function pluralize(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

// ═══════════════════════ TOC ═══════════════════════
function TocPage({ book, pages, onJump }: {
  book: { chapters: { id: string; title: string; notes: { id: string; title: string }[] }[] }
  pages: Page[]
  onJump: (idx: number) => void
}) {
  return (
    <div>
      <h1 style={{
        fontFamily: 'var(--font-serif)', fontSize: 30, textAlign: 'center',
        color: 'var(--ink)', fontWeight: 500, margin: '0 0 36px',
      }}>
        Оглавление
      </h1>
      <div style={{ fontFamily: 'var(--font-serif-body)' }}>
        {book.chapters.map((ch, ci) => (
          <div key={ch.id} style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 10,
              fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)',
              borderBottom: '1px solid var(--rule)', paddingBottom: 4, marginBottom: 8,
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gold)' }}>
                {romanize(ci + 1)}
              </span>
              <span style={{ fontStyle: 'italic' }}>{ch.title}</span>
            </div>
            {ch.notes.map((n, ni) => {
              const idx = pages.findIndex(p => p.kind === 'note' && p.noteId === n.id)
              if (idx < 0) return null
              const globalIdx = (pages[idx] as Page).globalIndex
              return (
                <div key={n.id}
                     onClick={() => onJump(idx)}
                     style={{
                       display: 'flex', alignItems: 'baseline', gap: 6, padding: '3px 0 3px 24px',
                       fontSize: 14, color: 'var(--ink)', cursor: 'pointer',
                     }}
                     onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                     onMouseLeave={e => e.currentTarget.style.color = 'var(--ink)'}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)' }}>§{ni + 1}.</span>
                  <span style={{ flex: 1 }}>{n.title}</span>
                  <span style={{
                    flex: 1, borderBottom: '1px dotted var(--rule)', margin: '0 6px',
                    transform: 'translateY(-3px)',
                  }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)' }}>{globalIdx}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function romanize(n: number): string {
  const map: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let out = '', x = n
  for (const [v, s] of map) {
    while (x >= v) { out += s; x -= v }
  }
  return out
}

// ═══════════════════════ NOTE ═══════════════════════
function NotePage({ page }: { page: Page }) {
  return (
    <article style={{ fontFamily: 'var(--font-serif-body)' }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)', letterSpacing: '0.12em', marginBottom: 4 }}>
          § {page.noteIndex} · {page.chapterTitle?.toUpperCase()}
        </div>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500,
          color: 'var(--ink)', margin: 0, lineHeight: 1.25,
        }}>
          {page.noteTitle}
        </h1>
      </header>
      {(page.blocks ?? []).map((b, i) => (
        <BlockReader key={b.id} block={b} index={i} />
      ))}
      {(page.blocks ?? []).length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-soft)', fontStyle: 'italic' }}>
          (страница пуста)
        </div>
      )}
    </article>
  )
}

function BlockReader({ block, index }: { block: Block; index: number }) {
  switch (block.type) {
    case 'header': {
      const Tag = (block.level === 1 ? 'h2' : block.level === 2 ? 'h3' : 'h4') as 'h2' | 'h3' | 'h4'
      return (
        <Tag style={{
          fontFamily: 'var(--font-serif)', fontWeight: 500, color: 'var(--ink)',
          fontSize: block.level === 1 ? 26 : block.level === 2 ? 21 : 18,
          marginTop: 32, marginBottom: 12, lineHeight: 1.3,
        }}>{block.content}</Tag>
      )
    }
    case 'theory': {
      // Drop cap для первого theory-блока
      const firstChar = block.content.charAt(0)
      const rest = block.content.slice(1)
      const showDropCap = index === 0 && /[a-zA-Zа-яА-Я]/.test(firstChar)
      return (
        <p style={{
          fontFamily: 'var(--font-serif-body)', fontSize: 16, color: 'var(--ink)',
          lineHeight: 1.75, textAlign: 'justify', hyphens: 'auto',
          background: block.highlight ? 'rgba(160,122,60,0.08)' : 'transparent',
          padding: block.highlight ? '12px 16px' : '0',
          borderLeft: block.highlight ? '2px solid var(--gold)' : 'none',
          margin: '14px 0',
        }}>
          {showDropCap ? (
            <>
              <span style={{
                float: 'left', fontFamily: 'var(--font-serif)', fontSize: 56,
                lineHeight: 0.85, color: 'var(--accent)', marginRight: 6, marginTop: 4,
                fontWeight: 600,
              }}>{firstChar}</span>
              {renderInlineMarkdown(rest)}
            </>
          ) : renderInlineMarkdown(block.content)}
        </p>
      )
    }
    case 'python':
      return (
        <figure style={{ margin: '20px 0' }}>
          {block.title && (
            <figcaption style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)',
              letterSpacing: '0.06em', marginBottom: 4, textTransform: 'uppercase',
            }}>
              листинг — {block.title}
            </figcaption>
          )}
          <pre style={{
            background: '#211a12', color: '#f3eddc', padding: 18,
            fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.55,
            borderRadius: 3, overflow: 'auto', margin: 0,
            border: '1px solid #1a140d',
          }}>{block.content}</pre>
          {block.description && (
            <figcaption style={{
              fontFamily: 'var(--font-serif-body)', fontStyle: 'italic',
              color: 'var(--ink-soft)', fontSize: 13, marginTop: 6, textAlign: 'center',
            }}>{block.description}</figcaption>
          )}
        </figure>
      )
    case 'image':
      if (!block.src) return null
      return (
        <figure style={{ margin: '24px 0', textAlign: 'center' }}>
          <img src={block.src} alt={block.alt}
               style={{
                 maxWidth: '100%', maxHeight: 420,
                 objectFit: block.fit ?? 'contain',
                 borderRadius: block.borderRadius ?? 4,
                 filter: `brightness(${block.brightness ?? 100}%) contrast(${block.contrast ?? 100}%)`,
                 boxShadow: '0 4px 12px rgba(33,26,18,0.15)',
               }} />
          {block.caption && (
            <figcaption style={{
              fontFamily: 'var(--font-serif-body)', fontStyle: 'italic',
              color: 'var(--ink-soft)', fontSize: 13, marginTop: 8,
            }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}>Илл. </span>
              {block.caption}
            </figcaption>
          )}
        </figure>
      )
    case 'animation':
      return (
        <figure style={{ margin: '24px 0' }}>
          <div style={{
            border: '1px solid var(--rule)', borderRadius: 3,
            padding: 12, background: 'rgba(245,239,225,0.5)',
          }}>
            <AnimationCanvas type={block.animType} params={block.params} height={280} />
          </div>
          {block.caption && (
            <figcaption style={{
              fontFamily: 'var(--font-serif-body)', fontStyle: 'italic',
              color: 'var(--ink-soft)', fontSize: 13, marginTop: 8, textAlign: 'center',
            }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}>Рис. </span>
              {block.caption}
            </figcaption>
          )}
        </figure>
      )
    case 'exercise':
      return <ExerciseReader block={block} />
    case 'quote':
      return (
        <blockquote style={{
          margin: '22px 0', padding: '4px 24px',
          borderLeft: '3px solid var(--gold)',
          fontFamily: 'var(--font-serif-body)', fontStyle: 'italic',
          fontSize: 16, color: 'var(--ink)', lineHeight: 1.7,
          background: 'rgba(160,122,60,0.04)',
        }}>
          <p style={{ margin: 0 }}>{block.content}</p>
          {block.author && (
            <footer style={{ textAlign: 'right', marginTop: 6, fontSize: 13, color: 'var(--ink-soft)' }}>
              — {block.author}
            </footer>
          )}
        </blockquote>
      )
    case 'divider':
      return <DividerPreview style={block.style ?? 'fancy'} />
  }
}

function ExerciseReader({ block }: { block: import('../types').ExerciseBlock }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      margin: '20px 0', padding: 18, border: '1px solid var(--rule)',
      borderRadius: 3, background: 'rgba(160,122,60,0.04)',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)',
        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
      }}>
        Задача {block.number ? `№ ${block.number}` : ''}
      </div>
      <div style={{ fontFamily: 'var(--font-serif-body)', fontSize: 15, color: 'var(--ink)', lineHeight: 1.7 }}>
        {block.question}
      </div>
      <button onClick={() => setOpen(o => !o)} style={{
        marginTop: 8, background: 'transparent', border: 'none',
        color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12,
        padding: 0, fontStyle: 'italic',
      }}>
        {open ? '▾ скрыть решение' : '▸ показать решение'}
      </button>
      {open && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--rule)' }}>
          {block.answer && (
            <div style={{ marginBottom: 8, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>
              <strong>Ответ:</strong> {block.answer}
            </div>
          )}
          {block.explanation && (
            <div style={{ fontFamily: 'var(--font-serif-body)', fontSize: 14, color: 'var(--ink)', lineHeight: 1.7 }}>
              {block.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Простая поддержка **bold** и *italic*
function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  let last = 0, m: RegExpExecArray | null, key = 0
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('**')) parts.push(<strong key={key++}>{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('`')) parts.push(<code key={key++} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9em', background: 'rgba(160,122,60,0.12)', padding: '1px 4px', borderRadius: 2 }}>{tok.slice(1, -1)}</code>)
    else parts.push(<em key={key++}>{tok.slice(1, -1)}</em>)
    last = m.index + tok.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

// ═══════════════════════ STYLES ═══════════════════════
const flipBtn: React.CSSProperties = {
  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
  width: 48, height: 48, borderRadius: '50%',
  background: 'rgba(245,239,225,0.1)',
  color: 'rgba(245,239,225,0.7)',
  border: '1px solid rgba(245,239,225,0.2)',
  cursor: 'pointer', fontSize: 28, fontFamily: 'var(--font-serif)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  lineHeight: 1, paddingBottom: 4,
}
const btnGhost: React.CSSProperties = {
  marginTop: 16, padding: '8px 16px', background: 'transparent', color: 'var(--ink)',
  border: '1px solid var(--rule)', borderRadius: 2, cursor: 'pointer',
  fontFamily: 'var(--font-ui)', fontSize: 13,
}
