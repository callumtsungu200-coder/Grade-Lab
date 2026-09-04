import { useState } from 'react'
import { motion } from 'framer-motion'
import { checkPassword } from '../auth.js'

export default function Gate({ onUnlock, onDemo }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (checkPassword(value)) {
      onUnlock()
    } else {
      setError(true)
      setValue('')
    }
  }

  return (
    <div className="gate">
      <div className="bg-glow" aria-hidden="true" />
      <div className="bg-noise" aria-hidden="true" />
      <motion.div
        className="gate-card"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <div className="gate-mark">🎴</div>
        <h1 className="gate-title">GCSE Flashcards</h1>
        <p className="gate-sub">Enter the password for full access, or explore a read-only demo.</p>

        <form onSubmit={submit} className="gate-form">
          <input
            type="password"
            className={'gate-input' + (error ? ' err' : '')}
            placeholder="Password"
            value={value}
            autoFocus
            onChange={(e) => {
              setValue(e.target.value)
              setError(false)
            }}
          />
          <motion.button type="submit" className="btn big primary" whileTap={{ scale: 0.99 }}>
            Unlock →
          </motion.button>
        </form>

        {error && <p className="gate-error">Incorrect password. Try again or explore the demo.</p>}

        <button className="gate-demo" onClick={onDemo}>
          Explore the demo (view only)
        </button>
      </motion.div>
    </div>
  )
}
