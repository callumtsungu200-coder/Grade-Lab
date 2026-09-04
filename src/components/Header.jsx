import { motion } from 'framer-motion'
import Logo from './Logo.jsx'

function Ring({ pct }) {
  return (
    <div className="ring" style={{ '--pct': pct }}>
      <span>{pct}%</span>
    </div>
  )
}

export default function Header({ subject, subjectOrder, subjects, onSwitch, stats, deckCount, onProfile, profileName, game, theme, onToggleTheme }) {
  const initial = (profileName || 'You').trim().charAt(0).toUpperCase()
  const avatar = game?.avatar || null
  return (
    <header className="topbar">
      <div className="brand">
        <Logo />
        <div className="brand-text">
          <p className="sub">
            {subject.name}
            <span className="dotsep">·</span>
            <span className="spec">{subject.spec}</span>
            <span className="dotsep">·</span>
            {deckCount} cards
          </p>
        </div>
      </div>

      <nav className="subject-switch" aria-label="Choose subject">
        {subjectOrder.map((id) => {
          const s = subjects[id]
          const active = id === subject.id
          return (
            <button
              key={id}
              className={'subject-btn' + (active ? ' active' : '')}
              onClick={() => onSwitch(id)}
              data-subject-btn={id}
            >
              {active && (
                <motion.span
                  layoutId="activePill"
                  className="active-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="sb-emoji">{s.icon}</span>
              <span className="sb-text">
                <span className="sb-name">{s.name}</span>
                {s.spec && <span className="sb-board">{s.spec.split(' ')[0]}</span>}
              </span>
            </button>
          )
        })}
      </nav>

      <div className="topbar-right">
        {onToggleTheme && (
          <button className="theme-btn" onClick={onToggleTheme} title="Switch light / dark" aria-label="Switch light or dark">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        )}
        {game && (
          <button className="game-pills" onClick={onProfile} title="Your profile, badges & shop">
            <span className="lvl-pill">Lv {game.level}</span>
            <span className="coin-pill">{game.currencyIcon} {game.balance.toLocaleString()}</span>
          </button>
        )}
        {onProfile && (
          <button className="profile-btn" onClick={onProfile} title="Your profile">
            <span className="profile-btn-av">{avatar || initial}</span>
            <span className="profile-btn-label">Profile</span>
          </button>
        )}
        <div className="overall">
          <Ring pct={stats.pct} />
          <div className="overall-legend">
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
      </div>
    </header>
  )
}
