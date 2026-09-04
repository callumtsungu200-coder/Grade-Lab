import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { setSetting } from "../settings.js"

const CHEERS = [
  "Brilliant work!",
  "You're on fire! 🔥",
  "Smashed it!",
  "Grade 9 energy ⚡",
  "Keep this up!",
  "Absolute legend!",
  "That's how it's done!",
]

const CONFETTI_COLORS = ["#3ddc84", "#ffd54a", "#ff6b6b", "#4dabf7", "#b197fc", "#ff922b", "#f783ac"]

export default function DeckComplete({ count = 0, onClose }) {
  const [hide, setHide] = useState(false)

  // A fixed set of confetti pieces with randomised look, built once.
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.4 + Math.random() * 1.8,
        size: 7 + Math.random() * 8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.random() * 360,
        round: Math.random() > 0.5,
      })),
    [],
  )

  const cheer = useMemo(() => CHEERS[Math.floor(Math.random() * CHEERS.length)], [])

  const close = () => {
    if (hide) setSetting("deckCelebration", false)
    onClose()
  }

  return (
    <motion.div
      className="deck-done"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={close}
    >
      {/* Confetti */}
      <div className="dd-confetti" aria-hidden="true">
        {pieces.map((p) => (
          <span
            key={p.id}
            className={"dd-piece" + (p.round ? " round" : "")}
            style={{
              left: p.left + "%",
              width: p.size,
              height: p.size,
              background: p.color,
              animationDelay: p.delay + "s",
              animationDuration: p.duration + "s",
              transform: `rotate(${p.rotate}deg)`,
            }}
          />
        ))}
      </div>

      <motion.div
        className="dd-card"
        initial={{ scale: 0.7, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          className="dd-emoji"
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.15 }}
        >
          🎉
        </motion.div>

        <h1 className="dd-title">Deck complete!</h1>
        <p className="dd-cheer">{cheer}</p>
        {count > 0 && (
          <p className="dd-stat">
            You reviewed <b>{count}</b> {count === 1 ? "card" : "cards"} this round.
          </p>
        )}

        <button className="btn big primary dd-continue" onClick={close}>
          Keep going →
        </button>

        <label className="dd-hide">
          <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} />
          <span>Don't show this again <em>(you can turn it back on in your profile settings)</em></span>
        </label>

        <p className="dd-skip">Tap anywhere to skip</p>
      </motion.div>
    </motion.div>
  )
}
