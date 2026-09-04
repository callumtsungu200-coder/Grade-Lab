import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GRADES, questionSections, questionId } from "../questions/index.js"

const markKey = (subjectId) => `gradelab-exam-${subjectId}-v1`

function loadMarks(subjectId) {
  try {
    return JSON.parse(localStorage.getItem(markKey(subjectId))) || {}
  } catch {
    return {}
  }
}

// One exam question with reveal + self-mark.
function QuestionCard({ id, q, mark, onMark }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={"q-card" + (mark ? " marked-" + mark : "")}>
      <div className="q-top">
        <span className="q-grade">Grade {q.g}</span>
        <span className="q-marks">{q.marks} {q.marks === 1 ? "mark" : "marks"}</span>
        {mark && <span className={"q-result " + mark}>{mark === "full" ? "✓ Full" : mark === "part" ? "◐ Partial" : "✗ Not yet"}</span>}
      </div>
      <p className="q-text">{q.q}</p>

      {!open ? (
        <button className="q-reveal" onClick={() => setOpen(true)}>Reveal mark scheme</button>
      ) : (
        <div className="q-scheme">
          <p className="q-scheme-title">Mark scheme ({q.marks})</p>
          <ul>
            {q.scheme.map((pt, i) => <li key={i}>{pt}</li>)}
          </ul>
          <p className="q-model-title">Model answer</p>
          <p className="q-model">{q.answer}</p>

          <p className="q-selfmark-title">How did you do?</p>
          <div className="q-selfmark">
            <button className="sm sm-full" onClick={() => onMark(id, "full")}>Full marks</button>
            <button className="sm sm-part" onClick={() => onMark(id, "part")}>Partial</button>
            <button className="sm sm-none" onClick={() => onMark(id, "none")}>Not yet</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function QuestionsView({ subjectId }) {
  const sections = useMemo(() => questionSections(subjectId), [subjectId])
  const sectionNames = useMemo(() => Object.keys(sections), [sections])
  const [section, setSection] = useState(sectionNames[0] || null)
  const [grade, setGrade] = useState(4)
  const [marks, setMarks] = useState(() => loadMarks(subjectId))

  // Reset to this subject's first section when the subject changes.
  useEffect(() => {
    setSection(sectionNames[0] || null)
    setMarks(loadMarks(subjectId))
  }, [subjectId, sectionNames])

  const setMark = (id, value) => {
    setMarks((m) => {
      const next = { ...m, [id]: value }
      try {
        localStorage.setItem(markKey(subjectId), JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  if (!section) {
    return <p className="admin-empty">Exam questions for this subject are coming soon.</p>
  }

  const all = sections[section] || []
  const forGrade = all.map((q, i) => ({ q, id: questionId(section, i, q) })).filter((x) => x.q.g === grade)
  const gradeCount = (g) => all.filter((q) => q.g === g).length
  const done = forGrade.filter((x) => marks[x.id]).length
  const full = forGrade.filter((x) => marks[x.id] === "full").length

  return (
    <div className="questions">
      <div className="q-banner">
        <span>✍️ Write your answer, then <strong>reveal the mark scheme</strong> and mark yourself.</span>
        <span className="q-soon">🤖 AI auto-marking coming soon</span>
      </div>

      {/* Section chooser */}
      <div className="q-sections">
        {sectionNames.map((name) => (
          <button
            key={name}
            className={"q-section-btn" + (name === section ? " active" : "")}
            onClick={() => setSection(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Grade tabs */}
      <div className="q-grades" role="tablist">
        {GRADES.map((g) => (
          <button
            key={g}
            className={"q-grade-tab" + (g === grade ? " active" : "")}
            onClick={() => setGrade(g)}
          >
            Grade {g}
            <span className="q-grade-count">{gradeCount(g)}</span>
          </button>
        ))}
      </div>

      <div className="q-progress-line">
        <strong>{forGrade.length}</strong> questions · marked <strong>{done}</strong> · full marks on <strong>{full}</strong>
      </div>

      <AnimatePresence mode="popLayout">
        <motion.div
          key={section + grade}
          className="q-list"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          {forGrade.map(({ q, id }) => (
            <QuestionCard key={id} id={id} q={q} mark={marks[id]} onMark={setMark} />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
