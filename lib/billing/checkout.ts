import Stripe from 'stripe'
import { getStripe, getOrCreateCustomer } from './stripe'
import { getPlan, stripePriceFor, TRIAL_DAYS, type BillingInterval, type Plan } from './plans'
import { getSubscription } from '@/lib/db/queries/billing'
import { getDb } from '@/lib/db/drizzle'
import { users, memberships } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { logger } from '@/lib/logger'

const MOD = 'billing/checkout'

/**
 * Where Stripe sends someone who backs out of checkout.
 *
 * Deliberately the public pricing page rather than anywhere in the product. A
 * card is required to start a trial, so abandoning checkout means no trial was
 * started — and the dashboard is gated on having one (lib/billing/access.ts).
 * Pointing this at /billing would just bounce off that gate, so it goes
 * straight to the page where they can choose again.
 */
const CANCEL_PATH = '/pricing'

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string; status: number }

function baseUrl(): string {
  return process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
}

/**
 * Creates a Stripe Checkout session for an org starting or changing a plan.
 *
 * Extracted from the API route so the signup path can call it server-side and
 * redirect straight to Stripe, with no client round trip and no intermediate
 * flash of a page the user never asked for.
 */
export async function createCheckoutSession(
  orgId: number,
  planId: string,
  fallbackEmail: string,
  fallbackName: string,
  // Defaults to monthly so every existing caller keeps its behaviour. An
  // unrecognised value never reaches here — parseBillingInterval narrows it at
  // the edge — but the default also means a missing one bills the lower amount
  // rather than the higher.
  interval: BillingInterval = 'monthly',
): Promise<CheckoutResult> {
  const plan: Plan | null = getPlan(planId)
  if (!plan) return { ok: false, error: 'Unknown plan', status: 400 }

  const priceId = stripePriceFor(plan, interval)
  if (!priceId) {
    // Deliberately not falling back to the other interval: charging a different
    // amount than the page displayed is worse than declining to sell.
    return { ok: false, error: 'No Stripe price for this plan', status: 400 }
  }

  // The owner's address is preferred over the acting user's so the Stripe
  // customer stays attached to whoever owns the workspace, not whichever admin
  // happened to click upgrade.
  const db = getDb()
  const [member] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .innerJoin(
      memberships,
      and(
        eq(memberships.userId, users.id),
        eq(memberships.orgId, orgId),
        eq(memberships.role, 'owner'),
      ),
    )
    .limit(1)

  const email = member?.email ?? fallbackEmail
  const name = member?.name ?? fallbackName

  // A Stripe-side failure here (bad API key, a price that doesn't exist in
  // this mode, a transient outage) must never surface as an empty 500 — the
  // client's useUpgrade hook parses every response as JSON, so an empty body
  // throws an unrelated SyntaxError inside a transition and is silently
  // swallowed, leaving a dead page with no indication anything went wrong.
  try {
    const existing = await getSubscription(orgId)
    const customerId = existing?.stripeCustomerId ?? (await getOrCreateCustomer(orgId, email, name))

    const stripe = getStripe()
    const base = baseUrl()

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      // Back through /start-trial rather than straight to /billing. Stripe
      // redirects the browser independently of delivering the webhook that
      // writes the subscription row, and the browser frequently wins, so the
      // landing page has to tolerate the row not existing yet. /start-trial
      // waits for it; /billing does not have to.
      success_url: `${base}/start-trial?checkout=success`,
      cancel_url: `${base}${CANCEL_PATH}`,
      metadata: { org_id: String(orgId), plan_id: plan.id },
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: { org_id: String(orgId), plan_id: plan.id },
      },
      allow_promotion_codes: true,
      // Stripe shows the trial dates on its own, but not in words. Saying it
      // plainly at the submit button is the difference between "why does this
      // want my card" and a understood commitment — and it is the single
      // sentence most likely to decide whether someone completes this step.
      custom_text: {
        submit: {
          message: `Your card will not be charged today. The first ${TRIAL_DAYS} days are free, and you can cancel any time before then at no cost.`,
        },
      },
    })

    if (!checkoutSession.url) {
      logger.error('Stripe returned a session with no URL', { module: MOD, orgId, planId: plan.id })
      return { ok: false, error: 'Could not start checkout. Try again.', status: 502 }
    }

    return { ok: true, url: checkoutSession.url }
  } catch (err) {
    logger.error('Stripe checkout session creation failed', {
      module: MOD,
      orgId,
      planId: plan.id,
      error: err,
    })
    const message =
      err instanceof Stripe.errors.StripeError
        ? 'Could not start checkout — billing is misconfigured. Contact support.'
        : 'Could not start checkout. Try again.'
    return { ok: false, error: message, status: 502 }
  }
}
