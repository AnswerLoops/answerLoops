import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Behavioural coverage for the generate_answer metering reservation:
//   lib/billing/usage.ts              (reserveGeneration / commitDeflection)
//   lib/db/queries/api-generations.ts (executor threading)
//
// The other three files that touch this change assert *source shape* — that
// the lock appears before the counts, that promotion follows the confidence
// grade. Those greps all keep passing if the counting and the insert drift
// onto different connections, which is exactly how the race reopens. So this
// file actually runs reserveGeneration and commitDeflection and watches which
// database handle every statement lands on.
//
// No DB and no Docker: both the pooled handle and the transaction handle are
// drizzle pg-proxy drivers, which hand us the compiled SQL and bound params
// instead of opening a socket. `getDb().transaction(cb)` is stubbed to invoke
// cb with the *transaction* handle, so a statement issued against the default
// pooled handle is distinguishable from one issued inside the transaction.

const ROOT = process.cwd()

type Call = { handle: 'pool' | 'tx'; sql: string; params: unknown[] }

const { calls, respond, txOpens } = vi.hoisted(() => ({
  calls: [] as Call[],
  respond: { deflections: 0, attempts: 0, apiGenerations: 0, insertId: 4242 },
  txOpens: { count: 0 },
}))

const { getSubscription } = vi.hoisted(() => ({ getSubscription: vi.fn() }))

vi.mock('@/lib/db/queries/billing', () => ({ getSubscription }))

vi.mock('@/lib/db/drizzle', async () => {
  const { drizzle } = await import('drizzle-orm/pg-proxy')

  // Raw db.execute() rows come back unmapped, so those responses are objects.
  // Query-builder rows go through drizzle's field mapper, which expects
  // positional arrays in select order.
  function rowsFor(sqlText: string): unknown[] {
    if (sqlText.includes('pg_advisory_xact_lock')) return []
    if (sqlText.includes('ai_assessments')) return [{ n: respond.deflections }]
    // Raw SQL in usage.ts is uppercase against an unquoted table name; the
    // query builder always emits lowercase against a quoted one.
    if (sqlText.includes('FROM api_generations')) return [{ n: respond.attempts }]
    if (sqlText.includes('insert into "api_generations"')) return [[respond.insertId]]
    if (sqlText.includes('count(*)')) return [[respond.apiGenerations]]
    return []
  }

  const handle = (tag: 'pool' | 'tx') =>
    drizzle(async (sqlText: string, params: unknown[]) => {
      calls.push({ handle: tag, sql: sqlText, params })
      return { rows: rowsFor(sqlText) }
    })

  const pooled = handle('pool')
  const tx = handle('tx')

  // pg-proxy refuses transactions, so the wrapper supplies one. The callback
  // receives a physically different handle — that is the whole point.
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
const ATTEMPT_LIMIT = STANDARD_LIMIT * 5 // GENERATION_ATTEMPT_MULTIPLIER

function onPlan(planId: string | null, status = 'active') {
  getSubscription.mockResolvedValue(planId === null ? null : { planId, status })
}

const txCalls = () => calls.filter((c) => c.handle === 'tx')
const poolCalls = () => calls.filter((c) => c.handle === 'pool')
const find = (needle: string) => calls.filter((c) => c.sql.includes(needle))

beforeEach(() => {
  calls.length = 0
  txOpens.count = 0
  respond.deflections = 0
  respond.attempts = 0
  respond.apiGenerations = 0
  respond.insertId = 4242
  onPlan('standard')
  // Every test in this file exercises the metered (cloud, Stripe-configured)
  // path — getDeploymentMode() defaults to 'self-hosted' when DEPLOYMENT_MODE
  // is unset, which would short-circuit reserveGeneration/commitDeflection
  // straight past all of it. Not secret-shaped on purpose: only truthiness is
  // checked, and this repo's placeholder-format rule bans realistic-looking
  // fake keys even in test fixtures.
  process.env.DEPLOYMENT_MODE = 'cloud'
  process.env.STRIPE_SECRET_KEY = 'test-stripe-configured'
})

afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY
  delete process.env.DEPLOYMENT_MODE
})

// ---------------------------------------------------------------------------
// Executor threading — the insert must run inside the locked transaction
// ---------------------------------------------------------------------------

describe('reserveGeneration: the write happens on the same connection as the counts', () => {
  it('inserts the usage row on the transaction handle, never the pooled one', async () => {
    const { reserveGeneration } = await usage()
    const res = await reserveGeneration(42, 7)

    expect(res).toEqual({ granted: true, generationId: 4242 })
    const inserts = find('insert into "api_generations"')
    expect(inserts.length).toBe(1)
    // If reserveApiGeneration were called without the tx argument it would
    // default to getDb() and the row would land on a different connection,
    // outside the advisory lock — the check-then-write race silently reopens
    // and every source-shape assertion in the other test files still passes.
    expect(inserts[0].handle).toBe('tx')
  })

  it('issues no statement at all outside the transaction while reserving', async () => {
    const { reserveGeneration } = await usage()
    await reserveGeneration(42, 7)

    // A count, a read, or a write on the pooled handle is unserialized by
    // definition: the lock only covers the transaction it was taken in.
    expect(poolCalls().map((c) => c.sql)).toEqual([])
    expect(txOpens.count).toBe(1)
  })

  it('takes the advisory lock before it counts or writes anything', async () => {
    const { reserveGeneration } = await usage()
    await reserveGeneration(42, 7)

    // Ordering asserted on actual execution, not on source position: a count
    // that reaches the server before the lock is taken can already be stale.
    expect(txCalls()[0].sql).toContain('pg_advisory_xact_lock')
    expect(txCalls().length).toBeGreaterThan(2)
  })
})

describe('commitDeflection: promotion runs inside its own locked transaction', () => {
  it('updates the row on the transaction handle it re-counted on', async () => {
    const { commitDeflection } = await usage()
    const billed = await commitDeflection(42, 4242)

    expect(billed).toBe(true)
    const updates = find('update "api_generations"')
    expect(updates.length).toBe(1)
    // Promoting on the pooled handle would let the update commit
    // independently of the re-check that authorized it, so two concurrent
    // promotions could both bill against the last remaining slot.
    expect(updates[0].handle).toBe('tx')
    expect(poolCalls()).toEqual([])
  })

  it('promotes exactly the reserved row, by id', async () => {
    const { commitDeflection } = await usage()
    await commitDeflection(42, 99)

    const [update] = find('update "api_generations"')
    // high_confidence = 1 for row 99. Scoping the update by org instead would
    // bill every in-flight reservation the moment any one of them succeeded.
    expect(update.params).toEqual([1, 99])
  })
})

// ---------------------------------------------------------------------------
// Lock identity — the two critical sections must actually exclude each other
// ---------------------------------------------------------------------------

describe('the reserve and promote critical sections share one lock', () => {
  it('keys the lock on the org id, so one org never blocks another', async () => {
    const { reserveGeneration } = await usage()
    await reserveGeneration(42, 7)

    const [lock] = find('pg_advisory_xact_lock')
    expect(lock.params).toHaveLength(2)
    // Second key is the org. A lock keyed on a constant would serialize every
    // org in the fleet behind one queue; keyed on the row or key id it would
    // serialize nothing.
    expect(lock.params[1]).toBe(42)
  })

  it('uses the identical lock class and key in reserveGeneration and commitDeflection', async () => {
    const { reserveGeneration, commitDeflection } = await usage()
    await reserveGeneration(42, 7)
    const reserveLock = find('pg_advisory_xact_lock')[0].params

    calls.length = 0
    await commitDeflection(42, 4242)
    const commitLock = find('pg_advisory_xact_lock')[0].params

    // Two different lock classes mean the two sections take different locks
    // and never wait on each other, so a promotion can slip past a concurrent
    // reservation's count and the ceiling stops holding.
    expect(commitLock).toEqual(reserveLock)
  })

  it('gives different orgs different lock keys', async () => {
    const { reserveGeneration } = await usage()
    await reserveGeneration(1)
    await reserveGeneration(2)

    const [a, b] = find('pg_advisory_xact_lock')
    expect(a.params[0]).toBe(b.params[0]) // same class
    expect(a.params[1]).not.toBe(b.params[1]) // different key
  })
})

// ---------------------------------------------------------------------------
// What "used" means — the counts must agree with the rest of the product
// ---------------------------------------------------------------------------

describe('countDeflections agrees with getMonthlyDeflections', () => {
  it('counts auto-deflected tickets and billed generations, the same two sources', async () => {
    const { getMonthlyDeflections, reserveGeneration } = await usage()

    // What the usage page shows.
    await getMonthlyDeflections(42)
    const shown = calls.map((c) => c.sql).join('\n')

    // What the gate enforces.
    calls.length = 0
    await reserveGeneration(42, 7)
    const enforced = find('ai_assessments')[0]

    for (const source of [shown, enforced.sql]) {
      // The dashboard reads getMonthlyDeflections; the gate reads its own
      // query. If the two drift, an org gets blocked at a number its usage
      // page never showed, or sails past the one it did.
      expect(source).toContain('ai_assessments')
      expect(source).toMatch(/auto_deflected"? = /)
      expect(source).toMatch(/api_generations/)
      expect(source).toMatch(/high_confidence"? = /)
    }
    // org id and period start, bound once per half of the union.
    expect(enforced.params).toEqual([42, expect.any(String), 42, expect.any(String)])
  })

  it('gates on the union, not on api_generations alone', async () => {
    // The allowance is a single pool across channels: the gate counts the
    // union of billable events, so usage through any one channel draws down
    // the same allowance the API reads.
    respond.deflections = STANDARD_LIMIT
    const { reserveGeneration } = await usage()
    const res = await reserveGeneration(42, 7)

    expect(res.granted).toBe(false)
    expect(res).toMatchObject({ reason: 'deflection-limit', used: STANDARD_LIMIT, limit: STANDARD_LIMIT })
  })

  it('re-checks promotion against the same query it reserved against', async () => {
    const { reserveGeneration, commitDeflection } = await usage()
    await reserveGeneration(42, 7)
    const reserveCount = find('ai_assessments')[0]

    calls.length = 0
    await commitDeflection(42, 4242)
    const commitCount = find('ai_assessments')[0]

    // Byte-identical SQL and binds. If the two definitions of "a deflection"
    // drift, the ceiling enforced at the gate is not the one enforced at the
    // till, and the difference is billed to the customer.
    expect(commitCount.sql).toBe(reserveCount.sql)
    expect(commitCount.params).toEqual(reserveCount.params)
  })

  it('does not count the in-flight reservation itself', async () => {
    const { reserveGeneration } = await usage()
    await reserveGeneration(42, 7)

    const [count] = find('ai_assessments')
    const [insert] = find('insert into "api_generations"')
    // The row is written unbilled and the deflection count filters on billed,
    // so a reservation cannot inflate the deflection number while the model
    // is still running. Reserving as high_confidence = 1 would make every
    // in-flight call consume a paid slot it might never earn.
    expect(insert.params[2]).toBe(0)
    expect(count.sql).toContain('high_confidence = 1')
  })
})

describe('countAttempts is the total, deliberately unfiltered', () => {
  it('counts every call regardless of confidence', async () => {
    const { reserveGeneration } = await usage()
    await reserveGeneration(42, 7)

    const attemptQuery = txCalls().find(
      (c) => c.sql.includes('FROM api_generations') && !c.sql.includes('ai_assessments')
    )
    expect(attemptQuery).toBeDefined()
    // Adding a high_confidence filter here collapses the attempt ceiling into
    // the deflection ceiling, and a caller whose answers never score high can
    // burn an embedding plus two LLM round trips per request forever.
    expect(attemptQuery!.sql).not.toContain('high_confidence')
  })

  it('trips at the multiplier over the plan allowance, before any model work', async () => {
    respond.attempts = ATTEMPT_LIMIT
    const { reserveGeneration } = await usage()
    const res = await reserveGeneration(42, 7)

    expect(res).toEqual({
      granted: false,
      reason: 'attempt-limit',
      used: ATTEMPT_LIMIT,
      limit: ATTEMPT_LIMIT,
    })
  })
})

describe('both counts are scoped to the current billing period', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('binds the start of the current month, at local midnight', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-24T15:30:00Z'))

    const { reserveGeneration } = await usage()
    await reserveGeneration(42, 7)

    const bound = calls
      .flatMap((c) => c.params)
      .filter((p): p is string => typeof p === 'string' && p.includes('T'))
    expect(bound.length).toBeGreaterThan(0)
    for (const iso of bound) {
      const d = new Date(iso)
      // A period start that drifts (rolling 30 days, epoch, "today") either
      // resets an org's allowance mid-cycle or never resets it at all.
      expect(d.getDate()).toBe(1)
      expect(d.getMonth()).toBe(new Date().getMonth())
      expect(d.getFullYear()).toBe(new Date().getFullYear())
      expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([0, 0, 0])
    }
  })

  it('scopes the deflection count and the attempt count to the same instant', async () => {
    const { reserveGeneration } = await usage()
    await reserveGeneration(42, 7)

    const deflectionStart = find('ai_assessments')[0].params.find((p) => typeof p === 'string')
    const attemptQuery = txCalls().find(
      (c) => c.sql.includes('FROM api_generations') && !c.sql.includes('ai_assessments')
    )!
    // Two clock reads mean the two ceilings can straddle a month boundary and
    // measure different periods on the same request.
    expect(attemptQuery.params).toContain(deflectionStart)
  })
})

// ---------------------------------------------------------------------------
// Refusals must not consume anything
// ---------------------------------------------------------------------------

describe('a refused reservation leaves no trace', () => {
  it('writes no row when the deflection ceiling is already reached', async () => {
    respond.deflections = STANDARD_LIMIT + 3
    const { reserveGeneration } = await usage()
    await reserveGeneration(42, 7)

    // A refusal that still inserted would inflate the attempt count on every
    // rejected request and lock the org out permanently once it hit its cap.
    expect(find('insert into "api_generations"')).toEqual([])
  })

  it('writes no row when the attempt ceiling is already reached', async () => {
    respond.attempts = ATTEMPT_LIMIT + 1
    const { reserveGeneration } = await usage()
    await reserveGeneration(42, 7)

    expect(find('insert into "api_generations"')).toEqual([])
  })

  it('checks the deflection ceiling before the attempt ceiling', async () => {
    respond.deflections = STANDARD_LIMIT
    respond.attempts = ATTEMPT_LIMIT
    const { reserveGeneration } = await usage()
    const res = await reserveGeneration(42, 7)

    // Both are blown. The deflection message tells the customer to upgrade;
    // the attempt message is an abuse signal. Reporting the wrong one sends a
    // paying customer chasing the wrong fix.
    expect(res).toMatchObject({ reason: 'deflection-limit' })
    expect(txCalls().filter((c) => c.sql.includes('FROM api_generations') && !c.sql.includes('ai_assessments'))).toEqual([])
  })

  it('refuses a canceled subscription without touching the database', async () => {
    onPlan('standard', 'canceled')
    const { reserveGeneration } = await usage()
    const res = await reserveGeneration(42, 7)

    expect(res).toEqual({ granted: false, reason: 'deflection-limit', used: 0, limit: 0 })
    // No transaction, no lock, no row: a canceled org must not be able to
    // reserve capacity, and must not queue behind the org lock to be told so.
    expect(txOpens.count).toBe(0)
    expect(calls).toEqual([])
  })

  it('still serves past-due and trialing subscriptions', async () => {
    for (const status of ['past_due', 'trialing']) {
      calls.length = 0
      onPlan('standard', status)
      const { reserveGeneration } = await usage()
      // past_due is a deliberate dunning grace period, trialing is the
      // 14-day trial itself. Widening the deny list to include these would
      // cut off customers mid-trial or during a recoverable payment failure.
      expect((await reserveGeneration(42, 7)).granted).toBe(true)
    }
  })

  it('refuses statuses Stripe no longer considers paid, even without a full cancellation', async () => {
    for (const status of ['unpaid', 'incomplete_expired']) {
      calls.length = 0
      onPlan('standard', status)
      const { reserveGeneration } = await usage()
      // There is no free tier: any status outside the active/trialing/past_due
      // set denies access, not just an explicit 'canceled'.
      expect((await reserveGeneration(42, 7)).granted).toBe(false)
    }
  })

  it('refuses an org with no subscription row at all — no free-tier fallback', async () => {
    onPlan(null)
    const { reserveGeneration } = await usage()
    const res = await reserveGeneration(42, 7)

    expect(res).toEqual({ granted: false, reason: 'deflection-limit', used: 0, limit: 0 })
    expect(txOpens.count).toBe(0)
    expect(calls).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Unlimited plans
// ---------------------------------------------------------------------------

describe('unlimited plans', () => {
  it('reserve a row without running either count', async () => {
    onPlan('enterprise')
    const { reserveGeneration } = await usage()
    const res = await reserveGeneration(42, 7)

    expect(res).toMatchObject({ granted: true })
    // The row still has to be written — usage attribution and the per-key
    // report read it — but counting against a null ceiling is wasted work
    // holding the org lock on the busiest accounts.
    expect(find('ai_assessments')).toEqual([])
    expect(find('insert into "api_generations"').length).toBe(1)
  })

  it('bill the reserved row instead of leaving it unbilled forever', async () => {
    onPlan('enterprise')
    const { commitDeflection } = await usage()
    const billed = await commitDeflection(42, 4242)

    expect(billed).toBe(true)
    // Short-circuiting the ceiling check must not short-circuit the promotion:
    // unlimited plans would otherwise report zero deflections on every usage
    // page and in every export.
    expect(find('update "api_generations"')[0].params).toEqual([1, 4242])
  })
})

// ---------------------------------------------------------------------------
// The in-flight boundary
// ---------------------------------------------------------------------------

describe('commitDeflection when the allowance filled while the call was in flight', () => {
  it('returns false and does not promote the row', async () => {
    respond.deflections = STANDARD_LIMIT
    const { commitDeflection } = await usage()
    const billed = await commitDeflection(42, 4242)

    expect(billed).toBe(false)
    // The answer still goes back to the caller — the spend is already
    // incurred — but promoting here would bill the org past its plan for a
    // slot a concurrent request had already taken.
    expect(find('update "api_generations"')).toEqual([])
  })

  it('promotes when a slot is still free', async () => {
    respond.deflections = STANDARD_LIMIT - 1
    const { commitDeflection } = await usage()
    expect(await commitDeflection(42, 4242)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Nothing bypasses the metering layer
// ---------------------------------------------------------------------------

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(rel, out)
    else if (/\.tsx?$/.test(entry.name)) out.push(rel)
  }
  return out
}

const SOURCE_DIRS = ['lib', 'app', 'components', 'tests', 'e2e', 'bot', 'scripts'].filter((d) =>
  fs.existsSync(path.join(ROOT, d))
)
// This file names the removed symbols in order to assert they are gone.
const SELF = path.join('tests', 'unit', 'metering-reservation.test.ts')
const sourceFiles = SOURCE_DIRS.flatMap((d) => walk(d)).filter((f) => f !== SELF)

describe('the removed pre-reservation API is gone for good', () => {
  it.each(['checkGenerationAttemptLimit', 'recordApiGeneration'])(
    'no file still references %s',
    (symbol) => {
      const hits = sourceFiles.filter((f) =>
        fs.readFileSync(path.join(ROOT, f), 'utf-8').includes(symbol)
      )
      // Both were check-then-write shaped. A surviving caller — or a
      // re-introduced helper with the old name — would meter that path
      // outside the lock while looking perfectly correct in review.
      expect(hits).toEqual([])
    }
  )

  it('only the metering layer writes to api_generations', () => {
    const writers = sourceFiles.filter(
      (f) =>
        !f.startsWith('tests') &&
        f !== path.join('lib', 'db', 'queries', 'api-generations.ts') &&
        /reserveApiGeneration|markApiGenerationBilled/.test(
          fs.readFileSync(path.join(ROOT, f), 'utf-8')
        )
    )
    // Any caller other than lib/billing/usage.ts is writing a usage row
    // without holding the org lock, which is the original bug wearing new
    // function names.
    expect(writers).toEqual([path.join('lib', 'billing', 'usage.ts')])
  })

  it('the agent core meters only through reserveGeneration and commitDeflection', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'agent', 'core.ts'), 'utf-8')
    expect(src).toContain('reserveGeneration')
    expect(src).toContain('commitDeflection')
    // core.ts reaching into the query layer directly would bypass both the
    // lock and the ceiling re-check.
    expect(src).not.toContain('reserveApiGeneration')
    expect(src).not.toContain('markApiGenerationBilled')
  })
})

// ---------------------------------------------------------------------------
// Self-hosted (no Stripe configured): not metered at all
// ---------------------------------------------------------------------------

describe('reserveGeneration / commitDeflection with no Stripe configured', () => {
  // The top-level beforeEach always sets DEPLOYMENT_MODE=cloud and
  // STRIPE_SECRET_KEY fresh before every test in this file, so no local
  // afterEach is needed to restore them here — each test below just deletes
  // both for its own duration, simulating an actual self-hosted deployment
  // (unset DEPLOYMENT_MODE, no Stripe key) rather than a misconfigured cloud
  // one (DEPLOYMENT_MODE=cloud, no Stripe key), which denies instead of
  // granting.

  it('reserveGeneration grants unconditionally, without ever checking getSubscription', async () => {
    delete process.env.DEPLOYMENT_MODE
    delete process.env.STRIPE_SECRET_KEY
    getSubscription.mockClear()
    const { reserveGeneration } = await usage()
    const res = await reserveGeneration(42, 7)

    expect(res).toEqual({ granted: true, generationId: 4242 })
    expect(getSubscription).not.toHaveBeenCalled()
    // Nothing metered means nothing to serialize against — no lock, no
    // counting queries, just the insert straight on the pooled handle.
    expect(txOpens.count).toBe(0)
    expect(find('pg_advisory_xact_lock').length).toBe(0)
    expect(find('countDeflections').length + find('count(*)::int').filter((c) => c.sql.includes('ai_assessments')).length).toBe(0)
    const inserts = find('insert into "api_generations"')
    expect(inserts.length).toBe(1)
    expect(inserts[0].handle).toBe('pool')
  })

  it('reserveGeneration ignores a canceled subscription — self-hosted has none to cancel', async () => {
    delete process.env.DEPLOYMENT_MODE
    delete process.env.STRIPE_SECRET_KEY
    onPlan('standard', 'canceled')
    const { reserveGeneration } = await usage()
    const res = await reserveGeneration(42)

    expect(res).toEqual({ granted: true, generationId: 4242 })
  })

  it('commitDeflection bills unconditionally, without re-checking any limit', async () => {
    delete process.env.DEPLOYMENT_MODE
    delete process.env.STRIPE_SECRET_KEY
    getSubscription.mockClear()
    const { commitDeflection } = await usage()
    const billed = await commitDeflection(42, 4242)

    expect(billed).toBe(true)
    expect(getSubscription).not.toHaveBeenCalled()
    expect(txOpens.count).toBe(0)
    const updates = find('update "api_generations"')
    expect(updates.length).toBe(1)
    expect(updates[0].handle).toBe('pool')
  })
})

// ---------------------------------------------------------------------------
// Deployment-mode detection: cloud vs self-hosted must never be confused
// ---------------------------------------------------------------------------

describe('checkDeflectionLimit respects explicit deployment mode', () => {
  it('reports self-hosted (unmetered) when DEPLOYMENT_MODE is unset, regardless of Stripe key', async () => {
    delete process.env.DEPLOYMENT_MODE
    delete process.env.STRIPE_SECRET_KEY
    const { checkDeflectionLimit } = await usage()
    const res = await checkDeflectionLimit(42)

    expect(res).toMatchObject({ allowed: true, limit: null, planId: 'self-hosted' })
  })

  it('is still self-hosted even if a Stripe key happens to be present, when mode is unset', async () => {
    delete process.env.DEPLOYMENT_MODE
    // STRIPE_SECRET_KEY is set by the top-level beforeEach — deployment mode
    // is decided by DEPLOYMENT_MODE alone, never inferred from the key.
    const { checkDeflectionLimit } = await usage()
    const res = await checkDeflectionLimit(42)

    expect(res).toMatchObject({ allowed: true, limit: null, planId: 'self-hosted' })
  })

  it('denies and reports misconfigured when DEPLOYMENT_MODE=cloud but no Stripe key is set — never falls back to unlimited', async () => {
    delete process.env.STRIPE_SECRET_KEY
    // DEPLOYMENT_MODE=cloud is set by the top-level beforeEach.
    const { checkDeflectionLimit } = await usage()
    const res = await checkDeflectionLimit(42)

    expect(res).toMatchObject({ allowed: false, limit: 0, planId: 'misconfigured' })
  })

  it('meters normally on cloud with a Stripe key present', async () => {
    // Both DEPLOYMENT_MODE=cloud and STRIPE_SECRET_KEY are set by the
    // top-level beforeEach; org is on standard via onPlan('standard').
    const { checkDeflectionLimit } = await usage()
    const res = await checkDeflectionLimit(42)

    expect(res).toMatchObject({ allowed: true, limit: STANDARD_LIMIT, planId: 'standard' })
  })

  it('reserveGeneration also denies rather than grants when cloud is misconfigured', async () => {
    delete process.env.STRIPE_SECRET_KEY
    const { reserveGeneration } = await usage()
    const res = await reserveGeneration(42, 7)

    expect(res).toEqual({ granted: false, reason: 'deflection-limit', used: 0, limit: 0 })
  })

  it('commitDeflection also denies rather than bills when cloud is misconfigured', async () => {
    delete process.env.STRIPE_SECRET_KEY
    const { commitDeflection } = await usage()
    const billed = await commitDeflection(42, 4242)

    expect(billed).toBe(false)
  })
})
