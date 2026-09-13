import { motion } from 'framer-motion'
// @ts-expect-error — Logo is an untyped JS file; migrate to TS later.
import Logo from './Logo.jsx'
import SubjectIcon from './SubjectIcon'

/* ---------------------------------------------------------------- Types */

export type ContentMode = 'cards' | 'quiz' | 'exam'
export type View = 'topics' | 'study'

export interface Subject {
  id: string
  name: string
  icon: string
  spec: string
  onlyCode?: string
  onlyBadge?: string
  onlyFilterLabel?: string
  topics: unknown[]
}

export interface Stats {
  pct: number
  known: number
  learning: number
  unseen: number
  total: number
}

export interface GameSummary {
  level: number
  balance: number
  currencyIcon: string
  avatar?: string | null
}

export interface SidebarProps {
  subject: Subject
  subjectOrder: string[]
  subjects: Record<string, Subject>
  onSwitch: (id: string) => void
  stats: Stats
  deckCount: number
  onProfile?: () => void
  profileName?: string
  game?: GameSummary | null
  contentMode: ContentMode
  onChangeContentMode: (m: ContentMode) => void
  view: View
  onGoTopics: () => void
  open: boolean
  onClose: () => void
}

/* -------------------------------------------------------------- Helpers */

function Ring({ pct }: { pct: number }) {
  return (
    <div className="sb-ring" style={{ ['--pct' as string]: pct } as React.CSSProperties}>
      <span>{pct}%</span>
    </div>
  )
}

const MODES: { id: ContentMode; label: string; icon: string }[] = [
  { id: 'cards', label: 'Flashcards', icon: '🎴' },
  { id: 'quiz', label: 'Quizzes', icon: '🧠' },
  { id: 'exam', label: 'Exam Questions', icon: '📝' },
]

/* ------------------------------------------------------------ Component */

/**
 * Save My Exams-inspired left sidebar. Owns subject switching, study-mode
 * navigation, overall progress ring, theme toggle and quick access to
 * profile / game pills. On mobile it renders as a slide-in drawer,
 * controlled by `open` + `onClose`.
 */
export default function Sidebar({
  subject,
  subjectOrder,
  subjects,
  onSwitch,
  stats,
  deckCount,
  onProfile,
  profileName,
  game,
  contentMode,
  onChangeContentMode,
  view,
  onGoTopics,
  open,
  onClose,
}: SidebarProps) {
  const initial = (profileName || 'You').trim().charAt(0).toUpperCase()
  const avatar = game?.avatar || null

  return (
    <>
      {open && <div className="sb-scrim" onClick={onClose} aria-hidden="true" />}

      <aside className={'sidebar' + (open ? ' open' : '')} aria-label="Main navigation">
        {/* Brand */}
        <div className="sb-brand">
          <Logo />
          <button
            className="sb-close"
            onClick={onClose}
            aria-label="Close menu"
            title="Close menu"
          >
            ×
          </button>
        </div>

        {/* Active subject + overall progress */}
        <div className="sb-active-subject" data-subj={subject.id}>
          <div className="sb-active-head">
            <span className="sb-active-icon" aria-hidden="true">
              <SubjectIcon subject={subject.id} size={22} />
            </span>
            <div className="sb-active-meta">
              <p className="sb-active-name">{subject.name}</p>
              <p className="sb-active-spec">
                {subject.spec}
                <span className="dotsep"> · </span>
                {deckCount} cards
              </p>
            </div>
            <Ring pct={stats.pct} />
          </div>
          <div className="sb-legend">
            <span>
              <i className="dot known" /> {stats.known}
            </span>
            <span>
              <i className="dot learning" /> {stats.learning}
            </span>
            <span>
              <i className="dot unseen" /> {stats.unseen}
            </span>
          </div>
        </div>

        {/* Study modes */}
        <div className="sb-section">
          <p className="sb-section-title">Study</p>
          <nav className="sb-nav" aria-label="Study modes">
            {MODES.map((m) => {
              const active = contentMode === m.id
              return (
                <button
                  key={m.id}
                  className={'sb-nav-item' + (active ? ' active' : '')}
                  onClick={() => {
                    onChangeContentMode(m.id)
                    // If we're mid-study, jump back to topics so the newly
                    // chosen mode has a clean slate.
                    if (view === 'study') onGoTopics()
                    onClose()
                  }}
                >
                  {active && (
                    <motion.span
                      layoutId="sb-active-pill"
                      className="sb-active-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="sb-nav-icon" aria-hidden="true">
                    {m.icon}
                  </span>
                  <span className="sb-nav-label">{m.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* All subjects */}
        <div className="sb-section sb-subjects">
          <p className="sb-section-title">Subjects</p>
          <nav className="sb-nav" aria-label="Choose subject">
            {subjectOrder.map((id) => {
              const s = subjects[id]
              if (!s) return null
              const active = id === subject.id
              return (
                <button
                  key={id}
                  className={'sb-subject' + (active ? ' active' : '')}
                  data-subj={id}
                  onClick={() => {
                    onSwitch(id)
                    onClose()
                  }}
                >
                  <span className="sb-subject-icon" aria-hidden="true">
                    <SubjectIcon subject={id} size={16} />
                  </span>
                  <span className="sb-subject-text">
                    <span className="sb-subject-name">{s.name}</span>
                    {s.spec && (
                      <span className="sb-subject-board">
                        {s.spec.split(' ')[0]}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Bottom: profile + game + theme */}
        <div className="sb-foot">
          {game && (
            <button
              className="sb-game"
              onClick={() => {
                onProfile?.()
                onClose()
              }}
              title="Your profile, badges & shop"
            >
              <span className="sb-lvl">Lv {game.level}</span>
              <span className="sb-coin">
                {game.currencyIcon} {game.balance.toLocaleString()}
              </span>
            </button>
          )}
          <div className="sb-foot-row">
            {onProfile && (
              <button
                className="sb-profile"
                onClick={() => {
                  onProfile()
                  onClose()
                }}
                title="Your profile"
              >
                <span className="sb-profile-av">{avatar || initial}</span>
                <span className="sb-profile-label">{profileName || 'Profile'}</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
