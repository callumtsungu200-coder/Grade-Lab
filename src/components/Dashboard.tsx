import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import SubjectIcon from './SubjectIcon'
import { AnimatedNumber } from '../ui/motion'
import type { Subject, ContentMode } from './Sidebar'
// @ts-expect-error — untyped JS module
import { flattenCards } from '../subjects.js'
import {
  loadActivity,
  streakDays,
  lastNDaysCounts,
  recentGroups,
  lastStudied,
  relTime,
} from '../activity'

/* ---------------------------------------------------------------- Types */

type Status = 'known' | 'learning'

export interface DashboardGame {
  level: number
  rank: { name: string; icon: string }
  xp: number
  balance: number
  levelProgress: number
}

export interface DashboardProps {
  displayName: string
  subjectOrder: string[]
  subjects: Record<string, Subject>
  progressBySubject: Record<string, Record<string, Status>>
  game: DashboardGame
  currencyIcon: string
  currentSubjectId: string
  readOnly: boolean
  /** bump to force a re-read of the activity log */
  activityTick: number
  onOpenSubject: (id: string) => void
  onQuickAction: (mode: ContentMode, subjectId?: string) => void
  /** cards due for spaced-repetition review today, per subject */
  dueBySubject?: Record<string, number>
  onReviewDue?: (subjectId: string) => void
}

interface SubjectSummary {
  id: string
  name: string
  board: string
  total: number
  known: number
  learning: number
  pct: number
}

/* -------------------------------------------------------------- Helpers */

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function fmt(n: number): string {
  return n.toLocaleString()
}

/* ------------------------------------------------------------ Component */

export default function Dashboard({
  displayName,
  subjectOrder,
  subjects,
  progressBySubject,
  game,
  currencyIcon,
  currentSubjectId,
  readOnly,
  activityTick,
  onOpenSubject,
  onQuickAction,
  dueBySubject = {},
  onReviewDue,
}: DashboardProps) {
  const events = useMemo(() => loadActivity(), [activityTick])

  const summaries = useMemo<SubjectSummary[]>(() => {
    return subjectOrder
      .map((id) => {
        const s = subjects[id]
        if (!s) return null
        const cards: { id: string }[] = flattenCards(s)
        const prog = progressBySubject[id] || {}
        let known = 0
        let learning = 0
        cards.forEach((c) => {
          const v = prog[c.id]
          if (v === 'known') known++
          else if (v === 'learning') learning++
        })
        const total = cards.length
        return {
          id,
          name: s.name,
          board: (s.spec || '').split(' ')[0],
          total,
          known,
          learning,
          pct: total ? Math.round((known / total) * 100) : 0,
        }
      })
      .filter((x): x is SubjectSummary => !!x)
  }, [subjectOrder, subjects, progressBySubject])

  const overall = useMemo(() => {
    const total = summaries.reduce((a, s) => a + s.total, 0)
    const known = summaries.reduce((a, s) => a + s.known, 0)
    const learning = summaries.reduce((a, s) => a + s.learning, 0)
    return { total, known, learning, pct: total ? Math.round((known / total) * 100) : 0 }
  }, [summaries])

  const streak = useMemo(() => streakDays(events), [events])
  const days = useMemo(() => lastNDaysCounts(events, 14), [events])
  const recent = useMemo(() => recentGroups(events, 6), [events])
  const last = useMemo(() => lastStudied(events), [events])
  const maxDay = Math.max(1, ...days.map((d) => d.count))
  const fortnightTotal = days.reduce((a, d) => a + d.count, 0)

  const attention = useMemo(() => {
    return [...summaries]
      .filter((s) => s.total > 0)
      .sort((a, b) => a.pct - b.pct || a.known - b.known)
      .slice(0, 3)
  }, [summaries])

  const dueTotal = Object.values(dueBySubject).reduce((a, n) => a + n, 0)
  const dueTop = useMemo(() => {
    let best: { id: string; count: number } | null = null
    for (const id of subjectOrder) {
      const n = dueBySubject[id] || 0
      if (n > 0 && (!best || n > best.count)) best = { id, count: n }
    }
    return best
  }, [dueBySubject, subjectOrder])

  const started = overall.known + overall.learning > 0
  const current = subjects[currentSubjectId]
  const lastSubject = last ? subjects[last.subject] : null
  const firstName = (displayName || 'there').split(' ')[0]

  return (
    <div className="dash" key={activityTick}>
      {/* ---------- Header ---------- */}
      <header className="dash-head">
        <h1 className="dash-title">
          {greeting()}, {firstName}.
        </h1>
        <p className="dash-sub">
          {started ? (
            <>
              You&apos;ve mastered <strong>{fmt(overall.known)}</strong> of {fmt(overall.total)} cards across{' '}
              {summaries.length} subjects
              {streak > 1 ? <> — and you&apos;re on a <strong>{streak}-day streak</strong>.</> : '.'}
              {dueTotal > 0 && (
                <>
                  {' '}
                  <strong>{fmt(dueTotal)}</strong> {dueTotal === 1 ? 'card is' : 'cards are'} due for review today.
                </>
              )}
            </>
          ) : (
            <>
              {fmt(overall.total)} cards across {summaries.length} subjects, ready when you are. Pick a subject below to
              start.
            </>
          )}
        </p>
        {readOnly && <p className="dash-note">Demo mode — progress on this page won&apos;t be saved.</p>}
      </header>

      {/* ---------- Stat strip ---------- */}
      <section className="dash-stats" aria-label="Overview">
        <div className="dash-stat">
          <span className="dash-stat-label">Overall mastery</span>
          <span className="dash-stat-value">
            <AnimatedNumber value={overall.pct} />%
          </span>
          <span className="dash-stat-sub">{fmt(overall.learning)} still learning</span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-label">Cards known</span>
          <span className="dash-stat-value">
            <AnimatedNumber value={overall.known} />
          </span>
          <span className="dash-stat-sub">of {fmt(overall.total)}</span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-label">Streak</span>
          <span className="dash-stat-value">
            <AnimatedNumber value={streak} />
            <span className="dash-stat-unit"> {streak === 1 ? 'day' : 'days'}</span>
          </span>
          <span className="dash-stat-sub">{fortnightTotal ? `${fmt(fortnightTotal)} in the last 14 days` : 'No activity yet'}</span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-label">Level</span>
          <span className="dash-stat-value">
            <AnimatedNumber value={game.level} />
          </span>
          <span className="dash-stat-sub">
            {game.rank.name} · {currencyIcon} {fmt(game.balance)}
          </span>
        </div>
      </section>

      {/* ---------- Middle: subjects + side column ---------- */}
      <div className="dash-grid">
        <section className="dash-section" aria-label="Subjects">
          <div className="dash-section-head">
            <h2 className="dash-section-title">Subjects</h2>
            <span className="dash-section-meta">{summaries.length} subjects</span>
          </div>
          <ul className="dash-subjects">
            {summaries.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={'dash-subject' + (s.id === currentSubjectId ? ' current' : '')}
                  onClick={() => onOpenSubject(s.id)}
                >
                  <span className="dash-subject-icon" aria-hidden="true">
                    <SubjectIcon subject={s.id} size={16} />
                  </span>
                  <span className="dash-subject-name">
                    <span className="dash-subject-label">{s.name}</span>
                    <span className="dash-subject-board">{s.board}</span>
                    {(dueBySubject[s.id] || 0) > 0 && (
                      <span className="dash-subject-due">{fmt(dueBySubject[s.id])} due</span>
                    )}
                  </span>
                  <span
                    className="dash-meter"
                    role="img"
                    aria-label={`${s.pct}% known, ${s.learning} learning, ${s.total - s.known - s.learning} unseen`}
                  >
                    <span className="dash-meter-known" style={{ width: `${(s.known / Math.max(1, s.total)) * 100}%` }} />
                    <span
                      className="dash-meter-learning"
                      style={{ width: `${(s.learning / Math.max(1, s.total)) * 100}%` }}
                    />
                  </span>
                  <span className="dash-subject-pct">{s.pct}%</span>
                  <span className="dash-subject-count">
                    {fmt(s.known)}<span className="dash-muted">/{fmt(s.total)}</span>
                  </span>
                  <span className="dash-subject-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="dash-side">
          {started && (
            <section className="dash-section" aria-label="Needs attention">
              <div className="dash-section-head">
                <h2 className="dash-section-title">Needs attention</h2>
              </div>
              <ul className="dash-attention">
                {attention.map((s) => (
                  <li key={s.id}>
                    <button type="button" className="dash-attention-row" onClick={() => onOpenSubject(s.id)}>
                      <span className="dash-attention-name">{s.name}</span>
                      <span className="dash-attention-pct">
                        {s.known + s.learning === 0 ? 'Not started' : `${s.pct}% known`}
                      </span>
                      <span className="dash-attention-go" aria-hidden="true">
                        {s.known + s.learning === 0 ? 'Start' : 'Continue'} →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="dash-section" aria-label="Recent activity">
            <div className="dash-section-head">
              <h2 className="dash-section-title">Recent activity</h2>
            </div>
            {recent.length ? (
              <ul className="dash-activity">
                {recent.map((g) => {
                  const subj = subjects[g.subject]
                  const parts: string[] = []
                  if (g.known) parts.push(`${g.known} known`)
                  if (g.learning) parts.push(`${g.learning} learning`)
                  if (g.quizQ) parts.push(`quiz ${g.quizCorrect}/${g.quizQ}`)
                  if (g.exam) parts.push(`${g.exam} exam ${g.exam === 1 ? 'question' : 'questions'}`)
                  return (
                    <li key={`${g.day}|${g.subject}`} className="dash-activity-row">
                      <span className="dash-activity-icon" aria-hidden="true">
                        <SubjectIcon subject={g.subject} size={14} />
                      </span>
                      <span className="dash-activity-main">
                        <span className="dash-activity-subject">{subj?.name ?? g.subject}</span>
                        <span className="dash-activity-detail">{parts.join(' · ')}</span>
                      </span>
                      <span className="dash-activity-when">{g.label === 'Today' ? relTime(g.at) : g.label}</span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="dash-empty">Nothing yet. Your sessions will show up here.</p>
            )}
          </section>
        </div>
      </div>

      {/* ---------- Bottom: progress over time + quick actions ---------- */}
      <div className="dash-bottom">
        <section className="dash-section" aria-label="Progress over time">
          <div className="dash-section-head">
            <h2 className="dash-section-title">Cards reviewed</h2>
            {fortnightTotal > 0 && (
              <span className="dash-section-meta">Last 14 days · {fmt(fortnightTotal)} total</span>
            )}
          </div>
          {fortnightTotal > 0 && (
          <div className="dash-chart" role="list" aria-label="Cards reviewed per day, last 14 days">
            {days.map((d) => (
              <button
                key={d.day}
                type="button"
                role="listitem"
                className={'dash-bar' + (d.count === 0 ? ' empty' : '')}
                aria-label={`${d.weekday} ${d.date}: ${d.count} ${d.count === 1 ? 'card' : 'cards'}`}
                style={{ ['--h' as string]: `${(d.count / maxDay) * 100}%` } as CSSProperties}
              >
                <span className="dash-bar-fill" />
                <span className="dash-bar-label" aria-hidden="true">
                  {d.weekday.charAt(0)}
                </span>
                <span className="dash-tip" aria-hidden="true">
                  <strong>{d.count}</strong> {d.count === 1 ? 'card' : 'cards'}
                  <span className="dash-tip-date">
                    {d.weekday} {d.date}
                  </span>
                </span>
              </button>
            ))}
          </div>
          )}
          {fortnightTotal === 0 && <p className="dash-empty">Your daily progress chart appears here once you start.</p>}
        </section>

        <section className="dash-section" aria-label="Quick actions">
          <div className="dash-section-head">
            <h2 className="dash-section-title">Quick actions</h2>
            {current && <span className="dash-section-meta">{current.name}</span>}
          </div>
          <div className="dash-actions">
            {dueTop && onReviewDue && (
              <button type="button" className="btn big" onClick={() => onReviewDue(dueTop.id)}>
                Review {fmt(dueTop.count)} due {dueTop.count === 1 ? 'card' : 'cards'} · {subjects[dueTop.id]?.name}
                <span className="dash-action-sub">
                  {dueTotal > dueTop.count ? `${fmt(dueTotal)} due in total` : 'Spaced repetition'}
                </span>
              </button>
            )}
            {lastSubject && last && (
              <button
                type="button"
                className={dueTop ? 'btn dash-continue' : 'btn big'}
                onClick={() => onOpenSubject(last.subject)}
              >
                Continue {lastSubject.name}
                <span className="dash-action-sub">{relTime(last.at)}</span>
              </button>
            )}
            <div className="dash-actions-row">
              <button type="button" className="btn" onClick={() => onQuickAction('cards')}>
                Flashcards
              </button>
              <button type="button" className="btn" onClick={() => onQuickAction('quiz')}>
                Quick quiz
              </button>
              <button type="button" className="btn" onClick={() => onQuickAction('exam')}>
                Exam questions
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
