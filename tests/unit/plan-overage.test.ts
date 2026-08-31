import { describe, it, expect } from 'vitest'
import {
  PLANS,
  ORDERED_PLANS,
  isOverLimit,
  blocksAtLimit,
  overageUnits,
  overageCostCents,
} from '@/lib/billing/plans'

// Coverage for the soft/hard deflection cap introduced with the Aug 2026
// pricing revision (Standard $49 / Pro $149 / Enterprise $499). Standard is a
// hard cap; Pro answers past its quota and meters the overage at $5 per 100;
// Enterprise is unlimited. The metered charge is not wired to Stripe yet — these
// functions only decide who gets blocked and what the UI shows.

describe('revised plan configuration', () => {
  it('prices the three tiers at the published monthly figures (cents)', () => {
    expect(PLANS.standard.priceMonthly).toBe(4900)
    expect(PLANS.pro.priceMonthly).toBe(14900)
    expect(PLANS.enterprise.priceMonthly).toBe(49900)
  })

  it('sets the included deflection quota per tier', () => {
    expect(PLANS.standard.deflectionsPerMonth).toBe(500)
    expect(PLANS.pro.deflectionsPerMonth).toBe(3000)
    expect(PLANS.enterprise.deflectionsPerMonth).toBeNull()
  })

  it('gives only Pro an overage rate, at $5 per 100', () => {
    expect(PLANS.standard.overageRatePer100Cents).toBeNull()
    expect(PLANS.pro.overageRatePer100Cents).toBe(500)
    expect(PLANS.enterprise.overageRatePer100Cents).toBeNull()
  })
})

describe('blocksAtLimit', () => {
  it('is true for a hard-cap metered plan (Standard)', () => {
    expect(blocksAtLimit(PLANS.standard)).toBe(true)
  })

  it('is false for a soft-cap plan (Pro) — it meters instead of blocking', () => {
    expect(blocksAtLimit(PLANS.pro)).toBe(false)
  })

  it('is false for an unlimited plan (Enterprise) — no quota to reach', () => {
    expect(blocksAtLimit(PLANS.enterprise)).toBe(false)
  })
})

describe('isOverLimit vs blocksAtLimit', () => {
  it('Pro is "over" its quota at 3,000 but never blocked', () => {
    expect(isOverLimit(3000, PLANS.pro)).toBe(true)
    expect(blocksAtLimit(PLANS.pro) && isOverLimit(3000, PLANS.pro)).toBe(false)
  })

  it('Standard at 500 is both over and blocked', () => {
    expect(isOverLimit(500, PLANS.standard)).toBe(true)
    expect(blocksAtLimit(PLANS.standard) && isOverLimit(500, PLANS.standard)).toBe(true)
  })
})

describe('overageUnits', () => {
  it('is zero while under quota and on unlimited plans', () => {
    expect(overageUnits(2999, PLANS.pro)).toBe(0)
    expect(overageUnits(3000, PLANS.pro)).toBe(0)
    expect(overageUnits(999_999, PLANS.enterprise)).toBe(0)
  })

  it('counts deflections past the included quota', () => {
    expect(overageUnits(3001, PLANS.pro)).toBe(1)
    expect(overageUnits(3450, PLANS.pro)).toBe(450)
  })
})

describe('overageCostCents', () => {
  it('is zero on hard-cap and unlimited plans regardless of usage', () => {
    expect(overageCostCents(10_000, PLANS.standard)).toBe(0)
    expect(overageCostCents(10_000, PLANS.enterprise)).toBe(0)
  })

  it('bills each whole-or-partial block of 100 over quota at the plan rate', () => {
    expect(overageCostCents(3000, PLANS.pro)).toBe(0)
    expect(overageCostCents(3001, PLANS.pro)).toBe(500) // 1 over -> first block
    expect(overageCostCents(3100, PLANS.pro)).toBe(500) // exactly 100 over
    expect(overageCostCents(3101, PLANS.pro)).toBe(1000) // into the second block
    expect(overageCostCents(3450, PLANS.pro)).toBe(2500) // 450 over -> 5 blocks
  })
})

describe('every plan carries the overage field', () => {
  it('so the Plan type stays exhaustive', () => {
    for (const p of ORDERED_PLANS) {
      expect(p).toHaveProperty('overageRatePer100Cents')
    }
  })
})
