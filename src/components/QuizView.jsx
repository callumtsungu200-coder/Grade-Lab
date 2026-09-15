import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { buildQuiz, loadSeen, markSeen, clearSeen } from "../quiz.js"
import { quizReward } from "../gamification.js"
import { sounds, haptic, isSoundOn, setSoundOn, unlockAudio } from "../sounds"

const LENGTHS = [5, 10, 20, 30]

/* ------------------------------------------------------------------ icons */
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12 5 5L20 7" />
  </svg>
)
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)
const IconBolt = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M13 2 3 14h7l-1 8 10-12h-7z" />
  </svg>
)
const IconSound = ({ on }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 5 6 9H2v6h4l5 4z" />
    {on ? (
      <>
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.5 5.5a9 9 0 0 1 0 13" />
      </>
    ) : (
      <path d="m22 9-6 6M16 9l6 6" />
    )}
  </svg>
)

/* Animates a number from 0 to `target` when `active` flips true. */
function useCountUp(target, active, ms = 900) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) {
      setValue(0)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, active, ms])
  return value
}

export default function QuizView({ subject, cards, locked = false, onUnlock, onComplete }) {
  // phases: 'setup' | 'run' | 'results'
  const [phase, setPhase] = useState("setup")
  const [scope, setScope] = useState("all") // 'all' or a group name
  const [length, setLength] = useState(10)
  const [excludeSeen, setExcludeSeen] = useState(false)
  const [questions, setQuestions] = useState([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState([]) // { id, chosen, correct, isRight }
  const [picked, setPicked] = useState(null) // current selection (locks the question)
  const [soundOn, setSound] = useState(isSoundOn)

  const toggleSound = () => {
    const next = !soundOn
    setSound(next)
    setSoundOn(next)
    if (next) {
      unlockAudio()
      sounds.tap()
    }
  }

  // Map subtopic codes → section (group) so the user can scope by section.
  const groups = useMemo(() => {
    const g = []
    const codeToGroup = {}
    subject.topics.forEach((t) => {
      const grp = t.group || subject.name
      codeToGroup[t.code] = grp
      if (!g.includes(grp)) g.push(grp)
    })
    return { list: g, codeToGroup }
  }, [subject])

  const poolForScope = useMemo(() => {
    if (scope === "all") return cards
    return cards.filter((c) => (groups.codeToGroup[c.code] || subject.name) === scope)
  }, [scope, cards, groups, subject])

  const seenCount = useMemo(() => {
    const seen = loadSeen(subject.id)
    return poolForScope.filter((c) => seen.has(c.id)).length
  }, [poolForScope, subject.id, phase])

  const start = () => {
    const seen = excludeSeen ? loadSeen(subject.id) : null
    const qs = buildQuiz(poolForScope, length, { excludeIds: seen })
    if (!qs.length) return
    unlockAudio()
    sounds.tap()
    setQuestions(qs)
    setAnswers([])
    setIndex(0)
    setPicked(null)
    setPhase("run")
  }

  const retry = () => {
    sounds.tap()
    setAnswers([])
    setIndex(0)
    setPicked(null)
    setPhase("run")
  }

  const choose = (option) => {
    if (picked !== null) return
    const q = questions[index]
    const isRight = option === q.correct
    setPicked(option)
    setAnswers((a) => [...a, { id: q.id, chosen: option, correct: q.correct, isRight, q: q.q }])
    if (isRight) sounds.correct()
    else {
      sounds.wrong()
      haptic(30)
    }
  }

  const next = () => {
    if (index + 1 >= questions.length) {
      markSeen(subject.id, questions.map((q) => q.id))
      const correct = answers.filter((a) => a.isRight).length
      if (onComplete) onComplete(correct, answers.length)
      setPhase("results")
    } else {
      setIndex((i) => i + 1)
      setPicked(null)
    }
  }

  // Keyboard: 1–4 / A–D pick an option, Enter or → moves on.
  useEffect(() => {
    if (phase !== "run") return
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const q = questions[index]
      if (!q) return
      if (picked === null) {
        let i = -1
        if (/^[1-4]$/.test(e.key)) i = Number(e.key) - 1
        else if (/^[a-dA-D]$/.test(e.key)) i = e.key.toUpperCase().charCodeAt(0) - 65
        if (i >= 0 && i < q.options.length) {
          e.preventDefault()
          choose(q.options[i])
        }
      } else if (e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  // Results fanfare — once, when the results screen appears.
  const score = answers.filter((a) => a.isRight).length
  const total = answers.length
  const pct = total ? Math.round((score / total) * 100) : 0
  const playedRef = useRef(false)
  useEffect(() => {
    if (phase !== "results") {
      playedRef.current = false
      return
    }
    if (playedRef.current) return
    playedRef.current = true
    if (total > 0 && score === total) sounds.perfect()
    else sounds.complete()
  }, [phase, score, total])
  const shownPct = useCountUp(pct, phase === "results")

  if (locked) {
    return (
      <div className="quiz-lock">
        <span className="lock-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </span>
        <p className="lock-title">Quizzes are locked</p>
        <p className="lock-sub">Unlock full access to test yourself with auto-marked multiple-choice quizzes.</p>
        <button className="btn primary" onClick={() => onUnlock && onUnlock()}>Unlock full access →</button>
      </div>
    )
  }

  const soundButton = (
    <button
      type="button"
      className={"quiz-sound" + (soundOn ? "" : " off")}
      onClick={toggleSound}
      aria-pressed={soundOn}
      aria-label={soundOn ? "Sound on — turn off" : "Sound off — turn on"}
      title={soundOn ? "Sound on" : "Sound off"}
    >
      <IconSound on={soundOn} />
    </button>
  )

  // ---------------- SETUP ----------------
  if (phase === "setup") {
    const available = poolForScope.length
    return (
      <div className="quiz-setup">
        <div className="quiz-head">
          <div className="quiz-progress-row" style={{ display: "block" }}>
            <h2 className="quiz-h">Quick quiz</h2>
          </div>
          {soundButton}
        </div>
        <p className="quiz-sub">Multiple-choice questions, auto-marked. Pick your options and go.</p>

        <label className="quiz-label">Topic</label>
        <div className="quiz-chips">
          <button className={"quiz-chip" + (scope === "all" ? " active" : "")} onClick={() => setScope("all")}>
            All topics
          </button>
          {groups.list.map((g) => (
            <button key={g} className={"quiz-chip" + (scope === g ? " active" : "")} onClick={() => setScope(g)}>
              {g}
            </button>
          ))}
        </div>

        <label className="quiz-label">How many questions?</label>
        <div className="quiz-chips">
          {LENGTHS.map((n) => (
            <button
              key={n}
              className={"quiz-chip" + (length === n ? " active" : "")}
              onClick={() => setLength(n)}
              disabled={available < 1}
            >
              {n}
            </button>
          ))}
        </div>

        <label className="quiz-toggle">
          <input type="checkbox" checked={excludeSeen} onChange={(e) => setExcludeSeen(e.target.checked)} />
          <span>Skip questions I've already answered {seenCount > 0 && `(${seenCount} done)`}</span>
        </label>

        <p className="quiz-avail">{available} questions available in this topic.</p>

        <button className="btn big primary" onClick={start} disabled={available < 1}>
          Start quiz →
        </button>
        {seenCount > 0 && (
          <button className="gate-link quiz-reset" onClick={() => { clearSeen(subject.id); setPhase("setup") }}>
            Reset my answered history
          </button>
        )}
      </div>
    )
  }

  // ---------------- RESULTS ----------------
  if (phase === "results") {
    const reward = quizReward(score, total)
    const msg = reward.perfect
      ? "Perfect score."
      : pct >= 80
        ? "Excellent."
        : pct >= 50
          ? "Good effort — keep going."
          : "Keep practising — you'll get there."
    const R = 56
    const C = 2 * Math.PI * R
    const band = pct >= 80 ? "high" : pct >= 50 ? "mid" : "low"
    let best = 0
    let run = 0
    answers.forEach((a) => {
      run = a.isRight ? run + 1 : 0
      if (run > best) best = run
    })
    return (
      <div className="quiz-results">
        <div className="quiz-result-head">
          <div className={"quiz-ring " + band} role="img" aria-label={`${pct} percent`}>
            <svg viewBox="0 0 128 128">
              <circle className="quiz-ring-track" cx="64" cy="64" r={R} />
              <circle
                className="quiz-ring-fill"
                cx="64"
                cy="64"
                r={R}
                strokeDasharray={C}
                strokeDashoffset={C * (1 - shownPct / 100)}
              />
            </svg>
            <div className="quiz-ring-center">
              <span className="quiz-ring-pct">{shownPct}%</span>
              <span className="quiz-ring-sub">{score} / {total}</span>
            </div>
          </div>
          <div className="quiz-result-copy">
            <h2 className="quiz-h">Quiz complete</h2>
            <p className="quiz-msg">{msg}{best >= 3 ? ` Best streak: ${best} in a row.` : ""}</p>
          </div>
        </div>

        <div className="quiz-stats">
          <div className="quiz-stat">
            <span className="quiz-stat-val right">{score}</span>
            <span className="quiz-stat-label">Correct</span>
          </div>
          <div className="quiz-stat">
            <span className="quiz-stat-val wrong">{total - score}</span>
            <span className="quiz-stat-label">Wrong</span>
          </div>
          <div className="quiz-stat">
            <span className="quiz-stat-val xp">+{reward.xp}</span>
            <span className="quiz-stat-label">XP · +{reward.c} Gems</span>
          </div>
        </div>

        <div className="quiz-review">
          {answers.map((a, i) => (
            <div key={i} className={"quiz-review-item " + (a.isRight ? "right" : "wrong")}>
              <p className="qr-q">{i + 1}. {a.q}</p>
              {a.isRight ? (
                <p className="qr-a right">✓ {a.chosen}</p>
              ) : (
                <>
                  <p className="qr-a wrong">✗ Your answer: {a.chosen}</p>
                  <p className="qr-a right">✓ Correct: {a.correct}</p>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="quiz-result-actions">
          <button className="btn big primary" onClick={() => { sounds.tap(); setPhase("setup") }}>New quiz →</button>
          <button className="btn" onClick={retry}>Try these again</button>
        </div>
      </div>
    )
  }

  // ---------------- RUN ----------------
  const q = questions[index]
  const scoreSoFar = answers.filter((a) => a.isRight).length
  let streak = 0
  for (let i = answers.length - 1; i >= 0 && answers[i].isRight; i--) streak++
  return (
    <div className="quiz-run">
      <div className="quiz-head">
        <div className="quiz-progress-row">
          <span>Question {index + 1} of {questions.length}</span>
          <span className="quiz-score-so-far">Score: {scoreSoFar}</span>
        </div>
        {soundButton}
      </div>
      <div className="quiz-dots" aria-hidden="true">
        {questions.map((_, i) => {
          const a = answers[i]
          const cls = a ? (a.isRight ? " right" : " wrong") : i === index ? " current" : ""
          return <span key={i} className={"quiz-dot" + cls} />
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className="quiz-qcard"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          <div className="quiz-meta">
            {q.topicName && <span className="quiz-topic">{q.topicName}</span>}
            {streak >= 2 && (
              <span className="quiz-streak">
                <IconBolt /> {streak} in a row
              </span>
            )}
          </div>
          <p className="quiz-question">{q.q}</p>
          <div className="quiz-options">
            {q.options.map((opt, i) => {
              let cls = "quiz-option"
              let mark = null
              if (picked !== null) {
                if (opt === q.correct) {
                  cls += " correct just"
                  mark = <IconCheck />
                } else if (opt === picked) {
                  cls += " incorrect just"
                  mark = <IconX />
                } else cls += " dim"
              }
              return (
                <button key={i} className={cls} onClick={() => choose(opt)} disabled={picked !== null}>
                  <span className="quiz-opt-key" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                  <span className="quiz-opt-text">{opt}</span>
                  <span className="quiz-opt-mark">{mark}</span>
                </button>
              )
            })}
          </div>

          {picked !== null && (
            <button className="btn big primary quiz-next" onClick={next}>
              {index + 1 >= questions.length ? "See results →" : "Next →"}
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
