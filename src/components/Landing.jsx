import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import PhoneMock from "./PhoneMock.jsx"
import Logo from "./Logo.jsx"

const Brand = () => <Logo />


const THEME_KEY = "gradelab-landing-theme"

const IconCards = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="7" width="13" height="14" rx="2" /><path d="M8 3h9a2 2 0 0 1 2 2v12" />
  </svg>
)
const IconExam = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" /><path d="M14 2v6h6M8 13h8M8 17h5" />
  </svg>
)
const IconQuiz = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7" /><path d="M12 16.5h.01" />
  </svg>
)
const IconTrophy = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 20h6M12 15v5" />
  </svg>
)
const Sun = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}>
    <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)
const Moon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
)

const FEATURES = [
  { Icon: IconCards, title: "Flashcards with real depth", text: "2,800+ exam-board-specific cards, split into the same subtopics your spec uses — not vague summaries." },
  { Icon: IconExam, title: "Exam questions, graded 4–9", text: "Thousands of exam-style questions organised by grade, each with a mark scheme and a model answer." },
  { Icon: IconQuiz, title: "Auto-marked quizzes", text: "Quick multiple-choice quizzes on any topic, marked the moment you finish. Choose your length and go." },
]
const BOARDS = ["AQA", "Edexcel", "OCR", "Eduqas", "WJEC"]

const reveal = (d = 0) => ({
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  // amount:0.1 fires as soon as 10% of the element is on screen — more
  // forgiving than a fixed negative margin, and stops the second stock
  // image from getting stuck invisible if the viewport isn't tall enough.
  viewport: { once: true, amount: 0.1 },
  transition: { duration: 0.6, ease: [0.2, 0.7, 0.2, 1], delay: d },
})

export default function Landing({ onStart, onDemo }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || "light" } catch { return "light" }
  })
  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, theme) } catch { /* ignore */ }
  }, [theme])

  return (
    <div className="nland" data-nl-theme={theme}>
      <header className="nl-nav">
        <Brand />
        <div className="nl-nav-right">
          <button className="nl-theme" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} aria-label="Toggle light or dark" title="Switch theme">
            {theme === "dark" ? <Sun width="18" /> : <Moon width="18" />}
          </button>
          <button className="nl-link" onClick={onStart}>Log in</button>
          <button className="nl-btn" onClick={onStart}>Get started</button>
        </div>
      </header>

      {/* Hero */}
      <section className="nl-hero">
        <div className="nl-hero-copy">
          <motion.span className="nl-eyebrow" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>GCSE revision, done properly</motion.span>
          <motion.h1 className="nl-h1" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}>
            Everything you need to reach <em>grade 9</em>.
          </motion.h1>
          <motion.p className="nl-lead" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12 }}>
            Flashcards, exam-style questions and auto-marked quizzes across 11 GCSE subjects —
            built around your exam board, with progress that follows you everywhere.
          </motion.p>
          <motion.div className="nl-cta" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.19 }}>
            <button className="nl-btn lg" onClick={onStart}>Get started free</button>
            <button className="nl-btn ghost lg" onClick={onDemo}>Explore the demo</button>
          </motion.div>
          <motion.dl className="nl-stats" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.26 }}>
            <div><dt>11</dt><dd>subjects</dd></div>
            <div><dt>2,800+</dt><dd>flashcards</dd></div>
            <div><dt>3,800+</dt><dd>exam questions</dd></div>
          </motion.dl>
        </div>

        <motion.div className="nl-hero-stage" initial={{ opacity: 0, y: 46, rotate: -8 }} animate={{ opacity: 1, y: 0, rotate: -5 }} transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1], delay: 0.2 }}>
          <div className="nl-stage-glow" aria-hidden="true" />
          <div className="phone-float">
            <PhoneMock screen="cards" />
          </div>
          <div className="nl-media-chip">
            <span className="nl-chip-dot" />
            <div><strong>Progress saved</strong><span>synced to your account</span></div>
          </div>
        </motion.div>
      </section>

      {/* Board strip */}
      <div className="nl-boards">
        <span>Built for the real specifications</span>
        <div className="nl-board-list">{BOARDS.map((b) => <span key={b} className="nl-board">{b}</span>)}</div>
      </div>

      {/* Features */}
      <section className="nl-section">
        <motion.div className="nl-section-head" {...reveal()}>
          <h2>Three ways to learn each topic</h2>
          <p>Read it, test it, prove it — the same loop the best students use, for every subject.</p>
        </motion.div>
        <div className="nl-features">
          {FEATURES.map((f, i) => (
            <motion.div className="nl-feature" key={f.title} {...reveal(i * 0.08)}>
              <span className="nl-feature-ic"><f.Icon width="24" /></span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Screens showcase */}
      <section className="nl-showcase">
        <motion.div className="nl-section-head" {...reveal()}>
          <h2>See it in action</h2>
          <p>A focused, distraction-free app — the same on your phone and your laptop.</p>
        </motion.div>
        <div className="nl-screens">
          <motion.div className="nl-screen a" initial={{ opacity: 0, y: 60, rotate: -10 }} whileInView={{ opacity: 1, y: 0, rotate: -7 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}>
            <PhoneMock screen="cards" />
          </motion.div>
          <motion.div className="nl-screen b" initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1], delay: 0.1 }}>
            <PhoneMock screen="quiz" />
          </motion.div>
          <motion.div className="nl-screen c" initial={{ opacity: 0, y: 60, rotate: 10 }} whileInView={{ opacity: 1, y: 0, rotate: 7 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1], delay: 0.2 }}>
            <PhoneMock screen="profile" />
          </motion.div>
        </div>
      </section>

      {/* Split: make it yours */}
      <section className="nl-split">
        <motion.div className="nl-split-media" {...reveal()}>
          <img src="/img/student-bright.jpg" alt="A student revising at a laptop" loading="lazy" />
        </motion.div>
        <motion.div className="nl-split-copy" {...reveal(0.1)}>
          <h2>Revision that fits how you work</h2>
          <ul className="nl-checks">
            <li>Add your own flashcards to any subject</li>
            <li>Set your display to light or dark, your way</li>
            <li>Filter to just what you don't know yet</li>
            <li>Everything saves automatically to your account</li>
          </ul>
          <button className="nl-btn" onClick={onStart}>Create your free account</button>
        </motion.div>
      </section>

      {/* Motivation */}
      <section className="nl-split reverse">
        <motion.div className="nl-split-media" {...reveal()}>
          <img src="/img/student-focus.jpg" alt="A focused student studying with headphones" loading="lazy" />
        </motion.div>
        <motion.div className="nl-split-copy" {...reveal(0.1)}>
          <span className="nl-feature-ic solo"><IconTrophy width="24" /></span>
          <h2>Stay motivated, session after session</h2>
          <p className="nl-lead sm">
            Earn XP and Gems as you study, climb from Bronze Beaker to Diamond Scholar,
            unlock badges and see where you rank against other students.
          </p>
          <div className="nl-tags"><span>XP &amp; levels</span><span>Collectable badges</span><span>Item shop</span><span>Global leaderboard</span></div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="nl-final">
        <motion.h2 {...reveal()}>Start revising in under a minute.</motion.h2>
        <motion.p {...reveal(0.06)}>Free to start. No card details needed.</motion.p>
        <motion.div {...reveal(0.12)}><button className="nl-btn lg light" onClick={onStart}>Get started free</button></motion.div>
      </section>

      <footer className="nl-footer">
        <Brand />
        <span>© {new Date().getFullYear()} Grade Lab · GCSE revision</span>
      </footer>
    </div>
  )
}
