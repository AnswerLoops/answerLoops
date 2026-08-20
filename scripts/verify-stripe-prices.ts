#!/usr/bin/env tsx
/**
 * Checks that the Stripe price ids configured in this environment are the
 * prices the code thinks they are.
 *
 * Unit tests cover the logic — that an interval selects the right field, and
 * that the field reaches Stripe's line_items. What they cannot see is whether
 * STRIPE_PRICE_STANDARD_ANNUAL actually holds a yearly price for Standard at
 * the amount the pricing page advertises. That lives in the environment, and
 * getting it wrong charges a real customer the wrong amount.
 *
 * The failure modes this catches, all of which look fine locally:
 *
 *   - a test-mode price id deployed to production
 *   - a monthly id pasted into the annual variable, or one plan's into another's
 *   - a price whose amount has drifted from what the page displays
 *   - a variable left unset, so that interval silently cannot be sold
 *
 * Run against whichever environment you want to check:
 *
 *   pnpm tsx scripts/verify-stripe-prices.ts          # local .env
 *   railway run pnpm tsx scripts/verify-stripe-prices.ts
 *
 * Exits non-zero on any mismatch, so it can gate a release.
 */

import Stripe from 'stripe'
import { ORDERED_PLANS, annualTotalPrice, stripePriceFor, type BillingInterval } from '../lib/billing/plans'

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('STRIPE_SECRET_KEY is not set — nothing to verify against.')
  process.exit(1)
}

const stripe = new Stripe(key)

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

interface Row {
  plan: string
  interval: BillingInterval
  expectedCents: number
  expectedRecurring: 'month' | 'year'
}

const rows: Row[] = ORDERED_PLANS.flatMap((plan) => [
  { plan: plan.id, interval: 'monthly' as const, expectedCents: plan.priceMonthly, expectedRecurring: 'month' as const },
  { plan: plan.id, interval: 'annual' as const, expectedCents: annualTotalPrice(plan), expectedRecurring: 'year' as const },
])

async function main(): Promise<void> {
  let failures = 0

  for (const row of rows) {
    const plan = ORDERED_PLANS.find((p) => p.id === row.plan)!
    const priceId = stripePriceFor(plan, row.interval)
    const label = `${row.plan} ${row.interval}`.padEnd(22)

    if (!priceId) {
      console.error(`FAIL  ${label} no price id configured — this interval cannot be sold`)
      failures++
      continue
    }

    let price: Stripe.Price
    try {
      price = await stripe.prices.retrieve(priceId)
    } catch (err) {
      // A test-mode id under a live key lands here, which is the point.
      console.error(`FAIL  ${label} ${priceId} could not be retrieved — ${err instanceof Error ? err.message : String(err)}`)
      failures++
      continue
    }

    const problems: string[] = []
    if (price.recurring?.interval !== row.expectedRecurring) {
      problems.push(`bills per ${price.recurring?.interval ?? 'once'}, expected per ${row.expectedRecurring}`)
    }
    if (price.unit_amount !== row.expectedCents) {
      problems.push(`is ${money(price.unit_amount ?? 0)}, page shows ${money(row.expectedCents)}`)
    }
    if (!price.active) problems.push('is not active')
    if (price.currency !== 'usd') problems.push(`is in ${price.currency}, expected usd`)

    if (problems.length) {
      console.error(`FAIL  ${label} ${priceId} ${problems.join('; ')}`)
      failures++
    } else {
      console.log(`ok    ${label} ${priceId}  ${money(price.unit_amount ?? 0)} per ${price.recurring?.interval}`)
    }
  }

  console.log('')
  if (failures) {
    console.error(`${failures} of ${rows.length} configured prices do not match the code.`)
    console.error('A customer would be charged something other than what the pricing page shows.')
    process.exit(1)
  }
  console.log(`All ${rows.length} configured prices match the code.`)
}

main()
