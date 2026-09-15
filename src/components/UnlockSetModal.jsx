import { motion } from 'framer-motion'
import { FREE_SET_LIMIT } from '../freeSets'

/* "Use a free set?" — shown the first time a free-plan user opens a deck,
   a quiz section or an exam-question section. Three states:
     - has sets left → confirm spending one on this set
     - none left     → upgrade prompt
     - premiumOnly   → things that aren't a single set (e.g. "Study all topics") */
export default function UnlockSetModal({ request, used, onConfirm, onUpgrade, onClose }) {
  const left = Math.max(0, FREE_SET_LIMIT - used)
  const kindLabel = request.kind === 'quiz' ? 'quiz section' : request.kind === 'exam' ? 'exam-question section' : 'flashcard deck'
  const none = left === 0
  const premiumOnly = !!request.premiumOnly

  return (
    <motion.div
      className="modal-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="modal-card unlock-set"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.99 }}
        transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="unlock-set-title"
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>

        {premiumOnly ? (
          <>
            <span className="unlock-eyebrow">Full access</span>
            <h2 id="unlock-set-title" className="unlock-title">{request.label} is part of full access</h2>
            <p className="unlock-sub">
              The free plan lets you unlock {FREE_SET_LIMIT} individual sets — a flashcard deck, a quiz section or an
              exam-question section. Full access opens every set in every subject, plus progress that syncs
              across your devices.
            </p>
            <div className="unlock-actions">
              <button className="btn big" onClick={onUpgrade}>See full access</button>
              <button className="btn ghost" onClick={onClose}>Not now</button>
            </div>
          </>
        ) : none ? (
          <>
            <span className="unlock-eyebrow">Free plan</span>
            <h2 id="unlock-set-title" className="unlock-title">You’ve used all {FREE_SET_LIMIT} free sets</h2>
            <p className="unlock-sub">
              The sets you’ve already unlocked stay yours. To open <strong>{request.label}</strong> and everything
              else, upgrade to full access.
            </p>
            <div className="unlock-actions">
              <button className="btn big" onClick={onUpgrade}>See full access</button>
              <button className="btn ghost" onClick={onClose}>Not now</button>
            </div>
          </>
        ) : (
          <>
            <span className="unlock-eyebrow">Free plan · {left} of {FREE_SET_LIMIT} sets left</span>
            <h2 id="unlock-set-title" className="unlock-title">Use a free set on this {kindLabel}?</h2>
            <p className="unlock-sub">
              <strong>{request.label}</strong> will stay unlocked on this device — flashcards, quizzes and exam
              questions for it, with your progress saved. You’ll have {left - 1} free {left - 1 === 1 ? 'set' : 'sets'}{' '}
              left after this.
            </p>
            <div className="unlock-meter" aria-hidden="true">
              {Array.from({ length: FREE_SET_LIMIT }, (_, i) => (
                <span key={i} className={'unlock-pip' + (i < used ? ' used' : i === used ? ' next' : '')} />
              ))}
            </div>
            <div className="unlock-actions">
              <button className="btn big" onClick={onConfirm}>Unlock this set</button>
              <button className="btn ghost" onClick={onUpgrade}>Get everything</button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
