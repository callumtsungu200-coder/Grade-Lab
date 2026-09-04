import { useEffect, useState } from "react"
import { fetchLeaderboard, isSupabaseConfigured } from "../supabaseClient.js"
import { computeGame } from "../gamification.js"

export default function Leaderboard({ user, displayName, onExit }) {
  const [rows, setRows] = useState(null) // null = loading
  const [error, setError] = useState(null)
  const me = computeGame()

  useEffect(() => {
    let alive = true
    if (!isSupabaseConfigured || !user) {
      setRows([])
      setError("offline")
      return
    }
    fetchLeaderboard(50).then((res) => {
      if (!alive) return
      if (res.error) setError(res.error)
      setRows(res.data)
    })
    return () => {
      alive = false
    }
  }, [user])

  const myId = user?.id
  const myRank = rows && myId ? rows.findIndex((r) => r.id === myId) + 1 : 0
  const medal = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`)

  return (
    <div className="admin lb">
      <div className="admin-inner">
        <header className="admin-head">
          <div>
            <h1 className="admin-title">🏆 Leaderboard</h1>
            <p className="admin-sub">Ranked by XP earned across every subject. Study more to climb.</p>
          </div>
          <button className="btn" onClick={onExit}>← Back</button>
        </header>

        {/* Your standing */}
        <div className="lb-you-card">
          <span className="lb-you-rank">{me.rank.icon}</span>
          <div className="lb-you-main">
            <p className="lb-you-name">{displayName}</p>
            <p className="lb-you-sub">
              Level {me.level} · {me.rank.name}
              {myRank > 0 && <> · #{myRank} worldwide</>}
            </p>
          </div>
          <span className="lb-you-xp">{me.xp.toLocaleString()} XP</span>
        </div>

        {rows === null && <p className="admin-empty">Loading the board…</p>}

        {rows && rows.length > 0 && (
          <div className="lb-list">
            {rows.map((r, i) => (
              <div key={r.id} className={"lb-row" + (r.id === myId ? " me" : "")}>
                <span className={"lb-pos" + (i < 3 ? " medal" : "")}>{medal(i)}</span>
                <span className="lb-name">{r.name || "Anonymous"}</span>
                <span className="lb-rankname">{r.rank || ""}</span>
                <span className="lb-lvl">Lv {r.level ?? 1}</span>
                <span className="lb-xp">{(r.xp ?? 0).toLocaleString()} XP</span>
              </div>
            ))}
          </div>
        )}

        {rows && rows.length === 0 && (
          <div className="lb-empty">
            {error === "offline" ? (
              <p>Sign in with an account to appear on the global leaderboard and see other students.</p>
            ) : error ? (
              <>
                <p>The leaderboard isn't switched on yet.</p>
                <p className="lb-empty-sub">
                  One-time setup: run <code>supabase-leaderboard.sql</code> in your Supabase SQL editor,
                  then everyone's scores show up here automatically.
                </p>
              </>
            ) : (
              <p>No one's on the board yet — you could be first! Keep studying to earn XP.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
