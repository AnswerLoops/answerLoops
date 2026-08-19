import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Each plan must read STRIPE_PRICE_<its own id>.
 *
 * This drifted once and was live in production. The 2026-07-29 rename
 * (pro→standard, scale→pro) deliberately left the old env var names alone,
 * reasoning that a var name is only a label on an opaque Stripe id. Deployments
 * were then configured from the plan names instead, so the code read
 * STRIPE_PRICE_PRO for the Standard plan while the environment had that var set
 * to the Pro price. Standard billed the wrong amount, and Pro read an unset
 * STRIPE_PRICE_SCALE and returned "No Stripe price for this plan" at checkout.
 *
 * Neither failure surfaces until a customer hits it: the price shown in the app
 * comes from `priceMonthly` in the code, and the amount charged comes from the
 * Stripe Price object. Nothing reconciles the two at runtime.
 */

const PLAN_IDS = ['standard', 'pro', 'enterprise'] as const

const originalEnv = { ...process.env }

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('each plan resolves the env var matching its own id', () => {
  it.each(PLAN_IDS)('%s reads STRIPE_PRICE_<own id>', async (planId) => {
    // A distinct sentinel per var, so a plan reading a sibling's var fails with
    // an obvious mismatch rather than coincidentally passing.
    for (const id of PLAN_IDS) {
      process.env[`STRIPE_PRICE_${id.toUpperCase()}`] = `price_sentinel_${id}`
    }

    const { PLANS } = await import('@/lib/billing/plans')

    expect(
      PLANS[planId].stripePriceId,
      `plan "${planId}" is not reading STRIPE_PRICE_${planId.toUpperCase()} — ` +
        `it resolved to ${PLANS[planId].stripePriceId}, which belongs to a different plan. ` +
        `That bills the wrong amount for one plan and breaks checkout for another.`,
    ).toBe(`price_sentinel_${planId}`)
  })

  it('every plan is unpurchasable-but-explicit when its var is unset', async () => {
    for (const id of PLAN_IDS) delete process.env[`STRIPE_PRICE_${id.toUpperCase()}`]

    const { PLANS } = await import('@/lib/billing/plans')

    // null rather than undefined or a stale fallback: checkout returns an
    // explicit 400 on null, which is the correct failure for a plan that has no
    // configured price.
    for (const id of PLAN_IDS) expect(PLANS[id].stripePriceId).toBeNull()
  })

  it('no plan reads a var for a plan that no longer exists', () => {
    // 'scale' and the old 'pro'-means-Standard mapping are both gone. A
    // reference to a retired name is how this broke: the var was simply never
    // set in any environment, so the plan silently had no price.
    const src = fs.readFileSync(path.join(process.cwd(), 'lib/billing/plans.ts'), 'utf-8')
    const referenced = [...src.matchAll(/process\.env\.STRIPE_PRICE_([A-Z_]+)/g)].map((m) =>
      m[1].toLowerCase(),
    )
    expect(referenced.length).toBe(PLAN_IDS.length)
    for (const name of referenced) {
      expect(
        PLAN_IDS as readonly string[],
        `plans.ts reads STRIPE_PRICE_${name.toUpperCase()}, which is not a current plan id`,
      ).toContain(name)
    }
  })
})

describe('documented env vars match what the code reads', () => {
  // The docs are how a deployment gets configured, so a var named in the code
  // but absent from the docs produces exactly this bug in the next environment.
  const docs = [
    'ENV-VARS.md',
    'content/docs/reference/environment-variables.mdx',
  ]

  it.each(docs)('%s names the vars the code actually reads', (docPath) => {
    const doc = fs.readFileSync(path.join(process.cwd(), docPath), 'utf-8')
    for (const id of PLAN_IDS) {
      expect(doc, `${docPath} does not mention STRIPE_PRICE_${id.toUpperCase()}`).toContain(
        `STRIPE_PRICE_${id.toUpperCase()}`,
      )
    }
    expect(doc, `${docPath} still documents the retired STRIPE_PRICE_SCALE`).not.toContain(
      'STRIPE_PRICE_SCALE',
    )
  })
})
