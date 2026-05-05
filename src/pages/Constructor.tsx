import { useEffect, useMemo, useRef, useState } from 'react'
import type { Route } from '../App'
import {
  useLibrary, getBook,
  updateBook, addChapter, updateChapter, deleteChapter, moveChapter,
  addNote, updateNote, deleteNote, moveNote, updateNoteBlocks,
} from '../store/library'
import type {
  Block, BlockType, AnimType, AnimationBlock, HeaderBlock, TheoryBlock,
  PythonBlock, ImageBlock, ExerciseBlock, QuoteBlock, DividerBlock,
} from '../types'
import { BLOCK_REGISTRY, ANIM_REGISTRY, ANIMS_BY_CATEGORY, defaultAnimParams } from '../types'
import { AnimationCanvas } from '../anim/AnimationCanvas'
import { exportBookJSON, exportBookVite, exportBookSingleHTML, exportBookMarkdown, exportChapter, exportNote } from '../utils/exporters'

interface Props {
  bookId: string
  navigate: (r: Route) => void
}

function uid() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
}

function newBlock(type: BlockType): Block {
  const id = uid()
  switch (type) {
    case 'header': return { id, type, content: 'Новый заголовок', level: 2 } as HeaderBlock
    case 'theory': return { id, type, content: 'Текст параграфа…', highlight: false } as TheoryBlock
    case 'python': return { id, type, content: '# Пример кода\nprint("hello")', title: 'Листинг', description: '' } as PythonBlock
    case 'image': return { id, type, src: '', caption: '', alt: '', fit: 'contain', borderRadius: 4, brightness: 100, contrast: 100 } as ImageBlock
    case 'animation': return { id, type, animType: 'function-derivative', params: defaultAnimParams('function-derivative'), caption: '' } as AnimationBlock
    case 'exercise': return { id, type, question: 'Условие задачи…', answer: '', explanation: '', number: '' } as ExerciseBlock
    case 'quote': return { id, type, content: 'Цитата…', author: '' } as QuoteBlock
    case 'divider': return { id, type, style: 'fancy' } as DividerBlock
  }
}

export function Constructor({ bookId, navigate }: Props) {
  const lib = useLibrary()
  const book = useMemo(() => lib.books.find(b => b.id === bookId) ?? getBook(bookId), [lib, bookId])

  // Текущий выбранный конспект
  const [selected, setSelected] = useState<{ chapterId: string; noteId: string } | null>(null)

  // При первом монтировании выбираем первый конспект
  useEffect(() => {
    if (!book) return
    if (selected) {
      // Проверяем, что выбор всё ещё валиден
      const ch = book.chapters.find(c => c.id === selected.chapterId)
      if (ch && ch.notes.find(n => n.id === selected.noteId)) return
    }
    const ch = book.chapters[0]
    const n = ch?.notes[0]
    if (ch && n) setSelected({ chapterId: ch.id, noteId: n.id })
    else setSelected(null)
  }, [book, selected])

  if (!book) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22 }}>Книга не найдена</p>
        <button onClick={() => navigate({ name: 'library' })} style={btnPrimary}>← К библиотеке</button>
      </div>
    )
  }

  const chapter = selected ? book.chapters.find(c => c.id === selected.chapterId) : undefined
  const note = chapter && selected ? chapter.notes.find(n => n.id === selected.noteId) : undefined

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--paper)' }}>
      {/* ═══ SIDEBAR ═══ */}
      <Sidebar
        book={book}
        selected={selected}
        onSelect={(chapterId, noteId) => setSelected({ chapterId, noteId })}
        onBack={() => navigate({ name: 'library' })}
        onPreview={() => navigate({ name: 'reader', bookId })}
      />

      {/* ═══ MAIN ═══ */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar book={book} note={note} chapter={chapter}
          onPreview={() => navigate({ name: 'reader', bookId })} />
        {note && chapter ? (
          <BlockEditor key={note.id} bookId={bookId} chapterId={chapter.id} note={note} />
        ) : (
          <EmptyState onAddChapter={() => addChapter(bookId)} />
        )}
      </main>
    </div>
  )
}

// ═══════════════════════ SIDEBAR ═══════════════════════
function Sidebar({
  book, selected, onSelect, onBack, onPreview,
}: {
  book: ReturnType<typeof getBook> & {}
  selected: { chapterId: string; noteId: string } | null
  onSelect: (cId: string, nId: string) => void
  onBack: () => void
  onPreview: () => void
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [exportMenu, setExportMenu] = useState(false)

  return (
    <aside style={{
      width: 280, background: '#ede4d0', borderRight: '1px solid var(--rule)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--ink-soft)', fontSize: 12, fontFamily: 'var(--font-ui)',
          letterSpacing: '0.08em', textTransform: 'uppercase', padding: 0,
        }}>← Библиотека</button>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 19, marginTop: 6, lineHeight: 1.2 }}>
          {book.title}
        </div>
        {book.author && (
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontStyle: 'italic', marginTop: 2 }}>
            {book.author}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        {book.chapters.map((ch, ci) => {
          const isCollapsed = collapsed[ch.id] === true
          return (
            <div key={ch.id}>
              <ChapterRow
                bookId={book.id}
                chapter={ch}
                index={ci}
                total={book.chapters.length}
                collapsed={isCollapsed}
                onToggle={() => setCollapsed(c => ({ ...c, [ch.id]: !isCollapsed }))}
              />
              {!isCollapsed && ch.notes.map((n, ni) => (
                <NoteRow
                  key={n.id}
                  bookId={book.id}
                  chapterId={ch.id}
                  note={n}
                  index={ni}
                  total={ch.notes.length}
                  active={selected?.noteId === n.id}
                  onClick={() => onSelect(ch.id, n.id)}
                />
              ))}
            </div>
          )
        })}
        <div style={{ padding: '8px 16px' }}>
          <button onClick={() => addChapter(book.id)} style={btnSidebar}>
            + Добавить главу
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', borderTop: '1px solid var(--rule)', padding: 12, display: 'flex', gap: 8 }}>
        <button onClick={onPreview} style={{ ...btnSidebar, flex: 1 }}>
          ◐ Открыть в Reader
        </button>
        <button onClick={() => setExportMenu(v => !v)} style={{ ...btnSidebar, flex: 1, background: 'var(--accent)', color: '#faf6ec', borderColor: 'var(--accent)' }}>
          ↓ Экспорт
        </button>
        {exportMenu && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 12, right: 12, marginBottom: 4,
            background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 4,
            boxShadow: '0 -4px 16px rgba(33,26,18,0.15)', zIndex: 20,
          }}>
            <ExportItem label="Vite-проект (zip)" onClick={() => { exportBookVite(book); setExportMenu(false) }} />
            <ExportItem label="Один HTML-файл" onClick={() => { exportBookSingleHTML(book); setExportMenu(false) }} />
            <ExportItem label="Markdown (.md)" onClick={() => { exportBookMarkdown(book); setExportMenu(false) }} />
            <ExportItem label=".kips.json (для импорта)" onClick={() => { exportBookJSON(book); setExportMenu(false) }} />
          </div>
        )}
      </div>
    </aside>
  )
}

function ExportItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'block', width: '100%', textAlign: 'left',
      padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
      fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink)',
      borderBottom: '1px solid var(--rule)',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = '#ede4d0')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      {label}
    </button>
  )
}

function ChapterRow({
  bookId, chapter, index, total, collapsed, onToggle,
}: {
  bookId: string
  chapter: { id: string; title: string }
  index: number
  total: number
  collapsed: boolean
  onToggle: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(chapter.title)
  useEffect(() => setVal(chapter.title), [chapter.title])
  const [hover, setHover] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '8px 10px 8px 14px', display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--ink)',
        borderTop: index === 0 ? 'none' : '1px solid rgba(33,26,18,0.06)',
      }}
    >
      <button onClick={onToggle} style={iconBtn} title={collapsed ? 'Развернуть' : 'Свернуть'}>
        {collapsed ? '▸' : '▾'}
      </button>
      {editing ? (
        <input
          autoFocus value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={() => { updateChapter(bookId, chapter.id, { title: val.trim() || 'Без названия' }); setEditing(false) }}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          style={{
            flex: 1, background: 'var(--paper)', border: '1px solid var(--rule)',
            padding: '2px 6px', fontFamily: 'var(--font-serif)', fontSize: 14,
            color: 'var(--ink)', borderRadius: 2,
          }}
        />
      ) : (
        <span onDoubleClick={() => setEditing(true)} style={{ flex: 1, cursor: 'text', fontStyle: 'italic' }}>
          {chapter.title}
        </span>
      )}
      {hover && !editing && (
        <div style={{ display: 'flex', gap: 2 }}>
          <button style={iconBtn} title="Переименовать" onClick={() => setEditing(true)}>✎</button>
          <button style={iconBtn} title="Вверх" disabled={index === 0}
            onClick={() => moveChapter(bookId, chapter.id, 'up')}>↑</button>
          <button style={iconBtn} title="Вниз" disabled={index === total - 1}
            onClick={() => moveChapter(bookId, chapter.id, 'down')}>↓</button>
          <button style={iconBtn} title="Добавить конспект"
            onClick={() => addNote(bookId, chapter.id)}>+</button>
          <button style={iconBtn} title="Удалить главу"
            onClick={() => { if (confirm(`Удалить главу «${chapter.title}»?`)) deleteChapter(bookId, chapter.id) }}>×</button>
        </div>
      )}
    </div>
  )
}

function NoteRow({
  bookId, chapterId, note, index, total, active, onClick,
}: {
  bookId: string
  chapterId: string
  note: { id: string; title: string }
  index: number
  total: number
  active: boolean
  onClick: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(note.title)
  useEffect(() => setVal(note.title), [note.title])
  const [hover, setHover] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        padding: '5px 10px 5px 36px', display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: 'var(--font-ui)', fontSize: 13, color: active ? 'var(--accent)' : 'var(--ink)',
        background: active ? 'rgba(139,58,47,0.08)' : 'transparent',
        cursor: 'pointer', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
      }}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-soft)', minWidth: 18 }}>
        §{index + 1}
      </span>
      {editing ? (
        <input
          autoFocus value={val}
          onClick={e => e.stopPropagation()}
          onChange={e => setVal(e.target.value)}
          onBlur={() => { updateNote(bookId, chapterId, note.id, { title: val.trim() || 'Без названия' }); setEditing(false) }}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          style={{
            flex: 1, background: 'var(--paper)', border: '1px solid var(--rule)',
            padding: '1px 5px', fontFamily: 'var(--font-ui)', fontSize: 13,
            color: 'var(--ink)', borderRadius: 2,
          }}
        />
      ) : (
        <span style={{ flex: 1 }} onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}>
          {note.title}
        </span>
      )}
      {hover && !editing && (
        <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
          <button style={iconBtn} title="Переименовать" onClick={() => setEditing(true)}>✎</button>
          <button style={iconBtn} title="Вверх" disabled={index === 0}
            onClick={() => moveNote(bookId, chapterId, note.id, 'up')}>↑</button>
          <button style={iconBtn} title="Вниз" disabled={index === total - 1}
            onClick={() => moveNote(bookId, chapterId, note.id, 'down')}>↓</button>
          <button style={iconBtn} title="Удалить"
            onClick={() => { if (confirm(`Удалить «${note.title}»?`)) deleteNote(bookId, chapterId, note.id) }}>×</button>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════ TOPBAR ═══════════════════════
function TopBar({ book, note, chapter, onPreview }: {
  book: ReturnType<typeof getBook> & {}
  note?: { title: string; id: string }
  chapter?: { title: string; id: string }
  onPreview: () => void
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [val, setVal] = useState(book.title)
  useEffect(() => setVal(book.title), [book.title])
  const [exportSub, setExportSub] = useState<'none' | 'note' | 'chapter'>('none')

  return (
    <header style={{
      padding: '14px 28px', borderBottom: '1px solid var(--rule)',
      display: 'flex', alignItems: 'center', gap: 18, background: 'var(--paper)',
      flexShrink: 0,
    }}>
      <div style={{ flex: 1 }}>
        {editingTitle ? (
          <input
            autoFocus value={val}
            onChange={e => setVal(e.target.value)}
            onBlur={() => { updateBook(book.id, { title: val.trim() || 'Без названия' }); setEditingTitle(false) }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            style={{
              fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--ink)',
              background: 'transparent', border: '1px solid var(--rule)', padding: '2px 6px',
              borderRadius: 2, width: 480,
            }}
          />
        ) : (
          <h1 onDoubleClick={() => setEditingTitle(true)} style={{
            margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22,
            color: 'var(--ink)', cursor: 'text', fontWeight: 500,
          }}>
            {book.title}
          </h1>
        )}
        {chapter && note && (
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2, fontFamily: 'var(--font-ui)' }}>
            <span style={{ fontStyle: 'italic' }}>{chapter.title}</span>
            <span style={{ margin: '0 6px' }}>›</span>
            <span>{note.title}</span>
          </div>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <button onClick={() => setExportSub(s => s === 'note' ? 'none' : 'note')}
          style={btnGhost} disabled={!note || !chapter}>
          ↓ Экспорт конспекта
        </button>
        {exportSub === 'note' && note && chapter && (
          <ExportSubmenu onClose={() => setExportSub('none')}>
            <ExportItem label=".kips.json" onClick={() => { exportNote(book, chapter.id, note.id, 'json'); setExportSub('none') }} />
            <ExportItem label="Markdown" onClick={() => { exportNote(book, chapter.id, note.id, 'md'); setExportSub('none') }} />
            <ExportItem label="HTML" onClick={() => { exportNote(book, chapter.id, note.id, 'html'); setExportSub('none') }} />
          </ExportSubmenu>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <button onClick={() => setExportSub(s => s === 'chapter' ? 'none' : 'chapter')}
          style={btnGhost} disabled={!chapter}>
          ↓ Экспорт главы
        </button>
        {exportSub === 'chapter' && chapter && (
          <ExportSubmenu onClose={() => setExportSub('none')}>
            <ExportItem label=".kips.json" onClick={() => { exportChapter(book, chapter.id, 'json'); setExportSub('none') }} />
            <ExportItem label="Markdown" onClick={() => { exportChapter(book, chapter.id, 'md'); setExportSub('none') }} />
            <ExportItem label="HTML" onClick={() => { exportChapter(book, chapter.id, 'html'); setExportSub('none') }} />
          </ExportSubmenu>
        )}
      </div>

      <button onClick={onPreview} style={btnPrimary}>◐ Reader</button>
    </header>
  )
}

function ExportSubmenu({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  // закрываем при клике вне
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', right: 0, marginTop: 4,
      background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 4,
      boxShadow: '0 6px 24px rgba(33,26,18,0.18)', zIndex: 30, minWidth: 200,
    }}>{children}</div>
  )
}

// ═══════════════════════ EMPTY ═══════════════════════
function EmptyState({ onAddChapter }: { onAddChapter: () => void }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16, color: 'var(--ink-soft)',
    }}>
      <div style={{ fontSize: 48, fontFamily: 'var(--font-serif)', opacity: 0.3 }}>✦</div>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontStyle: 'italic' }}>
        Книга пуста. Добавьте первую главу.
      </p>
      <button onClick={onAddChapter} style={btnPrimary}>+ Глава</button>
    </div>
  )
}

// ═══════════════════════ BLOCK EDITOR ═══════════════════════
function BlockEditor({ bookId, chapterId, note }: {
  bookId: string
  chapterId: string
  note: { id: string; title: string; blocks: Block[] }
}) {
  const blocks = note.blocks
  const update = (next: Block[]) => updateNoteBlocks(bookId, chapterId, note.id, next)

  const addBlockAt = (i: number, type: BlockType) => {
    const next = [...blocks]
    next.splice(i, 0, newBlock(type))
    update(next)
  }
  const removeBlock = (i: number) => update(blocks.filter((_, j) => j !== i))
  const duplicateBlock = (i: number) => {
    const next = [...blocks]
    const copy = JSON.parse(JSON.stringify(blocks[i])) as Block
    copy.id = uid()
    next.splice(i + 1, 0, copy)
    update(next)
  }
  const moveBlockBy = (i: number, delta: number) => {
    const j = i + delta
    if (j < 0 || j >= blocks.length) return
    const next = [...blocks]
    const [b] = next.splice(i, 1)
    next.splice(j, 0, b)
    update(next)
  }
  const patchBlock = (i: number, patch: Partial<Block>) => {
    const next = [...blocks]
    next[i] = { ...next[i], ...patch } as Block
    update(next)
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '32px 64px 120px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <NoteTitleField bookId={bookId} chapterId={chapterId} noteId={note.id} title={note.title} />

        {blocks.length === 0 && (
          <div style={{
            padding: '48px 24px', textAlign: 'center', color: 'var(--ink-soft)',
            border: '1px dashed var(--rule)', borderRadius: 4, marginTop: 32,
          }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16, marginBottom: 18 }}>
              Конспект пока пуст. Добавьте первый блок.
            </p>
            <BlockTypeMenu onPick={(t) => addBlockAt(0, t)} />
          </div>
        )}

        {blocks.map((b, i) => (
          <div key={b.id} style={{ marginTop: i === 0 ? 24 : 18 }}>
            <BlockToolbar
              first={i === 0}
              last={i === blocks.length - 1}
              onUp={() => moveBlockBy(i, -1)}
              onDown={() => moveBlockBy(i, 1)}
              onDup={() => duplicateBlock(i)}
              onDel={() => removeBlock(i)}
              type={b.type}
            />
            <BlockBody block={b} onPatch={(p) => patchBlock(i, p)} />
            <InlineAdder onPick={(t) => addBlockAt(i + 1, t)} />
          </div>
        ))}
      </div>
    </div>
  )
}

function NoteTitleField({ bookId, chapterId, noteId, title }: {
  bookId: string; chapterId: string; noteId: string; title: string
}) {
  const [val, setVal] = useState(title)
  useEffect(() => setVal(title), [title])
  return (
    <input
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => updateNote(bookId, chapterId, noteId, { title: val.trim() || 'Без названия' })}
      style={{
        width: '100%', background: 'transparent', border: 'none', outline: 'none',
        fontFamily: 'var(--font-serif)', fontSize: 32, color: 'var(--ink)',
        fontWeight: 500, padding: '8px 0',
        borderBottom: '2px solid var(--rule)', marginBottom: 4,
      }}
    />
  )
}

function BlockToolbar({ first, last, onUp, onDown, onDup, onDel, type }: {
  first: boolean; last: boolean
  onUp: () => void; onDown: () => void; onDup: () => void; onDel: () => void
  type: BlockType
}) {
  const meta = BLOCK_REGISTRY.find(m => m.type === type)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--ink-soft)',
      marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14 }}>{meta?.glyph}</span>
        {meta?.label}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
      <button style={iconBtn} disabled={first} onClick={onUp} title="Вверх">↑</button>
      <button style={iconBtn} disabled={last} onClick={onDown} title="Вниз">↓</button>
      <button style={iconBtn} onClick={onDup} title="Дублировать">⎘</button>
      <button style={iconBtn} onClick={onDel} title="Удалить">×</button>
    </div>
  )
}

function InlineAdder({ onPick }: { onPick: (t: BlockType) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative', textAlign: 'center', marginTop: 12 }}>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: 20, color: 'var(--ink-soft)', opacity: 0.4,
          padding: '2px 12px', fontFamily: 'var(--font-serif)',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
          title="Добавить блок">
          ✦
        </button>
      ) : (
        <BlockTypeMenu onPick={(t) => { setOpen(false); onPick(t) }} onCancel={() => setOpen(false)} />
      )}
    </div>
  )
}

function BlockTypeMenu({ onPick, onCancel }: { onPick: (t: BlockType) => void; onCancel?: () => void }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center',
      padding: 12, background: '#ede4d0', border: '1px solid var(--rule)', borderRadius: 4,
    }}>
      {BLOCK_REGISTRY.map(m => (
        <button key={m.type} onClick={() => onPick(m.type)} style={{
          padding: '8px 12px', background: 'var(--paper)', border: '1px solid var(--rule)',
          borderRadius: 3, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12,
          color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6,
        }} title={m.hint}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14 }}>{m.glyph}</span>
          {m.label}
        </button>
      ))}
      {onCancel && (
        <button onClick={onCancel} style={{
          padding: '8px 12px', background: 'transparent', border: '1px dashed var(--rule)',
          borderRadius: 3, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12,
          color: 'var(--ink-soft)',
        }}>отмена</button>
      )}
    </div>
  )
}

// ═══════════════════════ BLOCK BODY (рендер каждого типа) ═══════════════════════
function BlockBody({ block, onPatch }: { block: Block; onPatch: (p: Partial<Block>) => void }) {
  switch (block.type) {
    case 'header': return <HeaderBody block={block} onPatch={onPatch} />
    case 'theory': return <TheoryBody block={block} onPatch={onPatch} />
    case 'python': return <PythonBody block={block} onPatch={onPatch} />
    case 'image': return <ImageBody block={block} onPatch={onPatch} />
    case 'animation': return <AnimationBody block={block} onPatch={onPatch} />
    case 'exercise': return <ExerciseBody block={block} onPatch={onPatch} />
    case 'quote': return <QuoteBody block={block} onPatch={onPatch} />
    case 'divider': return <DividerBody block={block} onPatch={onPatch} />
  }
}

function HeaderBody({ block, onPatch }: { block: HeaderBlock; onPatch: (p: Partial<Block>) => void }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        <label style={lbl}>Уровень:</label>
        {([1, 2, 3] as const).map(lv => (
          <button key={lv}
            onClick={() => onPatch({ level: lv } as Partial<HeaderBlock>)}
            style={{
              padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11,
              background: block.level === lv ? 'var(--accent)' : 'transparent',
              color: block.level === lv ? '#faf6ec' : 'var(--ink)',
              border: '1px solid var(--rule)', borderRadius: 2,
            }}>
            H{lv}
          </button>
        ))}
      </div>
      <input
        value={block.content}
        onChange={e => onPatch({ content: e.target.value } as Partial<HeaderBlock>)}
        style={{
          width: '100%', padding: '6px 0', fontFamily: 'var(--font-serif)',
          fontSize: block.level === 1 ? 28 : block.level === 2 ? 22 : 18,
          background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink)',
          borderBottom: '1px solid var(--rule)',
        }}
      />
    </div>
  )
}

function TheoryBody({ block, onPatch }: { block: TheoryBlock; onPatch: (p: Partial<Block>) => void }) {
  return (
    <div>
      <textarea
        value={block.content}
        onChange={e => onPatch({ content: e.target.value } as Partial<TheoryBlock>)}
        rows={Math.max(3, block.content.split('\n').length)}
        style={{
          width: '100%', padding: 12, fontFamily: 'var(--font-serif-body)',
          fontSize: 16, lineHeight: 1.7,
          background: block.highlight ? 'rgba(160,122,60,0.1)' : 'transparent',
          border: '1px solid var(--rule)', borderRadius: 3, color: 'var(--ink)', resize: 'vertical',
        }}
        placeholder="Текст параграфа. Поддерживается **жирный** и *курсив* (отображаются в Reader)."
      />
      <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <input type="checkbox" checked={!!block.highlight}
          onChange={e => onPatch({ highlight: e.target.checked } as Partial<TheoryBlock>)} />
        Выделить как важный фрагмент
      </label>
    </div>
  )
}

function PythonBody({ block, onPatch }: { block: PythonBlock; onPatch: (p: Partial<Block>) => void }) {
  return (
    <div>
      <input
        value={block.title}
        onChange={e => onPatch({ title: e.target.value } as Partial<PythonBlock>)}
        placeholder="Заголовок листинга"
        style={{
          width: '100%', padding: '6px 10px', marginBottom: 4, fontFamily: 'var(--font-ui)',
          fontSize: 13, color: 'var(--ink)', background: 'transparent',
          border: '1px solid var(--rule)', borderRadius: 3,
        }}
      />
      <textarea
        value={block.content}
        onChange={e => onPatch({ content: e.target.value } as Partial<PythonBlock>)}
        rows={Math.max(6, block.content.split('\n').length + 1)}
        style={{
          width: '100%', padding: 12, fontFamily: 'var(--font-mono)', fontSize: 13,
          background: '#211a12', color: '#f3eddc', border: '1px solid var(--rule)',
          borderRadius: 3, resize: 'vertical', lineHeight: 1.55,
        }}
      />
      <input
        value={block.description}
        onChange={e => onPatch({ description: e.target.value } as Partial<PythonBlock>)}
        placeholder="Краткое описание (необязательно)"
        style={{
          width: '100%', padding: '6px 10px', marginTop: 4, fontFamily: 'var(--font-ui)',
          fontSize: 12, fontStyle: 'italic', color: 'var(--ink-soft)',
          background: 'transparent', border: '1px solid var(--rule)', borderRadius: 3,
        }}
      />
    </div>
  )
}

function ImageBody({ block, onPatch }: { block: ImageBlock; onPatch: (p: Partial<Block>) => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const onFile = (f?: File) => {
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => onPatch({ src: String(reader.result) } as Partial<ImageBlock>)
    reader.readAsDataURL(f)
  }
  return (
    <div>
      {block.src ? (
        <div style={{ textAlign: 'center', padding: 8, border: '1px solid var(--rule)', borderRadius: 3, background: '#ede4d0' }}>
          <img src={block.src} alt={block.alt}
            style={{
              maxWidth: '100%', maxHeight: 360,
              objectFit: block.fit ?? 'contain',
              borderRadius: block.borderRadius ?? 4,
              filter: `brightness(${block.brightness ?? 100}%) contrast(${block.contrast ?? 100}%)`,
            }} />
        </div>
      ) : (
        <div onClick={() => fileInput.current?.click()} style={{
          padding: 36, border: '1px dashed var(--rule)', borderRadius: 4, textAlign: 'center',
          cursor: 'pointer', background: '#ede4d0', color: 'var(--ink-soft)',
          fontFamily: 'var(--font-ui)', fontSize: 13,
        }}>
          ◫ &nbsp; Нажмите, чтобы загрузить изображение
        </div>
      )}
      <input ref={fileInput} type="file" accept="image/*" hidden
        onChange={e => onFile(e.target.files?.[0])} />
      <input
        value={block.caption}
        onChange={e => onPatch({ caption: e.target.value } as Partial<ImageBlock>)}
        placeholder="Подпись"
        style={{
          width: '100%', padding: '6px 10px', marginTop: 6, fontFamily: 'var(--font-serif-body)',
          fontSize: 13, fontStyle: 'italic', color: 'var(--ink)',
          background: 'transparent', border: 'none', borderBottom: '1px solid var(--rule)',
          textAlign: 'center', outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: 'var(--ink-soft)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          Вписать:
          <select value={block.fit ?? 'contain'} onChange={e => onPatch({ fit: e.target.value as any } as Partial<ImageBlock>)}
            style={selectMini}>
            <option value="contain">по размеру</option>
            <option value="cover">обрезка</option>
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          Скругление:
          <input type="range" min={0} max={20} value={block.borderRadius ?? 4}
            onChange={e => onPatch({ borderRadius: +e.target.value } as Partial<ImageBlock>)} />
        </label>
        {block.src && (
          <button onClick={() => onPatch({ src: '' } as Partial<ImageBlock>)}
            style={{ ...iconBtn, marginLeft: 'auto' }}>заменить</button>
        )}
      </div>
    </div>
  )
}

function AnimationBody({ block, onPatch }: { block: AnimationBlock; onPatch: (p: Partial<Block>) => void }) {
  const meta = ANIM_REGISTRY.find(a => a.type === block.animType)
  const [tab, setTab] = useState<'math' | 'physics'>(meta?.category ?? 'math')

  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 4, overflow: 'hidden', background: '#ede4d0' }}>
      <div style={{ padding: 10, borderBottom: '1px solid var(--rule)', background: 'var(--paper)' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {(['math', 'physics'] as const).map(c => (
            <button key={c} onClick={() => setTab(c)} style={{
              padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12,
              background: tab === c ? 'var(--ink)' : 'transparent',
              color: tab === c ? '#faf6ec' : 'var(--ink)',
              border: '1px solid var(--rule)', borderRadius: 2,
            }}>
              {c === 'math' ? 'Математика' : 'Физика'}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 4 }}>
          {ANIMS_BY_CATEGORY[tab].map(a => (
            <button key={a.type}
              onClick={() => onPatch({ animType: a.type, params: defaultAnimParams(a.type) } as Partial<AnimationBlock>)}
              style={{
                padding: '6px 8px', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 11,
                background: block.animType === a.type ? 'var(--accent)' : 'var(--paper)',
                color: block.animType === a.type ? '#faf6ec' : 'var(--ink)',
                border: '1px solid var(--rule)', borderRadius: 2, textAlign: 'left',
              }}
              title={a.description}>
              {a.title}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 12 }}>
        <AnimationCanvas type={block.animType} params={block.params} height={260} />
      </div>

      {meta && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--rule)', background: 'var(--paper)' }}>
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--ink-soft)',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8
          }}>
            Параметры — {meta.title}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {meta.params.map(spec => (
              <ParamControl
                key={spec.key}
                spec={spec}
                value={block.params[spec.key]}
                onChange={(v) => onPatch({ params: { ...block.params, [spec.key]: v } } as Partial<AnimationBlock>)}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '0 14px 12px' }}>
        <input
          value={block.caption ?? ''}
          onChange={e => onPatch({ caption: e.target.value } as Partial<AnimationBlock>)}
          placeholder="Подпись (необязательно)"
          style={{
            width: '100%', padding: '6px 10px', fontFamily: 'var(--font-serif-body)',
            fontSize: 13, fontStyle: 'italic', color: 'var(--ink)',
            background: 'transparent', border: 'none',
            borderBottom: '1px solid var(--rule)', textAlign: 'center', outline: 'none',
          }}
        />
      </div>
    </div>
  )
}

function ParamControl({ spec, value, onChange }: {
  spec: import('../types').ParamSpec
  value: number | string | boolean
  onChange: (v: number | string | boolean) => void
}) {
  if (spec.kind === 'number') {
    return (
      <label style={{ display: 'block', fontSize: 12, fontFamily: 'var(--font-ui)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-soft)', marginBottom: 2 }}>
          <span>{spec.label}</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
            {typeof value === 'number' ? value.toFixed(spec.step && spec.step < 1 ? 2 : 0) : ''}
          </span>
        </div>
        <input
          type="range"
          min={spec.min} max={spec.max} step={spec.step}
          value={typeof value === 'number' ? value : Number(spec.default)}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </label>
    )
  }
  if (spec.kind === 'select') {
    return (
      <label style={{ display: 'block', fontSize: 12, fontFamily: 'var(--font-ui)' }}>
        <div style={{ color: 'var(--ink-soft)', marginBottom: 2 }}>{spec.label}</div>
        <select
          value={typeof value === 'string' ? value : String(spec.default)}
          onChange={e => onChange(e.target.value)}
          style={{ ...selectMini, width: '100%', padding: '4px 6px' }}
        >
          {spec.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    )
  }
  // boolean
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: 'var(--font-ui)' }}>
      <input
        type="checkbox"
        checked={typeof value === 'boolean' ? value : Boolean(spec.default)}
        onChange={e => onChange(e.target.checked)}
      />
      {spec.label}
    </label>
  )
}

function ExerciseBody({ block, onPatch }: { block: ExerciseBlock; onPatch: (p: Partial<Block>) => void }) {
  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 4, padding: 14, background: '#ede4d0' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-soft)' }}>№</span>
        <input value={block.number ?? ''} onChange={e => onPatch({ number: e.target.value } as Partial<ExerciseBlock>)}
          placeholder="1.2" style={{ width: 60, padding: '3px 6px', fontFamily: 'var(--font-mono)', fontSize: 12, border: '1px solid var(--rule)', borderRadius: 2, background: 'var(--paper)' }} />
      </div>
      <label style={lbl}>Условие</label>
      <textarea value={block.question} onChange={e => onPatch({ question: e.target.value } as Partial<ExerciseBlock>)}
        rows={2} style={{ width: '100%', padding: 8, fontFamily: 'var(--font-serif-body)', fontSize: 14, border: '1px solid var(--rule)', borderRadius: 2, background: 'var(--paper)', color: 'var(--ink)' }} />
      <label style={lbl}>Ответ</label>
      <input value={block.answer} onChange={e => onPatch({ answer: e.target.value } as Partial<ExerciseBlock>)}
        style={{ width: '100%', padding: 8, fontFamily: 'var(--font-mono)', fontSize: 13, border: '1px solid var(--rule)', borderRadius: 2, background: 'var(--paper)', color: 'var(--ink)' }} />
      <label style={lbl}>Решение</label>
      <textarea value={block.explanation} onChange={e => onPatch({ explanation: e.target.value } as Partial<ExerciseBlock>)}
        rows={3} style={{ width: '100%', padding: 8, fontFamily: 'var(--font-serif-body)', fontSize: 14, border: '1px solid var(--rule)', borderRadius: 2, background: 'var(--paper)', color: 'var(--ink)' }} />
    </div>
  )
}

function QuoteBody({ block, onPatch }: { block: QuoteBlock; onPatch: (p: Partial<Block>) => void }) {
  return (
    <div style={{ borderLeft: '3px solid var(--gold)', padding: '6px 18px', background: 'rgba(160,122,60,0.05)' }}>
      <textarea value={block.content} onChange={e => onPatch({ content: e.target.value } as Partial<QuoteBlock>)}
        rows={Math.max(2, block.content.split('\n').length)}
        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-serif-body)', fontStyle: 'italic', fontSize: 17, color: 'var(--ink)', lineHeight: 1.6 }}
        placeholder="Цитата" />
      <input value={block.author ?? ''} onChange={e => onPatch({ author: e.target.value } as Partial<QuoteBlock>)}
        placeholder="— Автор"
        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', textAlign: 'right', fontFamily: 'var(--font-serif-body)', fontSize: 13, color: 'var(--ink-soft)' }} />
    </div>
  )
}

function DividerBody({ block, onPatch }: { block: DividerBlock; onPatch: (p: Partial<Block>) => void }) {
  const styles = ['plain', 'fancy', 'flourish'] as const
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {styles.map(s => (
          <button key={s} onClick={() => onPatch({ style: s } as Partial<DividerBlock>)}
            style={{
              padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 11,
              background: (block.style ?? 'fancy') === s ? 'var(--ink)' : 'transparent',
              color: (block.style ?? 'fancy') === s ? '#faf6ec' : 'var(--ink)',
              border: '1px solid var(--rule)', borderRadius: 2,
            }}>
            {s}
          </button>
        ))}
      </div>
      <DividerPreview style={block.style ?? 'fancy'} />
    </div>
  )
}

export function DividerPreview({ style }: { style: 'plain' | 'fancy' | 'flourish' }) {
  if (style === 'plain') {
    return <hr style={{ border: 'none', borderTop: '1px solid var(--rule)', margin: '20px 0' }} />
  }
  if (style === 'flourish') {
    return (
      <div style={{ textAlign: 'center', margin: '24px 0', color: 'var(--gold)', fontFamily: 'var(--font-serif)', fontSize: 24, letterSpacing: '0.6em' }}>
        ❦ ❦ ❦
      </div>
    )
  }
  // fancy
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '24px 0', color: 'var(--gold)' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>✦</span>
      <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
    </div>
  )
}

// ═══════════════════════ STYLES ═══════════════════════
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, color: 'var(--ink-soft)',
  fontFamily: 'var(--font-ui)', textTransform: 'uppercase',
  letterSpacing: '0.06em', marginTop: 8, marginBottom: 3,
}
const iconBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  padding: '2px 6px', color: 'var(--ink-soft)', fontSize: 13,
  fontFamily: 'var(--font-ui)', borderRadius: 2,
}
const btnPrimary: React.CSSProperties = {
  padding: '8px 18px', background: 'var(--accent)', color: '#faf6ec',
  border: 'none', borderRadius: 2, cursor: 'pointer',
  fontFamily: 'var(--font-ui)', fontSize: 13,
  letterSpacing: '0.04em',
}
const btnGhost: React.CSSProperties = {
  padding: '8px 14px', background: 'transparent', color: 'var(--ink)',
  border: '1px solid var(--rule)', borderRadius: 2, cursor: 'pointer',
  fontFamily: 'var(--font-ui)', fontSize: 12,
}
const btnSidebar: React.CSSProperties = {
  width: '100%', padding: '6px 10px', background: 'var(--paper)', color: 'var(--ink)',
  border: '1px solid var(--rule)', borderRadius: 2, cursor: 'pointer',
  fontFamily: 'var(--font-ui)', fontSize: 12,
}
const selectMini: React.CSSProperties = {
  fontFamily: 'var(--font-ui)', fontSize: 12, padding: '2px 4px',
  border: '1px solid var(--rule)', borderRadius: 2, background: 'var(--paper)', color: 'var(--ink)',
}
