import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { buildQuiz, loadSeen, markSeen, clearSeen } from "../quiz.js"

const LENGTHS = [5, 10, 20, 30]

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
    setQuestions(qs)
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

  // ---------------- SETUP ----------------
  if (phase === "setup") {
    const available = poolForScope.length
    return (
      <div className="quiz-setup">
        <h2 className="quiz-h">Quick quiz</h2>
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
    const score = answers.filter((a) => a.isRight).length
    const total = answers.length
    const pct = total ? Math.round((score / total) * 100) : 0
    const msg = pct >= 80 ? "Excellent." : pct >= 50 ? "Good effort — keep going." : "Keep practising — you'll get there."
    return (
      <div className="quiz-results">
        <h2 className="quiz-h">Quiz complete</h2>
        <div className="quiz-score">
          <span className="quiz-score-num">{score}<small>/{total}</small></span>
          <span className="quiz-score-pct">{pct}%</span>
        </div>
        <p className="quiz-msg">{msg}</p>

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

        <button className="btn big primary" onClick={() => setPhase("setup")}>New quiz →</button>
      </div>
    )
  }

  // ---------------- RUN ----------------
  const q = questions[index]
  const scoreSoFar = answers.filter((a) => a.isRight).length
  return (
    <div className="quiz-run">
      <div className="quiz-progress-row">
        <span>Question {index + 1} of {questions.length}</span>
        <span className="quiz-score-so-far">Score: {scoreSoFar}</span>
      </div>
      <div className="quiz-progress">
        <span style={{ width: ((index) / questions.length) * 100 + "%" }} />
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
          {q.topicName && <span className="quiz-topic">{q.topicName}</span>}
          <p className="quiz-question">{q.q}</p>
          <div className="quiz-options">
            {q.options.map((opt, i) => {
              let cls = "quiz-option"
              if (picked !== null) {
                if (opt === q.correct) cls += " correct"
                else if (opt === picked) cls += " incorrect"
                else cls += " dim"
              }
              return (
                <button key={i} className={cls} onClick={() => choose(opt)} disabled={picked !== null}>
                  <span className="quiz-opt-key" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                  <span className="quiz-opt-text">{opt}</span>
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
