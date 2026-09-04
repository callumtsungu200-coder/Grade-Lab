// CSS mockups of real Grade Lab screens, shown inside a phone frame on the
// landing. The screens use the app's dark UI so they read as the real product.

function CardsScreen() {
  return (
    <div className="pm-screen">
      <div className="pm-appbar"><span className="pm-dot g" /> Biology <span className="pm-spec">AQA</span></div>
      <div className="pm-card">
        <span className="pm-tag">Cell biology · Grade 7</span>
        <p className="pm-q">What is the function of mitochondria?</p>
        <span className="pm-hint">Tap to reveal answer</span>
      </div>
      <div className="pm-markrow">
        <span className="pm-mark learn">Still learning</span>
        <span className="pm-mark know">I know this</span>
      </div>
    </div>
  )
}

function QuizScreen() {
  return (
    <div className="pm-screen">
      <div className="pm-quizhead"><span>Question 3 of 10</span><span className="pm-score">Score 2</span></div>
      <div className="pm-qbar"><span style={{ width: "30%" }} /></div>
      <p className="pm-q sm">Which gas do plants absorb for photosynthesis?</p>
      <div className="pm-opts">
        <span className="pm-opt">Oxygen</span>
        <span className="pm-opt correct">Carbon dioxide ✓</span>
        <span className="pm-opt">Nitrogen</span>
        <span className="pm-opt">Hydrogen</span>
      </div>
    </div>
  )
}

function ProfileScreen() {
  return (
    <div className="pm-screen">
      <div className="pm-hero">
        <span className="pm-av">🦉</span>
        <div>
          <p className="pm-name">Harmony</p>
          <span className="pm-rank">🥇 Gold Burner</span>
        </div>
        <span className="pm-gems">💎 1,240</span>
      </div>
      <div className="pm-lvlrow"><span>Lv 12</span><div className="pm-qbar"><span style={{ width: "68%" }} /></div></div>
      <div className="pm-badges"><span>✨</span><span>💯</span><span>🎯</span><span>⚡</span><span className="dim">🔒</span></div>
      <div className="pm-lb">
        <div className="pm-lbrow"><b>🥇</b><span>Aisha</span><em>18,420</em></div>
        <div className="pm-lbrow me"><b>🥈</b><span>Harmony</span><em>16,900</em></div>
      </div>
    </div>
  )
}

const SCREENS = { cards: CardsScreen, quiz: QuizScreen, profile: ProfileScreen }

export default function PhoneMock({ screen = "cards", className = "" }) {
  const Screen = SCREENS[screen] || CardsScreen
  return (
    <div className={"phone " + className}>
      <div className="phone-notch" />
      <div className="phone-inner">
        <Screen />
      </div>
    </div>
  )
}
