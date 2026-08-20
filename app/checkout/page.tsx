import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { LogoMark } from '@/components/logo'
import { EmbeddedCheckoutPanel } from '@/components/billing/embedded-checkout-panel'
import {
  ORDERED_PLANS,
  TRIAL_DAYS,
  getPlan,
  parseBillingInterval,
  stripeConfigured,
} from '@/lib/billing/plans'
import { orgHasProductAccess } from '@/lib/billing/access'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Start your trial — AnswerLoops',
  robots: { index: false, follow: false },
}

/**
 * The branded checkout page.
 *
 * Replaces the redirect to checkout.stripe.com for the signup path. The card
 * form is still Stripe's, rendered in an iframe by the panel below — what
 * changed is that it now sits inside our own page, next to the plan picker and
 * the questions people actually ask before entering a card, instead of on a
 * page that looks like it belongs to someone else at the moment of highest
 * hesitation.
 *
 * Every guard here mirrors /start-trial, because both are reachable directly
 * and neither can assume the other ran first.
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; interval?: string }>
}) {
  const session = await auth()
  const { plan: requestedPlan, interval: requestedInterval } = await searchParams

  if (!session?.user) {
    const resume = requestedPlan
      ? `/login?plan=${encodeURIComponent(requestedPlan)}&interval=${parseBillingInterval(requestedInterval) ?? 'monthly'}`
      : '/login'
    redirect(resume)
  }

  // Self-hosted has no billing, so there is nothing to buy and the gate never
  // sends anyone here. Reaching it by hand should not dead-end.
  if (!stripeConfigured()) redirect('/dashboard')

  const orgId = session.orgId ?? DEFAULT_ORG_ID

  // Already paying. Sending them back through checkout would create a second
  // subscription for an org that has one.
  if (await orgHasProductAccess(orgId)) redirect('/dashboard')

  // An unrecognised plan is not an error worth a page — pricing is where the
  // choice is made.
  const plan = requestedPlan ? getPlan(requestedPlan) : null
  if (!plan) redirect('/pricing?resume=1')

  const interval = parseBillingInterval(requestedInterval) ?? 'monthly'

  return (
    <div className="min-h-screen bg-[#f5f8fd]">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="text-base font-semibold tracking-tight text-slate-950">
              answer<span className="text-blue-600">Loops</span>
            </span>
          </Link>
          <Link
            href="/pricing"
            className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            ← Back to pricing
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
            Start your {TRIAL_DAYS}-day trial.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            A card is required to start, and nothing is charged for {TRIAL_DAYS} days. Cancel any
            time before then and you will not be billed at all.
          </p>
        </div>

        <div className="mt-10 sm:mt-12">
          <EmbeddedCheckoutPanel
            plans={ORDERED_PLANS}
            initialPlanId={plan.id}
            initialInterval={interval}
          />
        </div>
      </main>
    </div>
  )
}
