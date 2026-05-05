import { useEffect, useSyncExternalStore } from 'react'
import type { Block, Book, Chapter, Note } from '../types'

const STORAGE_KEY = 'codex.library.v1'

interface LibraryState {
  books: Book[]
}

// ─── store ─────────────────────────────────────────────────────────

const listeners = new Set<() => void>()
let state: LibraryState = load()

function load(): LibraryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { books: [] }
    return JSON.parse(raw)
  } catch {
    return { books: [] }
  }
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { }
}

function emit() {
  save()
  for (const l of Array.from(listeners)) l()
}

function setState(updater: (s: LibraryState) => LibraryState) {
  state = updater(state)
  emit()
}

// ─── hook ──────────────────────────────────────────────────────────

export function useLibrary() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => state,
    () => state
  )
}

// ─── helpers ───────────────────────────────────────────────────────

const now = () => Date.now()
const uid = () => Math.random().toString(36).slice(2, 11) + now().toString(36)

// ─── book ops ──────────────────────────────────────────────────────

export function createBook(title: string, author = '', description = ''): Book {
  const book: Book = {
    id: uid(),
    title: title.trim() || 'Безымянная книга',
    author,
    description,
    chapters: [createChapter('Глава 1')],
    createdAt: now(),
    updatedAt: now(),
  }
  setState(s => ({ books: [...s.books, book] }))
  return book
}

export function updateBook(id: string, patch: Partial<Pick<Book, 'title' | 'author' | 'description'>>) {
  setState(s => ({
    books: s.books.map(b => b.id === id ? { ...b, ...patch, updatedAt: now() } : b),
  }))
}

export function deleteBook(id: string) {
  setState(s => ({ books: s.books.filter(b => b.id !== id) }))
}

export function getBook(id: string): Book | undefined {
  return state.books.find(b => b.id === id)
}

// ─── chapter ops ───────────────────────────────────────────────────

export function createChapter(title?: string): Chapter {
  return {
    id: uid(),
    title: title || 'Новая глава',
    notes: [createNote('Новый конспект')],
    createdAt: now(),
  }
}

export function addChapter(bookId: string) {
  setState(s => ({
    books: s.books.map(b => {
      if (b.id !== bookId) return b
      const num = b.chapters.length + 1
      return {
        ...b,
        chapters: [...b.chapters, createChapter(`Глава ${num}`)],
        updatedAt: now(),
      }
    }),
  }))
}

export function updateChapter(bookId: string, chapterId: string, patch: Partial<Pick<Chapter, 'title'>>) {
  setState(s => ({
    books: s.books.map(b => {
      if (b.id !== bookId) return b
      return {
        ...b,
        chapters: b.chapters.map(c => c.id === chapterId ? { ...c, ...patch } : c),
        updatedAt: now(),
      }
    }),
  }))
}

export function deleteChapter(bookId: string, chapterId: string) {
  setState(s => ({
    books: s.books.map(b => {
      if (b.id !== bookId) return b
      return {
        ...b,
        chapters: b.chapters.filter(c => c.id !== chapterId),
        updatedAt: now(),
      }
    }),
  }))
}

export function moveChapter(bookId: string, chapterId: string, direction: 'up' | 'down') {
  setState(s => ({
    books: s.books.map(b => {
      if (b.id !== bookId) return b
      const idx = b.chapters.findIndex(c => c.id === chapterId)
      if (idx < 0) return b
      const ni = direction === 'up' ? idx - 1 : idx + 1
      if (ni < 0 || ni >= b.chapters.length) return b
      const ch = [...b.chapters]
        ;[ch[idx], ch[ni]] = [ch[ni], ch[idx]]
      return { ...b, chapters: ch, updatedAt: now() }
    }),
  }))
}

// ─── note ops ──────────────────────────────────────────────────────

export function createNote(title?: string): Note {
  return {
    id: uid(),
    title: title || 'Новый конспект',
    blocks: [
      { id: uid(), type: 'header', content: title || 'Новый конспект', level: 1 },
    ],
    createdAt: now(),
    updatedAt: now(),
  }
}

export function addNote(bookId: string, chapterId: string) {
  setState(s => ({
    books: s.books.map(b => {
      if (b.id !== bookId) return b
      return {
        ...b,
        chapters: b.chapters.map(c => {
          if (c.id !== chapterId) return c
          return { ...c, notes: [...c.notes, createNote(`Конспект ${c.notes.length + 1}`)] }
        }),
        updatedAt: now(),
      }
    }),
  }))
}

export function updateNote(bookId: string, chapterId: string, noteId: string, patch: Partial<Pick<Note, 'title' | 'blocks'>>) {
  setState(s => ({
    books: s.books.map(b => {
      if (b.id !== bookId) return b
      return {
        ...b,
        chapters: b.chapters.map(c => {
          if (c.id !== chapterId) return c
          return {
            ...c,
            notes: c.notes.map(n => n.id === noteId ? { ...n, ...patch, updatedAt: now() } : n),
          }
        }),
        updatedAt: now(),
      }
    }),
  }))
}

export function deleteNote(bookId: string, chapterId: string, noteId: string) {
  setState(s => ({
    books: s.books.map(b => {
      if (b.id !== bookId) return b
      return {
        ...b,
        chapters: b.chapters.map(c => {
          if (c.id !== chapterId) return c
          return { ...c, notes: c.notes.filter(n => n.id !== noteId) }
        }),
        updatedAt: now(),
      }
    }),
  }))
}

export function moveNote(bookId: string, chapterId: string, noteId: string, direction: 'up' | 'down') {
  setState(s => ({
    books: s.books.map(b => {
      if (b.id !== bookId) return b
      return {
        ...b,
        chapters: b.chapters.map(c => {
          if (c.id !== chapterId) return c
          const idx = c.notes.findIndex(n => n.id === noteId)
          if (idx < 0) return c
          const ni = direction === 'up' ? idx - 1 : idx + 1
          if (ni < 0 || ni >= c.notes.length) return c
          const ns = [...c.notes]
            ;[ns[idx], ns[ni]] = [ns[ni], ns[idx]]
          return { ...c, notes: ns }
        }),
        updatedAt: now(),
      }
    }),
  }))
}

export function updateNoteBlocks(bookId: string, chapterId: string, noteId: string, blocks: Block[]) {
  updateNote(bookId, chapterId, noteId, { blocks })
}

// ─── import ───────────────────────────────────────────────────────

export function importBook(book: Book) {
  // даём новый id чтобы избежать конфликтов
  const fresh: Book = {
    ...book,
    id: uid(),
    chapters: book.chapters.map(c => ({
      ...c,
      id: uid(),
      notes: c.notes.map(n => ({
        ...n,
        id: uid(),
        blocks: n.blocks.map(b => ({ ...b, id: uid() })),
      })),
    })),
    updatedAt: now(),
  }
  setState(s => ({ books: [...s.books, fresh] }))
  return fresh
}
