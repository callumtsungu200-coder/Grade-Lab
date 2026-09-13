/* Lightweight, append-only activity log. Everything the dashboard needs
   for "recent activity", "progress over time" and the streak is derived
   from this — no separate counters to keep in sync. Stored in
   localStorage, capped, newest last. */

export type ActivityType = 'known' | 'learning' | 'quiz' | 'exam'

export interface ActivityEvent {
  t: ActivityType
  /** subject id */
  s: string
  /** topic code (flashcards) */
  c?: string
  /** count — questions in a quiz, or 1 for a single card / exam mark */
  n?: number
  /** correct — quiz correct count; exam: 2 full / 1 part / 0 none */
  k?: number
  at: number
}

const KEY = 'gradelab-activity-v1'
const MAX = 800

export function loadActivity(): ActivityEvent[] {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function logActivity(e: Omit<ActivityEvent, 'at'>): void {
  try {
    const arr = loadActivity()
    arr.push({ ...e, at: Date.now() })
    if (arr.length > MAX) arr.splice(0, arr.length - MAX)
    localStorage.setItem(KEY, JSON.stringify(arr))
  } catch {
    /* ignore */
  }
}

/** Local-time YYYY-MM-DD for a timestamp. */
export function dayKey(ts: number): string {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

const DAY = 24 * 60 * 60 * 1000

/** Consecutive days with activity, counting back from today (or from
    yesterday if today is still empty, so a streak isn't lost mid-day). */
export function streakDays(events: ActivityEvent[]): number {
  if (!events.length) return 0
  const days = new Set(events.map((e) => dayKey(e.at)))
  const today = startOfDay(Date.now())
  let cursor = days.has(dayKey(today)) ? today : today - DAY
  let n = 0
  while (days.has(dayKey(cursor))) {
    n++
    cursor -= DAY
  }
  return n
}

export interface DayCount {
  day: string
  /** short weekday, e.g. "Mon" */
  weekday: string
  /** e.g. "8 Sep" */
  date: string
  /** cards / questions touched */
  count: number
}

/** Per-day activity counts for the last `n` days, oldest first. */
export function lastNDaysCounts(events: ActivityEvent[], n: number): DayCount[] {
  const today = startOfDay(Date.now())
  const buckets = new Map<string, number>()
  events.forEach((e) => {
    const k = dayKey(e.at)
    const w = e.t === 'quiz' ? (e.n ?? 1) : 1
    buckets.set(k, (buckets.get(k) ?? 0) + w)
  })
  const out: DayCount[] = []
  for (let i = n - 1; i >= 0; i--) {
    const ts = today - i * DAY
    const d = new Date(ts)
    out.push({
      day: dayKey(ts),
      weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
      date: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      count: buckets.get(dayKey(ts)) ?? 0,
    })
  }
  return out
}

export interface RecentGroup {
  subject: string
  day: string
  /** "Today" | "Yesterday" | "Mon 8 Sep" */
  label: string
  known: number
  learning: number
  quizQ: number
  quizCorrect: number
  exam: number
  /** newest timestamp in the group */
  at: number
}

/** Collapse raw events into per-day-per-subject sessions, newest first. */
export function recentGroups(events: ActivityEvent[], limit = 6): RecentGroup[] {
  const today = dayKey(Date.now())
  const yesterday = dayKey(Date.now() - DAY)
  const map = new Map<string, RecentGroup>()
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    const day = dayKey(e.at)
    const key = `${day}|${e.s}`
    let g = map.get(key)
    if (!g) {
      if (map.size >= limit) continue
      const label =
        day === today
          ? 'Today'
          : day === yesterday
            ? 'Yesterday'
            : new Date(e.at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
      g = { subject: e.s, day, label, known: 0, learning: 0, quizQ: 0, quizCorrect: 0, exam: 0, at: e.at }
      map.set(key, g)
    }
    if (e.t === 'known') g.known++
    else if (e.t === 'learning') g.learning++
    else if (e.t === 'quiz') {
      g.quizQ += e.n ?? 0
      g.quizCorrect += e.k ?? 0
    } else if (e.t === 'exam') g.exam++
  }
  return [...map.values()].sort((a, b) => b.at - a.at)
}

/** Most recent flashcard event, for "continue where you left off". */
export function lastStudied(events: ActivityEvent[]): { subject: string; topic?: string; at: number } | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    if (e.t === 'known' || e.t === 'learning') return { subject: e.s, topic: e.c, at: e.at }
  }
  const last = events[events.length - 1]
  return last ? { subject: last.s, at: last.at } : null
}

/** Compact relative time: "just now", "12m ago", "3h ago", "2d ago". */
export function relTime(at: number): string {
  const s = Math.floor((Date.now() - at) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d === 1 ? 'yesterday' : `${d}d ago`
}
