/* ------------------------------------------------------------------
   SUPABASE CONFIG  —  paste your two values below to turn on accounts.
   ------------------------------------------------------------------
   Get these from your Supabase project:
     Supabase dashboard -> Project Settings -> API
       * "Project URL"      -> SUPABASE_URL
       * "anon" "public" key -> SUPABASE_ANON_KEY

   The anon key is SAFE to put in the website code (it is designed to be
   public). Your data is protected by Row Level Security, which the SQL
   in supabase-setup.sql switches on.

   Until you paste real values here, the site keeps working exactly as it
   does now (one shared password + progress saved in the browser).
   ------------------------------------------------------------------ */
export const SUPABASE_URL = "https://tcvdedjrlsusopzftyki.supabase.co"
export const SUPABASE_ANON_KEY = "sb_publishable_hnTYeklKwyloSzWbI6MhOw_ylU9ZI5P"

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.length > 20

/* ------------------------------------------------------------------
   BOT PROTECTION — Cloudflare Turnstile CAPTCHA (optional)
   ------------------------------------------------------------------
   Stops bots from mass-creating accounts on sign up / log in.
   Two-step setup:
     1) Cloudflare dashboard (free) -> Turnstile -> Add site
          * add your domain (gradelab.netlify.app) and "localhost" for testing
          * copy the "Site Key"  -> paste below (this one is public/safe)
          * copy the "Secret Key" (keep private)
     2) Supabase dashboard -> Authentication -> Attack Protection ->
          enable CAPTCHA, provider = "Turnstile", paste the SECRET key, save.
   Until you paste a Site Key below, the CAPTCHA is skipped and auth works
   exactly as it does now. Both steps must be done for it to take effect. */
export const TURNSTILE_SITE_KEY = "0x4AAAAAAETJJUcyI4rVUhYr"

export const isCaptchaEnabled = TURNSTILE_SITE_KEY.length > 10

/* Your Stripe Payment Links (create them in the Stripe dashboard -> Payment Links).
   Make TWO recurring prices on one product, then a link for each:
     * Monthly £2.99  -> STRIPE_PAYMENT_LINK_MONTHLY
     * Annual  £20    -> STRIPE_PAYMENT_LINK_ANNUAL
   Live links look like "https://buy.stripe.com/xxxxxxxx" (no "test_"). */
export const STRIPE_PAYMENT_LINK_MONTHLY = "https://buy.stripe.com/6oU28k0budyL3E57GR5Ne00"
export const STRIPE_PAYMENT_LINK_ANNUAL = "https://buy.stripe.com/cNi14g3nGcuHa2t7GR5Ne01"

/* Prices shown on the paywall (keep in sync with the Stripe prices above). */
export const PRICE_MONTHLY = "£2.99"
export const PRICE_ANNUAL = "£19.99"
export const ANNUAL_SAVING = "£16"

/* Back-compat: some code still imports the single link. */
export const STRIPE_PAYMENT_LINK = STRIPE_PAYMENT_LINK_MONTHLY

/* Stripe Customer Portal link — customers use this to cancel or manage their
   subscription themselves (Stripe -> Settings -> Billing -> Customer portal). */
export const STRIPE_PORTAL_LINK = "https://billing.stripe.com/p/login/6oU28k0budyL3E57GR5Ne00"

/* Support / contact email shown to users who need help. */
export const SUPPORT_EMAIL = "gradelab26@gmail.com"

/* Owner / admin emails — these accounts ALWAYS have full access, no payment
   needed. Add more emails here to give extra free accounts. */
export const OWNER_EMAILS = ["gradelab26@gmail.com"]

/* Display-name overrides for specific accounts (e.g. accounts created before
   names were collected). Keyed by lowercase email. */
export const NAME_OVERRIDES = {
  "gradelab26@gmail.com": { first: "Chris", last: "Tsungu" },
}

