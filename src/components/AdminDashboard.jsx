import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { fetchAllProfiles, updateProfileAccess, deleteUser, updateUserDetails } from "../supabaseClient.js"
import { OWNER_EMAILS } from "../supabaseConfig.js"

// Password gate for the destructive "remove account" action. This is a
// convenience confirmation only — the real protection is that the database
// function refuses to delete unless you are signed in as the owner account.
const DELETE_PASSWORD = "callum2011"

// Access options shown in the per-user dropdown. Each maps to a paid flag + plan.
const OPTIONS = [
  { value: "free", label: "Free plan (5 sets)", paid: false, plan: "free" },
  { value: "monthly", label: "Monthly", paid: true, plan: "monthly" },
  { value: "annual", label: "Annual", paid: true, plan: "annual" },
  { value: "comp", label: "Full access, free (comp)", paid: true, plan: "comp" },
]

function currentValue(p) {
  if (!p.paid) return "free"
  return OPTIONS.some((o) => o.value === p.plan) ? p.plan : "comp"
}

function fullName(p) {
  const n = `${p.first_name || ""} ${p.last_name || ""}`.trim()
  return n || "—"
}

function formatDate(iso) {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export default function AdminDashboard({ user, onExit }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [savingId, setSavingId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null) // row awaiting confirmation
  const [pw, setPw] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [pwError, setPwError] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [editRow, setEditRow] = useState(null) // row being edited
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "" })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState("")

  const ownerSet = OWNER_EMAILS.map((e) => e.toLowerCase())

  const openEdit = (row) => {
    setEditRow(row)
    setForm({ first_name: row.first_name || "", last_name: row.last_name || "", email: row.email || "" })
    setEditError("")
  }
  const closeEdit = () => {
    if (savingEdit) return
    setEditRow(null)
    setEditError("")
  }
  const saveEdit = async () => {
    const email = form.email.trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEditError("That email doesn't look valid.")
      return
    }
    setSavingEdit(true)
    setEditError("")
    const { ok, error } = await updateUserDetails(editRow.id, {
      email: email || null,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
    })
    setSavingEdit(false)
    if (!ok) {
      setEditError(error || "Could not save changes.")
      return
    }
    setRows((rs) =>
      rs.map((r) =>
        r.id === editRow.id
          ? { ...r, first_name: form.first_name.trim(), last_name: form.last_name.trim(), email: email || r.email }
          : r,
      ),
    )
    setEditRow(null)
  }

  const openDelete = (row) => {
    setPendingDelete(row)
    setPw("")
    setConfirmEmail("")
    setPwError("")
  }
  const closeDelete = () => {
    if (deleting) return
    setPendingDelete(null)
    setPw("")
    setConfirmEmail("")
    setPwError("")
  }
  const emailMatches =
    pendingDelete && confirmEmail.trim().toLowerCase() === (pendingDelete.email || "").trim().toLowerCase()
  const confirmDelete = async () => {
    if (!emailMatches) {
      setPwError("The email you typed doesn't match this account.")
      return
    }
    if (pw !== DELETE_PASSWORD) {
      setPwError("Incorrect admin password.")
      return
    }
    setDeleting(true)
    setPwError("")
    const { ok, error } = await deleteUser(pendingDelete.id)
    setDeleting(false)
    if (!ok) {
      setPwError(error || "Could not delete this account.")
      return
    }
    setRows((rs) => rs.filter((r) => r.id !== pendingDelete.id))
    setPendingDelete(null)
    setPw("")
  }

  const load = async () => {
    setLoading(true)
    setError("")
    const { data, error } = await fetchAllProfiles()
    if (error) setError(error)
    setRows(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const changeAccess = async (row, value) => {
    const opt = OPTIONS.find((o) => o.value === value)
    if (!opt) return
    setSavingId(row.id)
    // Optimistic update
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, paid: opt.paid, plan: opt.plan } : r)))
    const { error } = await updateProfileAccess(row.id, { paid: opt.paid, plan: opt.plan })
    if (error) {
      setError(error)
      load() // revert to truth
    }
    setSavingId(null)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        (r.email || "").toLowerCase().includes(q) ||
        fullName(r).toLowerCase().includes(q),
    )
  }, [rows, query])

  const stats = useMemo(() => {
    const total = rows.length
    const paying = rows.filter((r) => r.paid && r.plan !== "comp").length
    const monthly = rows.filter((r) => r.paid && r.plan === "monthly").length
    const annual = rows.filter((r) => r.paid && r.plan === "annual").length
    const mrr = monthly * 2.99 + annual * (19.99 / 12)
    return { total, paying, monthly, annual, mrr }
  }, [rows])

  const isOwner = OWNER_EMAILS.map((e) => e.toLowerCase()).includes((user?.email || "").toLowerCase())

  if (!isOwner) {
    return (
      <div className="admin">
        <div className="admin-inner">
          <p className="gate-error">This dashboard is for the owner account only.</p>
          <button className="btn" onClick={onExit}>← Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin">
      <div className="admin-inner">
        <header className="admin-head">
          <div>
            <h1 className="admin-title">Owner Dashboard</h1>
            <p className="admin-sub">Signed in as {user.email}</p>
          </div>
          <div className="admin-head-actions">
            <button className="btn ghost" onClick={load} disabled={loading}>↻ Refresh</button>
            <button className="btn" onClick={onExit}>Study mode →</button>
          </div>
        </header>

        <div className="admin-stats">
          <div className="stat-card"><span className="stat-num">{stats.total}</span><span className="stat-label">Accounts</span></div>
          <div className="stat-card"><span className="stat-num">{stats.paying}</span><span className="stat-label">Paying</span></div>
          <div className="stat-card"><span className="stat-num">{stats.monthly}</span><span className="stat-label">Monthly</span></div>
          <div className="stat-card"><span className="stat-num">{stats.annual}</span><span className="stat-label">Annual</span></div>
          <div className="stat-card"><span className="stat-num">£{stats.mrr.toFixed(2)}</span><span className="stat-label">Est. monthly</span></div>
        </div>

        <input
          className="gate-input admin-search"
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {error && <p className="gate-error">{error}</p>}
        {loading ? (
          <p className="admin-empty">Loading accounts…</p>
        ) : filtered.length === 0 ? (
          <p className="admin-empty">No accounts found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Access</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td data-label="Name">{fullName(r)}</td>
                    <td data-label="Email" className="admin-email">{r.email || "—"}</td>
                    <td data-label="Joined">{formatDate(r.created_at)}</td>
                    <td data-label="Access">
                      <span className={"access-pill " + (r.paid ? "on" : "off")}>
                        <select
                          value={currentValue(r)}
                          onChange={(e) => changeAccess(r, e.target.value)}
                          disabled={savingId === r.id}
                        >
                          {OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        {savingId === r.id && <span className="saving-dot">saving…</span>}
                      </span>
                    </td>
                    <td data-label="" className="admin-remove-cell">
                      {ownerSet.includes((r.email || "").toLowerCase()) ? (
                        <span className="owner-tag">Owner</span>
                      ) : (
                        <div className="row-actions">
                          <button className="btn-edit" onClick={() => openEdit(r)}>✏️ Edit</button>
                          <button className="btn-remove" onClick={() => openDelete(r)}>🗑</button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="admin-note">
          Changes save instantly. Access is enforced by the database — only this owner account can view, edit or remove other accounts.
        </p>
      </div>

      <AnimatePresence>
        {editRow && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeEdit}
          >
            <motion.div
              className="modal-card del-modal"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.26, ease: [0.2, 0.7, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="modal-close" onClick={closeEdit} aria-label="Close">✕</button>
              <h2 style={{ marginTop: 0 }}>Edit account</h2>
              <label className="del-label">First name</label>
              <input
                className="gate-input"
                type="text"
                value={form.first_name}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              />
              <label className="del-label" style={{ marginTop: 12 }}>Last name</label>
              <input
                className="gate-input"
                type="text"
                value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
              />
              <label className="del-label" style={{ marginTop: 12 }}>Email (login)</label>
              <input
                className="gate-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              {editError && <p className="gate-error">{editError}</p>}
              <div className="del-actions">
                <button className="btn" onClick={closeEdit} disabled={savingEdit}>Cancel</button>
                <button className="btn primary" onClick={saveEdit} disabled={savingEdit}>
                  {savingEdit ? "Saving…" : "Save changes"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDelete && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDelete}
          >
            <motion.div
              className="modal-card del-modal"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.26, ease: [0.2, 0.7, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="modal-close" onClick={closeDelete} aria-label="Close">✕</button>
              <h2 style={{ marginTop: 0 }}>Remove this account?</h2>
              <p className="del-target">
                <b>{fullName(pendingDelete)}</b>
                <span>{pendingDelete.email}</span>
              </p>
              <p className="del-warn">
                This permanently deletes their account, progress and leaderboard entry. This cannot be undone.
              </p>
              <label className="del-label">1. Type this account's email to confirm: <b>{pendingDelete.email}</b></label>
              <input
                className="gate-input"
                type="email"
                value={confirmEmail}
                autoFocus
                placeholder="Account email"
                onChange={(e) => { setConfirmEmail(e.target.value); setPwError("") }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") closeDelete()
                }}
              />
              <label className="del-label" style={{ marginTop: 12 }}>2. Enter the admin password</label>
              <input
                className="gate-input"
                type="password"
                value={pw}
                placeholder="Admin password"
                onChange={(e) => { setPw(e.target.value); setPwError("") }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmDelete()
                  if (e.key === "Escape") closeDelete()
                }}
              />
              {pwError && <p className="gate-error">{pwError}</p>}
              <div className="del-actions">
                <button className="btn" onClick={closeDelete} disabled={deleting}>Cancel</button>
                <button className="btn danger" onClick={confirmDelete} disabled={deleting || !pw || !emailMatches}>
                  {deleting ? "Removing…" : "Delete account"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
