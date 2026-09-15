# Grade Lab — things only you can do

These need your logins, so they can't be done for you. They're in order of importance.

## 1. Deploy the latest build (5 minutes)
**Best:** Netlify → your site → **Site configuration → Build & deploy → Link repository** → pick `callumtsungu200-coder/Grade-Lab`. `netlify.toml` already has the settings. After this, every push deploys automatically, including the past-paper viewer's server function.

**Quick alternative:** drag `D:\Chris Tsungu CV\gcse-flashcards-react\dist` onto Netlify's Deploys page. The site works, but drag-and-drop doesn't include server functions, so some past papers open in a new tab instead of in the app.

## 2. Run the database setup (2 minutes)
Supabase → **SQL Editor → New query** → paste all of `supabase-setup-all.sql` → **Run**. It switches on:
- the global leaderboard
- past papers you post yourself
- the free-plan allowance stored per account, so clearing browser data can't reset it
- account delete / edit from your owner dashboard and Profile

Until you run it, those features fall back gracefully. Nothing breaks.

## 3. Turn on bot protection (after step 1)
Supabase → **Authentication → Attack Protection → CAPTCHA** → provider **Turnstile** → paste your Cloudflare Turnstile **secret** key. Do this *after* deploying, or sign-in stops working on the live site.

## 4. Legal pages — check them with a parent or guardian
`public/privacy.html` and `public/terms.html` describe what the app really does. They aren't legal advice. Because you're under 18 and taking payments:
- Have a parent or guardian read both pages. Consider adding your name or a business name as the operator.
- The Stripe account should be in an adult's name if you're under 18.
- Check whether you need to pay the ICO data protection fee (ico.org.uk → "Data protection fee").

## 5. Get the unfinished content written
Still missing exam questions: Biology 7, Chemistry 4, 5, 7, 9, 10, Media Studies (2 sections), and Religious Studies (Judaism, Buddhism, Hinduism, Sikhism, Catholic Christianity). A validator and the exact brief used for the finished sections are ready, so this is a quick job in a new session. A teacher skim of new questions before exam season is worth it.

## Not done yet (planned)
- **AI marking of written answers:** the "coming soon" badge is removed until it exists. It will need an Anthropic API key (console.anthropic.com, with billing) added in Netlify as `ANTHROPIC_API_KEY`.
- **Smaller first download:** load each subject's questions only when opened.
- **Automated tests** for sync, free sets and spaced repetition.
