/* Spaced repetition for flashcards.

   Each reviewed card gets a schedule entry { step, due } where `due` is a
   local calendar day number. Marking a card:
     - "Still learning" → step 0, due tomorrow
     - "I know this"    → climbs one rung of LADDER (3, 7, 14, 30, 60 days)
                          — but only when the card was actually due; reviewing
                          early leaves the schedule untouched, so cramming a deck
                          twice in one evening doesn't fling cards months away.

   Cards that already had a status before this existed have no entry. They get
   a virtual one anchored to the day spaced repetition first ran on this
   device: learning cards are due immediately, known cards are spread across
   the following fortnight by a stable hash so nobody opens the app to a wall
   of 400 reviews.

   Stored per subject in localStorage and carried in the cloud progress blob
   (see progressSync.ts). Pure helpers are exported for tests. */

export const LADDER = [1, 3, 7, 14, 30, 60]

export interface SrsEntry {
  step: number
  due: number
}
export type Schedule = Record<string, SrsEntry>
export type CardStatus = 'known' | 'learning' | undefined | null | string

const PREFIX = 'gradelab-srs-v1-'
const ANCHOR_KEY = 'gradelab-srs-anchor-v1'

/* ------------------------------------------------------------ Pure helpers */

/** Local calendar day as an integer (days since 1970-01-01 in local time). */
export function dayNumber(d: Date = new Date()): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000)
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** The schedule entry to use for a card: its stored one, or a virtual backfill. */
export function effectiveEntry(cardId: string, status: CardStatus, schedule: Schedule, anchor: number): SrsEntry | null {
  const stored = schedule[cardId]
  if (stored) return stored
  if (status === 'known') return { step: 1, due: anchor + 1 + (hash(cardId) % 14) }
  if (status === 'learning') return { step: 0, due: anchor }
  return null
}

/** Next schedule entry after a review on `today`. */
export function nextEntry(prev: SrsEntry | null | undefined, status: 'known' | 'learning', today: number): SrsEntry {
  if (status === 'learning') return { step: 0, due: today + 1 }
  if (prev && today < prev.due) return prev // early review: no change
  const step = Math.min((prev ? prev.step : 0) + 1, LADDER.length - 1)
  return { step, due: today + LADDER[step] }
}

export function isDue(cardId: string, status: CardStatus, schedule: Schedule, anchor: number, today: number): boolean {
  const e = effectiveEntry(cardId, status, schedule, anchor)
  return !!e && e.due <= today
}

/** Due cards, most overdue first, learning before known on the same day. */
export function dueCards<T extends { id: string }>(
  cards: T[],
  progress: Record<string, CardStatus>,
  schedule: Schedule,
  anchor: number,
  today: number,
): T[] {
  const withDue: { card: T; due: number; learning: boolean }[] = []
  for (const card of cards) {
    const status = progress[card.id]
    const e = effectiveEntry(card.id, status, schedule, anchor)
    if (e && e.due <= today) withDue.push({ card, due: e.due, learning: status === 'learning' })
  }
  withDue.sort((a, b) => a.due - b.due || Number(b.learning) - Number(a.learning))
  return withDue.map((x) => x.card)
}

/** Per card, keep the entry that was reviewed most recently (later due wins; then higher step). */
export function mergeSchedules(
  a: Record<string, Schedule> = {},
  b: Record<string, Schedule> = {},
): Record<string, Schedule> {
  const out: Record<string, Schedule> = {}
  for (const sid of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const merged: Schedule = { ...(a[sid] || {}) }
    for (const [cid, e] of Object.entries(b[sid] || {})) {
      const cur = merged[cid]
      if (!cur || e.due > cur.due || (e.due === cur.due && e.step > cur.step)) merged[cid] = e
    }
    if (Object.keys(merged).length) out[sid] = merged
  }
  return out
}

/* ---------------------------------------------------------------- Storage */

export function loadSchedule(subjectId: string): Schedule {
  try {
    const v = JSON.parse(localStorage.getItem(PREFIX + subjectId) || '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

export function saveSchedule(subjectId: string, schedule: Schedule): void {
  try {
    localStorage.setItem(PREFIX + subjectId, JSON.stringify(schedule))
  } catch {
    /* ignore */
  }
}

/** First day spaced repetition ran on this device (created on first call). */
export function getAnchor(today: number = dayNumber()): number {
  try {
    const raw = localStorage.getItem(ANCHOR_KEY)
    if (raw && Number.isFinite(Number(raw))) return Number(raw)
    localStorage.setItem(ANCHOR_KEY, String(today))
  } catch {
    /* ignore */
  }
  return today
}

/** Record a review of one card (call once per mark, outside React updaters). */
export function recordReview(subjectId: string, cardId: string, status: 'known' | 'learning', prevStatus: CardStatus): void {
  const today = dayNumber()
  const schedule = loadSchedule(subjectId)
  const prev = effectiveEntry(cardId, prevStatus, schedule, getAnchor(today))
  schedule[cardId] = nextEntry(prev, status, today)
  saveSchedule(subjectId, schedule)
}

export function gatherSchedules(subjectIds: string[]): Record<string, Schedule> {
  const out: Record<string, Schedule> = {}
  for (const id of subjectIds) {
    const s = loadSchedule(id)
    if (Object.keys(s).length) out[id] = s
  }
  return out
}

export function writeSchedules(all: Record<string, Schedule>): void {
  for (const [id, s] of Object.entries(all || {})) saveSchedule(id, s)
}
