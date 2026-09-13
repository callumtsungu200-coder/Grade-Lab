import { AnimatePresence, motion } from 'framer-motion'
import Flashcard from './Flashcard.jsx'

export default function StudyView({
  subject,
  session,
  progress,
  flipped,
  setFlipped,
  mode,
  onChangeMode,
  onBack,
  onNext,
  onPrev,
  onMark,
  onShuffle,
  locked = false,
  onUnlock,
}) {
  const total = session.cards.length
  const card = total ? session.cards[Math.min(session.index, total - 1)] : null
  const topicName =
    session.topicCode === 'ALL'
      ? 'Every topic'
      : (subject.topics.find((t) => t.code === session.topicCode)?.name ?? '')
  const pillCode = session.topicCode === 'ALL' ? 'ALL' : session.topicCode

  const cardWithStatus = card ? { ...card, status: progress[card.id] } : null

  return (
    <section className="study">
      <div className="study-head">
        <button className="btn ghost" onClick={onBack}>
          ← Topics
        </button>
        <div className="study-title">
          <span className="pill">{pillCode}</span>
          <span className="study-topic-name">{topicName}</span>
        </div>
        <div className="study-tools">
          <select value={mode} onChange={(e) => onChangeMode(e.target.value)} aria-label="Filter cards">
            <option value="all">All cards</option>
            <option value="learning">Learning + new</option>
            <option value="unseen">Not seen only</option>
            <option value="known">Known only</option>
          </select>
          <button className="btn ghost icon" onClick={onShuffle} title="Shuffle" aria-label="Shuffle">
            ⤨
          </button>
        </div>
      </div>

      <div className="progress-line">
        <motion.div
          className="progress-fill"
          animate={{ width: total ? ((session.index + 1) / total) * 100 + '%' : '0%' }}
          transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
        />
      </div>
      <p className="counter">
        {total ? session.index + 1 : 0} <span>/</span> {total}
      </p>

      <div className="card-stage">
        <button className="nav-arrow" onClick={onPrev} aria-label="Previous card" disabled={!total || session.index === 0}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>

        <div className="card-slot">
          <AnimatePresence mode="wait" initial={false}>
            {cardWithStatus ? (
              <Flashcard
                key={cardWithStatus.id}
                card={cardWithStatus}
                subject={subject}
                flipped={flipped}
                onFlip={() => setFlipped((f) => !f)}
                locked={locked}
                onUnlock={onUnlock}
              />
            ) : (
              <motion.div
                key="empty"
                className="empty-card"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p className="empty-title">Nothing to show here</p>
                <p className="empty-sub">No cards match this filter. Try another filter or topic.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button className="nav-arrow" onClick={onNext} aria-label="Next card" disabled={!total || session.index >= total - 1}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="mark-row">
        <motion.button className="btn learning" onClick={() => onMark('learning')} whileTap={{ scale: 0.97 }} disabled={!total}>
          Still learning
        </motion.button>
        <motion.button className="btn known" onClick={() => onMark('known')} whileTap={{ scale: 0.97 }} disabled={!total}>
          I know this
        </motion.button>
      </div>

      <p className="kbd-hint">
        <kbd>Space</kbd> flip <span>·</span> <kbd>←</kbd> <kbd>→</kbd> move <span>·</span> <kbd>K</kbd> know <span>·</span> <kbd>J</kbd> learning
      </p>
    </section>
  )
}
