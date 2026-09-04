import { useEffect, useState } from "react"
import { motion } from "framer-motion"

const DURATION = 10 // seconds on screen before it animates out

export default function WelcomeSplash({ name, quote, onDone }) {
  const [left, setLeft] = useState(DURATION)

  useEffect(() => {
    const tick = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    const done = setTimeout(onDone, DURATION * 1000)
    return () => {
      clearInterval(tick)
      clearTimeout(done)
    }
  }, [onDone])

  return (
    <motion.div
      className="welcome"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.06, filter: "blur(6px)" }}
      transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <div className="bg-glow" aria-hidden="true" />
      <div className="bg-noise" aria-hidden="true" />

      <motion.div
        className="welcome-inner"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <motion.p
          className="welcome-hello"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          Hello{name ? "," : ""}
        </motion.p>
        <motion.h1
          className="welcome-name"
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
        >
          {name || "there"} 👋
        </motion.h1>

        <motion.blockquote
          className="welcome-quote"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          “{quote}”
        </motion.blockquote>

        <motion.button
          className="welcome-skip"
          onClick={onDone}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          whileTap={{ scale: 0.97 }}
        >
          Enter Grade Lab →<span className="welcome-count">{left}</span>
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
