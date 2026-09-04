import { motion } from 'framer-motion'

export default function Flashcard({ card, flipped, onFlip, subject, locked = false, onUnlock }) {
  const status = card.status // 'known' | 'learning' | undefined
  const tier = card.tier || ''
  // A user's own custom cards are never locked, even in demo.
  const answerLocked = locked && !card.custom
  return (
    <motion.div
      className="flashcard-wrap"
      initial={{ opacity: 0, scale: 0.97, x: 24 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.97, x: -24 }}
      transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <div className="card-halo" aria-hidden="true" />
      <button
        className={'flashcard' + (flipped ? ' flipped' : '')}
        onClick={onFlip}
        aria-label="Flashcard, click to flip"
      >
        <div className="flashcard-inner">
          <div className="face front">
            <div className="badges">
              {status === 'known' && <span className="badge status-known">Known</span>}
              {status === 'learning' && <span className="badge status-learning">Learning</span>}
              {tier.includes('HT') && <span className="badge tier-ht">Higher tier</span>}
              {subject.onlyCode !== 'NA' && tier.includes(subject.onlyCode) && (
                <span className="badge tier-co">{subject.onlyBadge}</span>
              )}
            </div>
            <p className="face-label">Question</p>
            <p className="face-text q">{card.q}</p>
            <p className="flip-hint">
              {answerLocked ? '🔒 Tap to reveal — answer locked' : 'Tap or press Space to flip'}
            </p>
          </div>
          <div className={'face back' + (answerLocked ? ' locked' : '')}>
            {answerLocked ? (
              <div className="lock-face" onClick={(e) => e.stopPropagation()}>
                <span className="lock-emoji">🔒</span>
                <p className="lock-title">Answer locked</p>
                <p className="lock-sub">Unlock full access to reveal every answer, save your progress and use exam questions.</p>
                <button className="btn primary lock-btn" onClick={() => onUnlock && onUnlock()}>
                  Unlock full access →
                </button>
              </div>
            ) : (
              <>
                <p className="face-label">Answer</p>
                <p className="face-text a">{card.a}</p>
                <p className="flip-hint">Tap to flip back</p>
              </>
            )}
          </div>
        </div>
      </button>
    </motion.div>
  )
}
