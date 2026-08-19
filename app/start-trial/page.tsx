import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getPlan, stripeConfigured, TRIAL_DAYS } from '@/lib/billing/plans'
import { createCheckoutSession } from '@/lib/billing/checkout'
import { orgHasProductAccess } from '@/lib/billing/access'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'
import { logger } from '@/lib/logger'
import { Logo } from '@/components/logo'

const MOD = 'start-trial'

// Stripe delivers the webhook that writes the subscription row independently of
// redirecting the browser here, and the browser often arrives first. Wait a
// beat for it rather than concluding there is no subscription — the alternative
// is bouncing someone who just paid out to the pricing page.
//
// Webhook delivery is normally well under a second, so this almost always
// resolves on the first check and costs nothing.
const POST_CHECKOUT_ATTEMPTS = 4
const POST_CHECKOUT_DELAY_MS = 600

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * The single junction between authenticating and being allowed into the
 * product. Every path redirects except the post-checkout wait.
 *
 * Three kinds of visitor arrive:
 *
 * - **Mid-signup**, having picked a plan and just finished OAuth. Sent straight
 *   to Stripe. No interstitial — they already chose, and a "click to continue"
 *   page is only somewhere to abandon.
 *
 * - **Back from a completed checkout** (`?checkout=success`). Waits briefly for
 *   the webhook, then into the product. This is why the page is exempt from the
 *   access gate: at this moment they have paid but the row may not exist yet.
 *
 * - **Turned away by the gate** — abandoned checkout earlier, cancelled, or a
 *   lapsed trial. No plan to resume, so back to the public pricing page to
 *   choose one. Bouncing them into checkout for a plan they never selected
 *   would be presumptuous.
 */
export default async function StartTrialPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; checkout?: string }>
}) {
  const session = await auth()
  const { plan: requestedPlan, checkout } = await searchParams

  if (!session?.user) {
    // Preserve the plan across sign-in so the choice survives the round trip.
    redirect(requestedPlan ? `/login?plan=${encodeURIComponent(requestedPlan)}` : '/login')
  }

  // Self-hosted has no billing, so there is nothing to start and the gate never
  // sends anyone here. Reaching it by hand should not dead-end.
  if (!stripeConfigured()) redirect('/dashboard')

  const orgId = session.orgId ?? DEFAULT_ORG_ID

  if (await orgHasProductAccess(orgId)) redirect('/dashboard')

  // Just completed checkout: the money side is done, we are only waiting on our
  // own bookkeeping.
  if (checkout === 'success') {
    for (let i = 0; i < POST_CHECKOUT_ATTEMPTS; i++) {
      await sleep(POST_CHECKOUT_DELAY_MS)
      if (await orgHasProductAccess(orgId)) redirect('/dashboard')
    }

    // Still nothing. Do not send them to pricing — they paid, and asking them to
    // pay again is the worst possible response. Self-refreshing keeps them on a
    // page that will resolve itself the moment the webhook lands.
    logger.warn('checkout completed but no subscription row yet — waiting on webhook', {
      module: MOD,
      orgId,
    })
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <meta httpEquiv="refresh" content="3" />
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface/95 px-8 py-10 text-center shadow-xl">
          <div className="mb-6 flex justify-center">
            <Logo width={120} />
          </div>
          <h1 className="text-base font-semibold text-ink-900">Finishing setup…</h1>
          <p className="mt-2 text-sm text-ink-500">
            Your {TRIAL_DAYS}-day trial has started and your card has not been charged. This page
            will continue on its own in a moment.
          </p>
        </div>
      </div>
    )
  }

  const plan = requestedPlan ? getPlan(requestedPlan) : null

  // No plan chosen, or an unrecognised one: back to the website to pick.
  if (!plan) redirect('/pricing?resume=1')

  const result = await createCheckoutSession(
    orgId,
    plan.id,
    session.user.email ?? '',
    session.user.name ?? '',
  )

  if (!result.ok) {
    // Checkout is the only way into the product, so this cannot be swallowed —
    // surface it where there is a next action rather than on a blank screen.
    logger.error('start-trial could not create a checkout session', {
      module: MOD,
      orgId,
      planId: plan.id,
      error: result.error,
    })
    redirect('/pricing?checkout=failed')
  }

  redirect(result.url)
}
