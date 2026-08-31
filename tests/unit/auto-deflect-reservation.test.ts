import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sql } from 'drizzle-orm'

// Behavioural coverage for lib/billing/usage.ts's reserveAutoDeflect, the fix
// for the ingest auto-deflect path (Discord/Slack/Telegram/Email) calling the
// old unlocked checkDeflectionLimit directly: concurrent tickets near an org's
// monthly cap could all read "allowed" before any write landed, letting the
// org blow past its plan's deflection ceiling.
//
// Same trick as tests/unit/metering-reservation.test.ts: both the pooled
// handle and the transaction handle are drizzle pg-proxy drivers, so every
// statement (including the caller-supplied writeDecision's own write) is
// tagged with which physical handle it landed on. Source-string assertions
// (tests/unit/auto-deflect-agent-wiring.test.ts) can't tell a same-transaction
// write from a same-looking write on a fresh connection — this file can.

type Call = { handle: 'pool' | 'tx'; sql: string; params: unknown[] }

const { calls, respond, txOpens } = vi.hoisted(() => ({
  calls: [] as Call[],
  respond: { deflections: 0 },
  txOpens: { count: 0 },
}))

const { getSubscription } = vi.hoisted(() => ({ getSubscription: vi.fn() }))

vi.mock('@/lib/db/queries/billing', () => ({ getSubscription }))

vi.mock('@/lib/db/drizzle', async () => {
  const { drizzle } = await import('drizzle-orm/pg-proxy')

  function rowsFor(sqlText: string): unknown[] {
    if (sqlText.includes('pg_advisory_xact_lock')) return []
    if (sqlText.includes('ai_assessments')) return [{ n: respond.deflections }]
    return []
  }

  const handle = (tag: 'pool' | 'tx') =>
    drizzle(async (sqlText: string, params: unknown[]) => {
      calls.push({ handle: tag, sql: sqlText, params })
      return { rows: rowsFor(sqlText) }
    })

  const pooled = handle('pool')
  const tx = handle('tx')

  const db = new Proxy(pooled, {
    get(target, prop, receiver) {
      if (prop === 'transaction') {
        return async (cb: (t: unknown) => unknown) => {
          txOpens.count += 1
          return cb(tx)
        }
      }
      const value = Reflect.get(target, prop, receiver)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })

  return { getDb: () => db }
})

async function usage() {
  return import('@/lib/billing/usage')
}

const STANDARD_LIMIT = 500 // PLANS.standard.deflectionsPerMonth

function onPlan(planId: string | null, status = 'active') {
  getSubscription.mockResolvedValue(planId === null ? null : { planId, status })
}

const txCalls = () => calls.filter((c) => c.handle === 'tx')
const poolCalls = () => calls.filter((c) => c.handle === 'pool')
const find = (needle: string) => calls.filter((c) => c.sql.includes(needle))

// The write-marker query lets a caller-supplied writeDecision leave a trace
// in `calls` tagged with whichever handle it actually received.
function markerWriteDecision() {
  const invocations: { tx: unknown; allowed: boolean }[] = []
  const fn = vi.fn(async (tx: { execute: (q: ReturnType<typeof sql>) => Promise<unknown> }, allowed: boolean) => {
    invocations.push({ tx, allowed })
    await tx.execute(sql`-- writeDecision marker ${allowed}`)
  })
  return { fn, invocations }
}

beforeEach(() => {
  calls.length = 0
  txOpens.count = 0
  respond.deflections = 0
  onPlan('standard')
  process.env.DEPLOYMENT_MODE = 'cloud'
  process.env.STRIPE_SECRET_KEY = 'test-stripe-configured'
})

afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY
  delete process.env.DEPLOYMENT_MODE
})

describe('reserveAutoDeflect: metered path holds the lock across count and write', () => {
  it('takes the advisory lock before counting, and the writeDecision write lands inside the same transaction', async () => {
    const { reserveAutoDeflect } = await usage()
    const { fn, invocations } = markerWriteDecision()

    const allowed = await reserveAutoDeflect(42, fn)

    expect(allowed).toBe(true)
    expect(invocations).toEqual([{ tx: expect.anything(), allowed: true }])

    // Ordering: lock, then count, then the caller's write — all inside one
    // transaction. A count that reaches the server before the lock is taken
    // can already be stale; a write on a different connection escapes the
    // lock's serialization entirely.
    expect(txCalls()[0].sql).toContain('pg_advisory_xact_lock')
    const markerCall = find('writeDecision marker')[0]
    expect(markerCall.handle).toBe('tx')
    expect(txOpens.count).toBe(1)
    expect(poolCalls()).toEqual([])
  })

  it('denies and still writes the decision when the org is at its deflection ceiling', async () => {
    respond.deflections = STANDARD_LIMIT
    const { reserveAutoDeflect } = await usage()
    const { fn, invocations } = markerWriteDecision()

    const allowed = await reserveAutoDeflect(42, fn)

    expect(allowed).toBe(false)
    // The whole point of the fix: even a denial must be persisted before the
    // lock releases, or a concurrent ticket can still observe stale state.
    expect(invocations).toEqual([{ tx: expect.anything(), allowed: false }])
    expect(find('writeDecision marker')[0].handle).toBe('tx')
  })

  it('keys the lock on the org id, using the same lock class as reserveGeneration/commitDeflection', async () => {
    const { reserveAutoDeflect } = await usage()
    const { fn } = markerWriteDecision()
    await reserveAutoDeflect(7, fn)

    const [lock] = find('pg_advisory_xact_lock')
    expect(lock.params).toHaveLength(2)
    expect(lock.params[1]).toBe(7)
    // 8231 is METERING_LOCK_CLASS, shared across all three metering entry
    // points so they exclude each other on the same org.
    expect(lock.params[0]).toBe(8231)
  })
})

describe('reserveAutoDeflect: soft-cap plan keeps deflecting past the quota', () => {
  const PRO_LIMIT = 3000 // PLANS.pro.deflectionsPerMonth

  it('grants past the included quota — the overage is metered, not blocked', async () => {
    onPlan('pro')
    respond.deflections = PRO_LIMIT + 250
    const { reserveAutoDeflect } = await usage()
    const { fn, invocations } = markerWriteDecision()

    const allowed = await reserveAutoDeflect(42, fn)

    // Standard at its ceiling denies (see above); Pro is a soft cap, so the
    // answer still goes out and the decision is written as allowed.
    expect(allowed).toBe(true)
    expect(invocations).toEqual([{ tx: expect.anything(), allowed: true }])
    // Still counts under the lock — the overage number has to stay accurate.
    expect(txCalls()[0].sql).toContain('pg_advisory_xact_lock')
    expect(find('ai_assessments').length).toBeGreaterThan(0)
  })
})

describe('reserveAutoDeflect: unlimited plan skips counting but still writes', () => {
  it('writes the decision without opening a transaction to count against a null ceiling', async () => {
    onPlan('enterprise')
    const { reserveAutoDeflect } = await usage()
    const { fn, invocations } = markerWriteDecision()

    const allowed = await reserveAutoDeflect(42, fn)

    expect(allowed).toBe(true)
    expect(invocations).toEqual([{ tx: expect.anything(), allowed: true }])
    expect(txOpens.count).toBe(0)
    expect(find('ai_assessments')).toEqual([])
  })
})

describe('reserveAutoDeflect: short-circuit branches still call writeDecision', () => {
  it('self-hosted (no Stripe wired up): grants and writes without checking a subscription status', async () => {
    delete process.env.DEPLOYMENT_MODE
    delete process.env.STRIPE_SECRET_KEY
    getSubscription.mockClear()
    const { reserveAutoDeflect } = await usage()
    const { fn, invocations } = markerWriteDecision()

    const allowed = await reserveAutoDeflect(42, fn)

    expect(allowed).toBe(true)
    // No assessment silently goes unsaved just because this deployment
    // isn't metered.
    expect(invocations).toEqual([{ tx: expect.anything(), allowed: true }])
    expect(getSubscription).not.toHaveBeenCalled()
    expect(txOpens.count).toBe(0)
  })

  it('cloud misconfigured (no Stripe key): denies but still writes the decision', async () => {
    delete process.env.STRIPE_SECRET_KEY
    const { reserveAutoDeflect } = await usage()
    const { fn, invocations } = markerWriteDecision()

    const allowed = await reserveAutoDeflect(42, fn)

    expect(allowed).toBe(false)
    // A misconfigured deployment must not silently drop the assessment —
    // it has to be written as not-deflected, not skipped.
    expect(invocations).toEqual([{ tx: expect.anything(), allowed: false }])
  })

  it('no active access (canceled subscription): denies but still writes the decision', async () => {
    onPlan('standard', 'canceled')
    const { reserveAutoDeflect } = await usage()
    const { fn, invocations } = markerWriteDecision()

    const allowed = await reserveAutoDeflect(42, fn)

    expect(allowed).toBe(false)
    expect(invocations).toEqual([{ tx: expect.anything(), allowed: false }])
    expect(txOpens.count).toBe(0)
  })

  it('no subscription row at all: denies but still writes the decision', async () => {
    onPlan(null)
    const { reserveAutoDeflect } = await usage()
    const { fn, invocations } = markerWriteDecision()

    const allowed = await reserveAutoDeflect(42, fn)

    expect(allowed).toBe(false)
    expect(invocations).toEqual([{ tx: expect.anything(), allowed: false }])
  })

  it('unresolvable plan id: denies but still writes the decision', async () => {
    onPlan('not-a-real-plan')
    const { reserveAutoDeflect } = await usage()
    const { fn, invocations } = markerWriteDecision()

    const allowed = await reserveAutoDeflect(42, fn)

    expect(allowed).toBe(false)
    expect(invocations).toEqual([{ tx: expect.anything(), allowed: false }])
  })

  it('every short-circuit branch calls writeDecision exactly once, never zero and never twice', async () => {
    const scenarios: Array<() => void> = [
      () => {
        delete process.env.DEPLOYMENT_MODE
        delete process.env.STRIPE_SECRET_KEY
      },
      () => {
        delete process.env.STRIPE_SECRET_KEY
      },
      () => onPlan('standard', 'canceled'),
      () => onPlan(null),
      () => onPlan('not-a-real-plan'),
    ]

    for (const setup of scenarios) {
      process.env.DEPLOYMENT_MODE = 'cloud'
      process.env.STRIPE_SECRET_KEY = 'test-stripe-configured'
      onPlan('standard')
      setup()

      const { reserveAutoDeflect } = await usage()
      const { fn } = markerWriteDecision()
      await reserveAutoDeflect(42, fn)
      expect(fn).toHaveBeenCalledTimes(1)
    }
  })
})
