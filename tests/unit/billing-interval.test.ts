import { describe, it, expect } from 'vitest'
import {
  ANNUAL_DISCOUNT_PCT,
  annualMonthlyPrice,
  annualTotalPrice,
  ORDERED_PLANS,
  parseBillingInterval,
  stripePriceFor,
  type Plan,
} from '@/lib/billing/plans'

/**
 * The billing interval decides which Stripe price a customer is charged
 * against, and it arrives as a query-string value the caller controls. Two
 * properties matter, and getting either wrong is a wrong amount on a card
 * rather than a failing page:
 *
 * 1. Only the two known intervals are ever honoured.
 * 2. A plan with no price for the selected interval declines, rather than
 *    quietly billing the other one.
 */

const plan = (over: Partial<Plan> = {}): Plan => ({
  id: 'standard',
  name: 'Standard',
  deflectionsPerMonth: 500,
  priceMonthly: 2900,
  stripePriceId: 'price_monthly',
  stripePriceIdAnnual: 'price_annual',
  ...over,
})

describe('parseBillingInterval', () => {
  it('accepts the two real intervals', () => {
    expect(parseBillingInterval('monthly')).toBe('monthly')
    expect(parseBillingInterval('annual')).toBe('annual')
  })

  it('rejects everything else rather than guessing', () => {
    for (const bad of [null, undefined, '', 'yearly', 'year', 'Annual', 'MONTHLY', 'annual ', '../annual', 'annual;drop']) {
      expect(parseBillingInterval(bad as string | null | undefined)).toBeNull()
    }
  })
})

describe('stripePriceFor', () => {
  it('returns the price matching the interval asked for', () => {
    expect(stripePriceFor(plan(), 'monthly')).toBe('price_monthly')
    expect(stripePriceFor(plan(), 'annual')).toBe('price_annual')
  })

  it('returns null rather than the other interval when annual is unconfigured', () => {
    // The failure this guards: someone selects annual, no annual price exists,
    // and they are charged the monthly amount while the page shows the yearly
    // total. Declining to sell is the correct outcome.
    const p = plan({ stripePriceIdAnnual: null })
    expect(stripePriceFor(p, 'annual')).toBeNull()
    expect(stripePriceFor(p, 'monthly')).toBe('price_monthly')
  })

  it('returns null rather than the other interval when monthly is unconfigured', () => {
    const p = plan({ stripePriceId: null })
    expect(stripePriceFor(p, 'monthly')).toBeNull()
    expect(stripePriceFor(p, 'annual')).toBe('price_annual')
  })
})

describe('annual pricing arithmetic', () => {
  it('charges twelve times the discounted monthly figure', () => {
    for (const p of ORDERED_PLANS) {
      expect(annualTotalPrice(p)).toBe(annualMonthlyPrice(p) * 12)
    }
  })

  it('is cheaper than paying monthly for a year, by the stated discount', () => {
    for (const p of ORDERED_PLANS) {
      const monthlyForAYear = p.priceMonthly * 12
      expect(annualTotalPrice(p)).toBeLessThan(monthlyForAYear)
      const savedPct = (1 - annualTotalPrice(p) / monthlyForAYear) * 100
      expect(Math.round(savedPct)).toBe(ANNUAL_DISCOUNT_PCT)
    }
  })

  it('matches the amounts configured in Stripe', () => {
    // These are the figures the live annual prices were created with. If a plan
    // price changes here without the Stripe price changing too, the page and the
    // charge disagree — which is exactly how this went wrong before.
    const expected: Record<string, number> = {
      standard: 27840,
      pro: 75840,
      enterprise: 287040,
    }
    for (const p of ORDERED_PLANS) {
      expect(annualTotalPrice(p), `annual total for ${p.id}`).toBe(expected[p.id])
    }
  })
})
