export const TRIAL_DAYS = 14

export type PlanId = 'standard' | 'pro' | 'enterprise'

// Annual billing discount shown on the marketing pricing page. There is no
// separate Stripe annual price configured yet — checkout always runs the
// monthly price regardless of which toggle state the visitor was on. This
// is a display-only rate until the product leaves waitlist mode and annual
// Stripe prices exist to sell against.
export const ANNUAL_DISCOUNT_PCT = 20

export interface Plan {
  id: PlanId
  name: string
  deflectionsPerMonth: number | null // null = unlimited
  priceMonthly: number               // USD cents, 0 = free
  stripePriceId: string | null       // null = no Stripe product (free)
}

// Effective monthly price if billed annually (priceMonthly minus the annual
// discount), rounded to the nearest cent. Display-only — see note above.
export function annualMonthlyPrice(plan: Plan): number {
  return Math.round(plan.priceMonthly * (1 - ANNUAL_DISCOUNT_PCT / 100))
}

export const PLANS: Record<PlanId, Plan> = {
  // Each plan reads STRIPE_PRICE_<ID> for its own id. That alignment is
  // load-bearing rather than tidiness: the 2026-07-29 rename (pro→standard,
  // scale→pro) deliberately left the old var names in place on the reasoning
  // that a var name is just a label on an opaque Stripe id. Deployments were
  // then configured from the plan names instead, so the code was reading
  // STRIPE_PRICE_PRO for Standard while the environment had it set to the Pro
  // price — Standard billed the wrong amount, and Pro read an unset
  // STRIPE_PRICE_SCALE and could not be purchased at all.
  //
  // Keep var name and plan id identical. A mismatch here is a silent billing
  // error on one plan and a broken checkout on another, and neither surfaces
  // until a customer hits it.
  standard: {
    id: 'standard',
    // Was id 'pro' / name "Pro" — renamed 2026-07-29 so the id matches the
    // display name shipped in PR #204.
    name: 'Standard',
    deflectionsPerMonth: 500,
    priceMonthly: 2900,
    stripePriceId: process.env.STRIPE_PRICE_STANDARD ?? null,
  },
  pro: {
    id: 'pro',
    // Was id 'scale' / name "Scale" — renamed 2026-07-29. This is the
    // *new* meaning of 'pro'; see plans.ts module comment history if this
    // reads as a regression of anything — it isn't.
    name: 'Pro',
    deflectionsPerMonth: 2000,
    priceMonthly: 7900,
    stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    deflectionsPerMonth: null,
    priceMonthly: 29900,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE ?? null,
  },
}

export const ORDERED_PLANS: Plan[] = [PLANS.standard, PLANS.pro, PLANS.enterprise]

// There is no free tier. Every subscription starts on one of the three paid
// plans above with a 14-day Stripe trial attached to it (checkout.session.completed
// creates the row with status='trialing' and the plan the customer picked —
// see app/api/billing/webhook/route.ts). An org with no subscription row, or
// an unrecognized/legacy planId string, has no plan at all: getPlan returns
// null rather than falling back to a free plan, and callers must treat null
// as zero access.
export function getPlan(id: PlanId | string | null | undefined): Plan | null {
  return id ? PLANS[id as PlanId] ?? null : null
}

/**
 * Stripe subscription statuses that still grant plan access. past_due is a
 * short dunning grace period (Stripe keeps retrying the card); everything
 * else — canceled, unpaid, incomplete, incomplete_expired, paused, or no
 * subscription row at all — has zero access. There is no free tier: losing
 * payment status means losing service, immediately, not degrading to a free
 * plan.
 */
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due'])

export function hasActiveAccess(status: string | null | undefined): boolean {
  return !!status && ACTIVE_SUBSCRIPTION_STATUSES.has(status)
}

export function priceIdToPlan(priceId: string): Plan | null {
  return Object.values(PLANS).find((p) => p.stripePriceId === priceId) ?? null
}

export function isOverLimit(deflections: number, plan: Plan): boolean {
  if (plan.deflectionsPerMonth === null) return false
  return deflections >= plan.deflectionsPerMonth
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

export type DeploymentMode = 'cloud' | 'self-hosted'

/**
 * Explicit deployment-mode signal, set once via env rather than inferred.
 * Defaults to 'self-hosted' when unset — a fresh self-hosted clone with no
 * env configured should never be mistaken for a broken cloud deployment.
 * `DEPLOYMENT_MODE=cloud` must be set on the managed answerloops.com prod
 * environment. Previously "self-hosted" was inferred from the absence of
 * `STRIPE_SECRET_KEY`, which meant a misconfigured or rotated key on cloud
 * silently degraded every paying org to unmetered/unlimited — the same
 * branch a self-hoster gets on purpose. This flag decouples the two.
 */
export function getDeploymentMode(): DeploymentMode {
  return process.env.DEPLOYMENT_MODE === 'cloud' ? 'cloud' : 'self-hosted'
}

/**
 * True when this is a cloud deployment that is missing its Stripe key — a
 * real misconfiguration, not a valid unmetered state. Callers must surface
 * this loudly rather than silently falling back to the self-hosted branch.
 */
export function isCloudMisconfigured(): boolean {
  return getDeploymentMode() === 'cloud' && !stripeConfigured()
}
