import { useEffect, useMemo, useState } from 'react'
import { MOCK_SECTIONS, type MockSection } from '../mockTopics'

const TICKS_KEY = 'gradelab-mock-ticks'

function loadTicks(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(TICKS_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export interface MockTopicsViewProps {
  subjectName: string
  subjectSpec: string
  allCards: { id: string }[]
  onStudy: (title: string, cards: { id: string }[]) => void
}

/** Personal revision checklist for a mock exam. Ticks are saved on this device. */
export default function MockTopicsView({ subjectName, subjectSpec, allCards, onStudy }: MockTopicsViewProps) {
  const [ticks, setTicks] = useState<string[]>(loadTicks)

  useEffect(() => {
    try {
      localStorage.setItem(TICKS_KEY, JSON.stringify(ticks))
    } catch {
      /* storage blocked: ticks just last for this visit */
    }
  }, [ticks])

  const toggle = (key: string) =>
    setTicks((t) => (t.includes(key) ? t.filter((k) => k !== key) : [...t, key]))

  const total = useMemo(() => MOCK_SECTIONS.reduce((n, s) => n + s.points.length, 0), [])
  const done = MOCK_SECTIONS.reduce(
    (n, s) => n + s.points.filter((p) => ticks.includes(`${s.id}:${p.id}`)).length,
    0,
  )

  const cardsFor = (s: MockSection) => {
    const wanted = new Set(s.cards)
    return allCards.filter((c) => wanted.has(c.id))
  }

  return (
    <section className="mock">
      <header className="mock-head">
        <p className="mock-kicker">{subjectName} · {subjectSpec}</p>
        <h1 className="mock-title">Your PPE mock topics</h1>
        <p className="mock-count">
          {done} of {total} topics ticked off
        </p>
        <div className="progress-line">
          <div className="progress-fill" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </header>

      {MOCK_SECTIONS.map((s) => {
        const cards = cardsFor(s)
        return (
          <article className="mock-section" key={s.id}>
            <div className="mock-section-head">
              <h2 className="mock-section-title">{s.title}</h2>
              <button className="btn" onClick={() => onStudy(s.title, cards)}>
                Flashcards ({cards.length})
              </button>
            </div>
            <ul className="mock-points">
              {s.points.map((p) => {
                const key = `${s.id}:${p.id}`
                return (
                  <li key={key}>
                    <label className="mock-point">
                      <input type="checkbox" checked={ticks.includes(key)} onChange={() => toggle(key)} />
                      <span>
                        {p.text}
                        {p.sub && (
                          <span className="mock-sub">
                            {p.sub.map((item) => (
                              <span className="mock-chip" key={item}>{item}</span>
                            ))}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </article>
        )
      })}
    </section>
  )
}
