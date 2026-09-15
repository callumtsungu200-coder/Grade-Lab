import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import Logo from "./Logo.jsx"
import { supabase } from "../supabaseClient.js"
import { SUPPORT_EMAIL, TURNSTILE_SITE_KEY, isCaptchaEnabled } from "../supabaseConfig.js"

// Load the Cloudflare Turnstile script once, on demand.
let turnstilePromise = null
function loadTurnstile() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"))
  if (window.turnstile) return Promise.resolve()
  if (turnstilePromise) return turnstilePromise
  turnstilePromise = new Promise((resolve, reject) => {
    const s = document.createElement("script")
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("Turnstile failed to load"))
    document.head.appendChild(s)
  })
  return turnstilePromise
}

export default function AuthGate({ onDemo, recovery = false, onRecovered, onBack, backLabel = '← Back to home' }) {
  // modes: 'login' | 'signup' | 'reset' ; recovery prop shows the set-new-password form
  const [mode, setMode] = useState("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [captchaToken, setCaptchaToken] = useState("")
  const captchaRef = useRef(null)
  const widgetIdRef = useRef(null)

  const clearMsgs = () => {
    setError("")
    setInfo("")
  }

  // Render the Turnstile widget once (skipped when disabled or during recovery).
  useEffect(() => {
    if (!isCaptchaEnabled || recovery) return
    let cancelled = false
    loadTurnstile()
      .then(() => {
        if (cancelled || !window.turnstile || !captchaRef.current || widgetIdRef.current !== null) return
        widgetIdRef.current = window.turnstile.render(captchaRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "dark",
          callback: (token) => setCaptchaToken(token),
          "expired-callback": () => setCaptchaToken(""),
          "error-callback": () => setCaptchaToken(""),
        })
      })
      .catch(() => {
        /* if the widget can't load, don't hard-block the user */
      })
    return () => {
      cancelled = true
    }
  }, [recovery])

  // Turnstile tokens are single-use — reset the widget after each attempt.
  const resetCaptcha = () => {
    setCaptchaToken("")
    try {
      if (window.turnstile && widgetIdRef.current !== null) window.turnstile.reset(widgetIdRef.current)
    } catch {
      /* ignore */
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    clearMsgs()

    // Require a passed CAPTCHA for anything that hits the auth endpoints.
    if (isCaptchaEnabled && !recovery && !captchaToken) {
      setError("Please complete the 'I'm human' check.")
      return
    }

    setBusy(true)
    try {
      if (recovery) {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        setInfo("Password updated. You're now signed in.")
        if (onRecovered) onRecovered()
      } else if (mode === "signup") {
        const first = firstName.trim()
        const last = lastName.trim()
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            captchaToken,
            data: {
              first_name: first,
              last_name: last,
              full_name: `${first} ${last}`.trim(),
            },
          },
        })
        if (error) throw error
        if (data.session) {
          // Email confirmation is off — the user is signed in immediately.
          // The auth listener in App takes over and shows the app.
          setInfo("Account created! Signing you in…")
        } else {
          // Email confirmation is on — they must confirm first.
          setInfo("Almost there! Check your email and click the confirmation link, then come back and log in.")
          setMode("login")
          setPassword("")
        }
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
          captchaToken,
        })
        if (error) throw error
        setInfo("If that email has an account, we've sent a password-reset link. Check your inbox.")
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
          options: { captchaToken },
        })
        if (error) throw error
      }
    } catch (err) {
      const msg = err.message || "Something went wrong."
      if (/email not confirmed|confirm/i.test(msg)) {
        setError("Please confirm your email first — click the link we sent you, then log in.")
      } else {
        setError(msg)
      }
    } finally {
      setBusy(false)
      // Tokens can't be reused — refresh the widget for the next attempt.
      if (isCaptchaEnabled && !recovery) resetCaptcha()
    }
  }

  const setModeAndClear = (m) => {
    setMode(m)
    clearMsgs()
  }

  const title = recovery
    ? "Set a new password"
    : mode === "signup"
      ? "Create your account"
      : mode === "reset"
        ? "Reset your password"
        : "Welcome back"

  const sub = recovery
    ? "Enter a new password for your account."
    : mode === "signup"
      ? "Join Grade Lab and start saving your progress."
      : mode === "reset"
        ? "Enter your email and we'll send you a reset link."
        : "Log in to pick up right where you left off."

  const cardClass =
    "gate-card auth-card " +
    (recovery || mode === "reset" ? "mode-reset" : mode === "signup" ? "mode-signup" : "mode-login")

  return (
    <div className="gate">
      <div className="bg-glow" aria-hidden="true" />
      <div className="bg-noise" aria-hidden="true" />
      <motion.div
        className={cardClass}
        key={recovery ? "recovery" : mode}
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
      >
        {onBack && !recovery && (
          <button type="button" className="gate-back" onClick={onBack}>{backLabel}</button>
        )}
        <div className="gate-brand"><Logo className="lg" /></div>

        {/* Segmented Log in / Sign up switch — hidden during reset/recovery */}
        {!recovery && mode !== "reset" && (
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              className={"auth-tab" + (mode === "login" ? " active" : "")}
              onClick={() => setModeAndClear("login")}
            >
              Log in
            </button>
            <button
              type="button"
              className={"auth-tab" + (mode === "signup" ? " active" : "")}
              onClick={() => setModeAndClear("signup")}
            >
              Sign up
            </button>
            <span className={"auth-tabs-thumb " + (mode === "signup" ? "right" : "left")} aria-hidden="true" />
          </div>
        )}

        <h1 className="gate-title">{title}</h1>
        <p className="gate-sub">{sub}</p>

        <form onSubmit={submit} className="gate-form">
          {mode === "signup" && !recovery && (
            <div className="name-row">
              <input
                type="text"
                className="gate-input"
                placeholder="First name"
                value={firstName}
                autoComplete="given-name"
                required
                onChange={(e) => setFirstName(e.target.value)}
              />
              <input
                type="text"
                className="gate-input"
                placeholder="Last name"
                value={lastName}
                autoComplete="family-name"
                required
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          )}

          {!recovery && (
            <input
              type="email"
              className="gate-input"
              placeholder="Email"
              value={email}
              autoComplete="email"
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          )}

          {mode !== "reset" && (
            <div className="pw-wrap">
              <input
                type={showPassword ? "text" : "password"}
                className="gate-input"
                placeholder={recovery ? "New password" : "Password"}
                value={password}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={6}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          )}

          {isCaptchaEnabled && !recovery && (
            <div className="cf-turnstile-holder" ref={captchaRef} />
          )}

          <motion.button type="submit" className="btn big primary" whileTap={{ scale: 0.99 }} disabled={busy}>
            {busy
              ? "Please wait…"
              : recovery
                ? "Save new password →"
                : mode === "signup"
                  ? "Create account →"
                  : mode === "reset"
                    ? "Send reset link →"
                    : "Log in →"}
          </motion.button>
        </form>

        {!recovery && mode === "signup" && (
          <p className="gate-legal">
            By creating an account you agree to the <a href="./terms.html" target="_blank" rel="noopener">Terms</a> and{" "}
            <a href="./privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.
          </p>
        )}

        {error && <p className="gate-error">{error}</p>}
        {info && <p className="gate-info">{info}</p>}

        {!recovery && mode === "login" && (
          <p className="gate-switch">
            <button className="gate-link" onClick={() => setModeAndClear("reset")}>
              Forgot password?
            </button>
          </p>
        )}

        {!recovery && mode === "reset" && (
          <p className="gate-switch">
            <button className="gate-link" onClick={() => setModeAndClear("login")}>
              ← Back to log in
            </button>
          </p>
        )}

        {!recovery && mode !== "reset" && (
          <>
            <p className="gate-or">or</p>
            <button className="gate-demo" onClick={onDemo}>
              Continue without an account
            </button>
          </>
        )}

        <p className="gate-support">
          Need help? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
      </motion.div>
    </div>
  )
}
