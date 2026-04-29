import { useState } from 'react'
import type { Route } from '../App'
import { useLibrary, createBook, deleteBook, importBook } from '../store/library'
import type { Book } from '../types'

interface Props { navigate: (r: Route) => void }

export function Library({ navigate }: Props) {
  const { books } = useLibrary()
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  return (
    <div className="paper-grain" style={{ minHeight: '100vh', padding: '60px 24px 100px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <Header />

        {books.length === 0 ? (
          <Empty onCreate={() => setCreating(true)} onImport={() => setImporting(true)} />
        ) : (
          <Shelf
            books={books}
            onOpen={(id) => navigate({ name: 'constructor', bookId: id })}
            onRead={(id) => navigate({ name: 'reader', bookId: id })}
            onDelete={(id) => setConfirmDelete(id)}
            onCreate={() => setCreating(true)}
            onImport={() => setImporting(true)}
          />
        )}

        <Footer />
      </div>

      {creating && (
        <CreateBookModal
          onClose={() => setCreating(false)}
          onCreate={(title, author, desc) => {
            const book = createBook(title, author, desc)
            setCreating(false)
            navigate({ name: 'constructor', bookId: book.id })
          }}
        />
      )}

      {importing && (
        <ImportModal
          onClose={() => setImporting(false)}
          onImport={(book) => {
            importBook(book)
            setImporting(false)
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Удалить книгу?"
          message="Все главы и конспекты будут стёрты безвозвратно."
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { deleteBook(confirmDelete); setConfirmDelete(null) }}
        />
      )}
    </div>
  )
}

function Header() {
  return (
    <header style={{ textAlign: 'center', marginBottom: 56 }}>
      <div className="mono" style={{ fontSize: 11, letterSpacing: '0.4em', color: 'var(--ink-faint)', textTransform: 'uppercase', marginBottom: 16 }}>
        Платформа для конспектов
      </div>
      <h1 className="serif" style={{ fontSize: 'clamp(3.4rem, 7vw, 5.4rem)', fontWeight: 500, letterSpacing: '0.02em', lineHeight: 1, color: 'var(--ink)', marginBottom: 14 }}>
        Codex
      </h1>
      <div className="serif-text" style={{ fontStyle: 'italic', color: 'var(--ink-soft)', fontSize: 18 }}>
        Собирайте знания в книги. Делитесь страницами.
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 28, color: 'var(--ink-rule)' }}>
        <span style={{ flex: 1, maxWidth: 120, height: 1, background: 'currentColor', opacity: 0.5 }} />
        <span style={{ margin: '0 18px', fontSize: 14 }}>✦</span>
        <span style={{ flex: 1, maxWidth: 120, height: 1, background: 'currentColor', opacity: 0.5 }} />
      </div>
    </header>
  )
}

function Empty({ onCreate, onImport }: { onCreate: () => void; onImport: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div className="serif-text" style={{ fontSize: 22, fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 8 }}>
        Полки пока пусты
      </div>
      <p style={{ color: 'var(--ink-faint)', maxWidth: 460, margin: '0 auto 36px' }}>
        Создайте первую книгу — внутри будут главы, в главах конспекты с теорией, кодом и анимациями.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
        <PrimaryButton onClick={onCreate}>Создать книгу</PrimaryButton>
        <GhostButton onClick={onImport}>Импортировать</GhostButton>
      </div>
    </div>
  )
}

function Shelf({ books, onOpen, onRead, onDelete, onCreate, onImport }: {
  books: Book[]
  onOpen: (id: string) => void
  onRead: (id: string) => void
  onDelete: (id: string) => void
  onCreate: () => void
  onImport: () => void
}) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 22 }}>
        <h2 className="serif" style={{ fontSize: 28, fontWeight: 500 }}>Моя библиотека</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <GhostButton onClick={onImport}>+ Импорт</GhostButton>
          <PrimaryButton onClick={onCreate}>Новая книга</PrimaryButton>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 22 }}>
        {books.map(b => (
          <BookCard key={b.id} book={b} onOpen={onOpen} onRead={onRead} onDelete={onDelete} />
        ))}
      </div>
    </>
  )
}

function BookCard({ book, onOpen, onRead, onDelete }: {
  book: Book
  onOpen: (id: string) => void
  onRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  const noteCount = book.chapters.reduce((s, c) => s + c.notes.length, 0)
  // акцентный цвет корешка варьируется по id для разнообразия
  const hue = (book.id.charCodeAt(0) + book.id.charCodeAt(1)) % 360
  const spineColor = `hsl(${hue}, 40%, 35%)`

  return (
    <div className="fade-in" style={{
      background: 'var(--panel)',
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow-md)',
      overflow: 'hidden',
      position: 'relative',
      border: '1px solid var(--panel-edge)',
      display: 'flex', flexDirection: 'column',
      minHeight: 220,
    }}>
      <div style={{
        height: 8,
        background: spineColor,
        borderBottom: '1px solid rgba(0,0,0,0.15)',
      }} />
      <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-faint)', textTransform: 'uppercase', marginBottom: 8 }}>
          Книга
        </div>
        <h3 className="serif" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', marginBottom: 6, lineHeight: 1.2 }}>
          {book.title}
        </h3>
        {book.author && (
          <div className="serif-text" style={{ fontStyle: 'italic', fontSize: 14, color: 'var(--ink-soft)', marginBottom: 8 }}>
            {book.author}
          </div>
        )}
        {book.description && (
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14, lineHeight: 1.55 }}>
            {book.description.length > 100 ? book.description.slice(0, 100) + '…' : book.description}
          </p>
        )}
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 'auto', display: 'flex', justifyContent: 'space-between' }}>
          <span>{book.chapters.length} гл.</span>
          <span>{noteCount} конспектов</span>
        </div>
      </div>
      <div style={{
        display: 'flex',
        borderTop: '1px solid var(--panel-edge)',
        background: 'var(--panel-deep)',
      }}>
        <CardButton onClick={() => onOpen(book.id)}>Редактировать</CardButton>
        <CardButton onClick={() => onRead(book.id)} accent>Открыть</CardButton>
        <CardButton onClick={() => onDelete(book.id)} danger>✕</CardButton>
      </div>
    </div>
  )
}

function Footer() {
  return (
    <div style={{ marginTop: 80, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 12 }}>
      <div className="rule-fancy" style={{ marginBottom: 12 }}>
        <span>✦</span>
      </div>
      <div className="serif-text" style={{ fontStyle: 'italic' }}>
        Все данные хранятся локально, в вашем браузере.
      </div>
    </div>
  )
}

// ─── UI primitives ────────────────────────────────────────────────

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--accent)',
        color: '#fff7e8',
        padding: '10px 22px',
        borderRadius: 4,
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: '0.02em',
        boxShadow: 'var(--shadow-sm)',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-soft)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
    >
      {children}
    </button>
  )
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        color: 'var(--ink)',
        padding: '10px 22px',
        borderRadius: 4,
        fontSize: 14,
        fontWeight: 500,
        border: '1px solid var(--ink-rule)',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ink)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--ink-rule)' }}
    >
      {children}
    </button>
  )
}

function CardButton({ children, onClick, accent, danger }: {
  children: React.ReactNode; onClick: () => void; accent?: boolean; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: danger ? '0 0 auto' : 1,
        padding: '10px',
        fontSize: 12,
        color: danger ? 'var(--accent)' : (accent ? 'var(--accent)' : 'var(--ink-soft)'),
        fontWeight: accent ? 500 : 400,
        borderRight: danger ? 'none' : '1px solid var(--panel-edge)',
        transition: 'background 0.12s',
        minWidth: danger ? 44 : 'auto',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,58,47,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  )
}

// ─── Modals ────────────────────────────────────────────────────────

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(33, 26, 18, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, zIndex: 100,
        animation: 'fadeIn 150ms ease-out',
      }}
    >
      <div className="fade-in" style={{
        background: 'var(--paper)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-lg)',
        padding: '34px 36px',
        width: '100%', maxWidth: 480,
        position: 'relative',
        border: '1px solid var(--panel-edge)',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 16,
          width: 28, height: 28, color: 'var(--ink-faint)', fontSize: 18,
        }}>✕</button>
        {children}
      </div>
    </div>
  )
}

function CreateBookModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (title: string, author: string, desc: string) => void
}) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [desc, setDesc] = useState('')

  return (
    <ModalShell onClose={onClose}>
      <h2 className="serif" style={{ fontSize: 28, fontWeight: 500, marginBottom: 8 }}>Новая книга</h2>
      <p className="serif-text" style={{ fontStyle: 'italic', color: 'var(--ink-faint)', marginBottom: 26 }}>
        Дайте название — главу и первый конспект Codex создаст за вас.
      </p>

      <Field label="Название">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Квантовая механика для физматшколы"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') onCreate(title, author, desc) }}
        />
      </Field>
      <Field label="Автор (необязательно)">
        <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Имя или псевдоним" />
      </Field>
      <Field label="Описание (необязательно)">
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="О чём эта книга..."
          rows={3}
        />
      </Field>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 26 }}>
        <GhostButton onClick={onClose}>Отмена</GhostButton>
        <PrimaryButton onClick={() => onCreate(title, author, desc)}>Создать</PrimaryButton>
      </div>
    </ModalShell>
  )
}

function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (book: Book) => void }) {
  const [error, setError] = useState('')

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const obj = JSON.parse(ev.target?.result as string)
        // допускаем файл, экспортированный как book или как { book: ... }
        const book: Book = obj.book ?? obj
        if (!book || !Array.isArray(book.chapters)) throw new Error('Не похоже на книгу Codex')
        onImport(book)
      } catch (err) {
        setError(String(err))
      }
    }
    reader.readAsText(file)
  }

  return (
    <ModalShell onClose={onClose}>
      <h2 className="serif" style={{ fontSize: 26, fontWeight: 500, marginBottom: 8 }}>Импорт книги</h2>
      <p className="serif-text" style={{ fontStyle: 'italic', color: 'var(--ink-faint)', marginBottom: 26 }}>
        Загрузите файл .codex.json — это формат, в котором Codex экспортирует книги.
      </p>

      <label
        style={{
          display: 'block', padding: '38px 18px',
          border: '2px dashed var(--ink-rule)', borderRadius: 'var(--radius)',
          textAlign: 'center', cursor: 'pointer',
          background: 'var(--panel)',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8, color: 'var(--ink-faint)' }}>↓</div>
        <div className="serif-text">Выбрать файл .codex.json</div>
        <input type="file" accept=".json,application/json" onChange={handleFile} style={{ display: 'none' }} />
      </label>

      {error && <p style={{ color: 'var(--accent)', marginTop: 14, fontSize: 13 }}>{error}</p>}
    </ModalShell>
  )
}

function ConfirmModal({ title, message, onCancel, onConfirm }: {
  title: string; message: string; onCancel: () => void; onConfirm: () => void
}) {
  return (
    <ModalShell onClose={onCancel}>
      <h2 className="serif" style={{ fontSize: 24, fontWeight: 500, marginBottom: 8 }}>{title}</h2>
      <p style={{ color: 'var(--ink-soft)', marginBottom: 28 }}>{message}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <GhostButton onClick={onCancel}>Отмена</GhostButton>
        <button
          onClick={onConfirm}
          style={{
            background: 'var(--accent)', color: '#fff7e8',
            padding: '10px 22px', borderRadius: 4, fontSize: 14, fontWeight: 500,
          }}
        >Удалить</button>
      </div>
    </ModalShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  )
}
