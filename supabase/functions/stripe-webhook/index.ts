// Supabase Edge Function: stripe-webhook
// Flips a user's profile to paid = true when Stripe confirms a payment.
//
// Deploy (see the README for full steps):
//   supabase functions deploy stripe-webhook --no-verify-jwt
// Set these secrets in Supabase (Edge Functions -> Secrets):
//   STRIPE_SECRET_KEY      = sk_live_... (or sk_test_...)
//   STRIPE_WEBHOOK_SECRET  = whsec_...   (from the Stripe webhook you create)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import Stripe from "https://esm.sh/stripe@14?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
)

Deno.serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature")
  const body = await req.text()

  let event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
      undefined,
      cryptoProvider,
    )
  } catch (err) {
    return new Response(`Webhook signature error: ${err.message}`, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any
    const email = session.customer_details?.email || session.customer_email
    if (email) {
      const { error } = await supabase
        .from("profiles")
        .update({ paid: true })
        .eq("email", email)
      if (error) console.error("Failed to set paid:", error.message)
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})
