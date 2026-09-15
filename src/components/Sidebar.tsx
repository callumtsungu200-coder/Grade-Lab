import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
// @ts-expect-error — Logo is an untyped JS file; migrate to TS later.
import Logo from './Logo.jsx'
import SubjectIcon from './SubjectIcon'

/* ---------------------------------------------------------------- Types */

export type ContentMode = 'cards' | 'quiz' | 'exam' | 'papers'
export type View = 'topics' | 'study'
export type Page = 'dashboard' | 'subject'

/* ---------------------------------------------------------- Nav icons */
// Monochrome 16px line icons, matching SubjectIcon's stroke style.

const svgProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}
const IconHome = () => (
  <svg {...svgProps}>
    <path d="M3 11 12 4l9 7" />
    <path d="M5 10v10h14V10" />
    <path d="M10 20v-6h4v6" />
  </svg>
)
const IconCards = () => (
  <svg {...svgProps}>
    <rect x="3" y="7" width="13" height="13" rx="2" />
    <path d="M8 4h10a2 2 0 0 1 2 2v11" />
  </svg>
)
const IconQuiz = () => (
  <svg {...svgProps}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)
const IconExam = () => (
  <svg {...svgProps}>
    <path d="M7 3h7l5 5v13H7z" />
    <path d="M14 3v5h5" />
    <path d="M10 13h6M10 17h6" />
  </svg>
)

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
  page: Page
  onGoDashboard: () => void
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

const IconPapers = () => (
  <svg {...svgProps}>
    <path d="M8 3h8l4 4v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M16 3v4h4" />
    <path d="M4 8v11a2 2 0 0 0 2 2h10" />
  </svg>
)

const MODES: { id: ContentMode; label: string; icon: ReactNode }[] = [
  { id: 'cards', label: 'Flashcards', icon: <IconCards /> },
  { id: 'quiz', label: 'Quizzes', icon: <IconQuiz /> },
  { id: 'exam', label: 'Exam Questions', icon: <IconExam /> },
  { id: 'papers', label: 'Past Papers', icon: <IconPapers /> },
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
  page,
  onGoDashboard,
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

        {/* Top-level: dashboard */}
        <nav className="sb-nav sb-top" aria-label="Main">
          <button
            className={'sb-nav-item' + (page === 'dashboard' ? ' active' : '')}
            onClick={() => {
              onGoDashboard()
              onClose()
            }}
          >
            {page === 'dashboard' && (
              <motion.span
                layoutId="sb-active-pill"
                className="sb-active-pill"
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
            <span className="sb-nav-icon" aria-hidden="true">
              <IconHome />
            </span>
            <span className="sb-nav-label">Dashboard</span>
          </button>
        </nav>

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
              const active = page === 'subject' && contentMode === m.id
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
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
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
                  {active && (
                    <motion.span
                      layoutId="sb-subject-pill"
                      className="sb-subject-pill"
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
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
