import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * A Stripe price id has to resolve back to the plan that sells it, whichever
 * interval the customer bought.
 *
 * The webhook reads the price id off the subscription item and asks which plan
 * it belongs to. For an annual customer that id is the annual one, so matching
 * only monthly ids left every annual subscription unresolvable: an update event
 * arriving before the row exists is logged and skipped, and one arriving after
 * it exists silently keeps whatever plan was already recorded rather than
 * applying what Stripe just said. Both are wrong in the same direction — the
 * local record stops tracking the subscription it is meant to mirror.
 *
 * PLANS reads its price ids from the environment at module load, so each case
 * sets the environment first and imports afterwards.
 */

const originalEnv = { ...process.env }

beforeEach(() => {
  vi.resetModules()
  process.env.STRIPE_PRICE_STANDARD = 'price_standard_monthly'
  process.env.STRIPE_PRICE_STANDARD_ANNUAL = 'price_standard_annual'
  process.env.STRIPE_PRICE_PRO = 'price_pro_monthly'
  process.env.STRIPE_PRICE_PRO_ANNUAL = 'price_pro_annual'
  process.env.STRIPE_PRICE_ENTERPRISE = 'price_enterprise_monthly'
  process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL = 'price_enterprise_annual'
})

afterEach(() => {
  process.env = { ...originalEnv }
})

const mod = () => import('@/lib/billing/plans')

describe('priceIdToPlan', () => {
  it('resolves the monthly price id of every plan', async () => {
    const { priceIdToPlan } = await mod()
    expect(priceIdToPlan('price_standard_monthly')?.id).toBe('standard')
    expect(priceIdToPlan('price_pro_monthly')?.id).toBe('pro')
    expect(priceIdToPlan('price_enterprise_monthly')?.id).toBe('enterprise')
  })

  it('resolves the annual price id of every plan', async () => {
    // The case that did not work: an annual subscriber's webhook events carry
    // these ids and nothing else identifying the plan.
    const { priceIdToPlan } = await mod()
    expect(priceIdToPlan('price_standard_annual')?.id).toBe('standard')
    expect(priceIdToPlan('price_pro_annual')?.id).toBe('pro')
    expect(priceIdToPlan('price_enterprise_annual')?.id).toBe('enterprise')
  })

  it('maps each interval of a plan to that same plan, never to a neighbour', async () => {
    const { priceIdToPlan, PLANS } = await mod()
    for (const plan of Object.values(PLANS)) {
      for (const priceId of [plan.stripePriceId, plan.stripePriceIdAnnual]) {
        expect(priceId, `${plan.id} price id`).toBeTruthy()
        expect(priceIdToPlan(priceId!)?.id).toBe(plan.id)
      }
    }
  })

  it('returns null for a price id from another product or account', async () => {
    const { priceIdToPlan } = await mod()
    expect(priceIdToPlan('price_something_else')).toBeNull()
  })

  it('never matches a plan whose price id is simply unconfigured', async () => {
    // With STRIPE_PRICE_*_ANNUAL unset those fields are null. An empty or
    // missing price id must not collide with them and hand back a real plan.
    delete process.env.STRIPE_PRICE_STANDARD_ANNUAL
    delete process.env.STRIPE_PRICE_PRO_ANNUAL
    delete process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL
    vi.resetModules()
    const { priceIdToPlan, PLANS } = await mod()
    expect(PLANS.standard.stripePriceIdAnnual).toBeNull()
    expect(priceIdToPlan('')).toBeNull()
    expect(priceIdToPlan(undefined as unknown as string)).toBeNull()
    expect(priceIdToPlan(null as unknown as string)).toBeNull()
  })

  it('agrees with stripePriceFor, the function that chose the id in the first place', async () => {
    // Round trip: the id checkout sends to Stripe for a given plan and interval
    // is the id the webhook later has to resolve back to that plan.
    const { priceIdToPlan, stripePriceFor, PLANS } = await mod()
    for (const plan of Object.values(PLANS)) {
      for (const interval of ['monthly', 'annual'] as const) {
        const priceId = stripePriceFor(plan, interval)
        expect(priceId, `${plan.id}/${interval}`).toBeTruthy()
        expect(priceIdToPlan(priceId!)?.id).toBe(plan.id)
      }
    }
  })
})
