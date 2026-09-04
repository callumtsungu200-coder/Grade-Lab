import { motion } from "framer-motion"
import {
  STRIPE_PAYMENT_LINK_MONTHLY,
  STRIPE_PAYMENT_LINK_ANNUAL,
  PRICE_MONTHLY,
  PRICE_ANNUAL,
  ANNUAL_SAVING,
  SUPPORT_EMAIL,
} from "../supabaseConfig.js"

// Add the buyer's email to a Stripe link so checkout is pre-filled.
function withEmail(url, email) {
  if (!url) return ""
  return url + (url.includes("?") ? "&" : "?") + "prefilled_email=" + encodeURIComponent(email || "")
}

export default function Paywall({ email, onClose, onRefresh, onSignOut, refreshing }) {
  const monthly = withEmail(STRIPE_PAYMENT_LINK_MONTHLY, email)
  const annual = withEmail(STRIPE_PAYMENT_LINK_ANNUAL, email)

  return (
    <motion.div
      className="modal-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="gate-mark">🔒</div>
        <span className="paywall-status">No access yet</span>
        <h2 className="gate-title">Unlock full access</h2>
        <p className="gate-sub">
          This account <strong>doesn't have full access yet</strong>, so your progress won't save.
          Unlock every subject and subtopic, thousands of flashcards, and progress that syncs
          across all your devices.
        </p>

        {monthly || annual ? (
          <div className="plan-list">
            {annual && (
              <a className="plan plan-annual" href={annual}>
                <span className="plan-badge">Save {ANNUAL_SAVING}</span>
                <span className="plan-name">Annual</span>
                <span className="plan-price">{PRICE_ANNUAL}<small>/year</small></span>
                <span className="plan-go">Choose annual →</span>
              </a>
            )}
            {monthly && (
              <a className="plan" href={monthly}>
                <span className="plan-name">Monthly</span>
                <span className="plan-price">{PRICE_MONTHLY}<small>/month</small></span>
                <span className="plan-go">Choose monthly →</span>
              </a>
            )}
          </div>
        ) : (
          <p className="gate-error">Payment link not set up yet.</p>
        )}

        <p className="paywall-hint">Already bought it? Tap below to check your payment and unlock.</p>
        <button className="gate-link" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? "Checking your payment…" : "I've paid — unlock now"}
        </button>

        <p className="gate-switch">
          Signed in as {email}.{" "}
          <button className="gate-link" onClick={onSignOut}>Sign out</button>
        </p>
        <p className="gate-support">
          Need help? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
      </motion.div>
    </motion.div>
  )
}
