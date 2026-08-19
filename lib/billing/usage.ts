import { sql } from 'drizzle-orm'
import { getDb } from '@/lib/db/drizzle'
import { getSubscription } from '@/lib/db/queries/billing'
import {
  getMonthlyApiGenerations,
  getMonthlyApiGenerationAttempts,
  reserveApiGeneration,
  markApiGenerationBilled,
  deleteApiGeneration,
} from '@/lib/db/queries/api-generations'
import { getPlan, isOverLimit, getDeploymentMode, isCloudMisconfigured, hasActiveAccess } from './plans'
import { logger } from '@/lib/logger'

export async function getMonthlyDeflections(orgId: number): Promise<number> {
  const db = getDb()
  const periodStart = new Date()
  periodStart.setDate(1)
  periodStart.setHours(0, 0, 0, 0)

  const [[row], apiGenerations] = await Promise.all([
    db.execute(sql`
      SELECT COUNT(*)::int AS n
      FROM ai_assessments a
      JOIN tickets t ON t.id = a.ticket_id
      WHERE t.org_id = ${orgId}
        AND a.auto_deflected = 1
        AND t.created_at >= ${periodStart.toISOString()}
    `) as unknown as [{ n: number }],
    // generate_answer never creates a ticket, so its high-confidence calls
    // are tracked separately and folded into the same monthly count.
    getMonthlyApiGenerations(orgId, periodStart),
  ])

  return Number(row?.n ?? 0) + apiGenerations
}

export async function checkDeflectionLimit(orgId: number): Promise<{
  allowed: boolean
  used: number
  limit: number | null
  planId: string
}> {
  const [sub, used] = await Promise.all([
    getSubscription(orgId),
    getMonthlyDeflections(orgId),
  ])

  // Cloud deployment missing its Stripe key is a misconfiguration, not a
  // valid unmetered state — never let this fall through to the self-hosted
  // branch below, which would grant unlimited free usage to paying orgs.
  if (isCloudMisconfigured()) {
    return { allowed: false, used, limit: 0, planId: 'misconfigured' }
  }

  // Self-hosted, no Stripe wired up — not metered. `used` is still real
  // (worth showing in Settings), there's just no cap to check it against.
  if (getDeploymentMode() === 'self-hosted') {
    return { allowed: true, used, limit: null, planId: 'self-hosted' }
  }

  // No subscription row, or a status Stripe no longer considers paid
  // (canceled, unpaid, incomplete_expired, ...) — there is no free tier to
  // fall back to, so this is zero access, not a degraded plan.
  if (!hasActiveAccess(sub?.status)) {
    return { allowed: false, used, limit: 0, planId: sub?.planId ?? 'none' }
  }

  const plan = getPlan(sub?.planId)
  if (!plan) {
    return { allowed: false, used, limit: 0, planId: sub?.planId ?? 'none' }
  }

  // trialing / active / past_due all use the plan's deflection limit
  const allowed = !isOverLimit(used, plan)
  return { allowed, used, limit: plan.deflectionsPerMonth, planId: plan.id }
}

/**
 * How many generate_answer *attempts* an org gets per month, as a multiple of
 * its billed deflection allowance.
 *
 * Only high-confidence generations count as deflections, which is the right
 * billing rule — an org shouldn't pay for an answer the model wasn't
 * confident in. The side effect was that low-confidence calls incremented
 * nothing, so `checkDeflectionLimit` never tripped for them and a caller
 * whose questions consistently scored low could run an embedding plus two LLM
 * round trips at the full rate limit indefinitely, forever, for free. The
 * per-minute rate limit was the only ceiling on that spend.
 *
 * 5x is deliberately loose: a healthy caller lands well under it (most
 * questions against a populated KB score high), so this bites abuse and
 * pathological misuse rather than normal traffic. Tune here, not at call sites.
 */
export const GENERATION_ATTEMPT_MULTIPLIER = 5

/**
 * Advisory-lock class for per-org metering. Paired with the org id, this gives
 * every org its own lock, so two orgs never wait on each other.
 */
const METERING_LOCK_CLASS = 8231

function monthStart(): Date {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

type Executor = { execute: (q: ReturnType<typeof sql>) => Promise<unknown> }

/** Deflections so far this period: auto-deflected tickets plus billed generations. */
async function countDeflections(tx: Executor, orgId: number, periodStart: Date): Promise<number> {
  const rows = (await tx.execute(sql`
    SELECT (
      SELECT COUNT(*)::int
      FROM ai_assessments a
      JOIN tickets t ON t.id = a.ticket_id
      WHERE t.org_id = ${orgId}
        AND a.auto_deflected = 1
        AND t.created_at >= ${periodStart.toISOString()}
    ) + (
      SELECT COUNT(*)::int
      FROM api_generations
      WHERE org_id = ${orgId}
        AND high_confidence = 1
        AND created_at >= ${periodStart.toISOString()}
    ) AS n
  `)) as unknown as [{ n: number }]
  return Number(rows[0]?.n ?? 0)
}

/** Every generate_answer call this period, billed or not. */
async function countAttempts(tx: Executor, orgId: number, periodStart: Date): Promise<number> {
  const rows = (await tx.execute(sql`
    SELECT COUNT(*)::int AS n
    FROM api_generations
    WHERE org_id = ${orgId}
      AND created_at >= ${periodStart.toISOString()}
  `)) as unknown as [{ n: number }]
  return Number(rows[0]?.n ?? 0)
}

export type GenerationReservation =
  | { granted: true; generationId: number }
  | { granted: false; reason: 'deflection-limit' | 'attempt-limit'; used: number; limit: number }

/**
 * Claims a generate_answer slot before any model work happens.
 *
 * Both ceilings are checked and the usage row is written inside one
 * transaction, serialized per org by an advisory lock. Checking and recording
 * as two separate round trips let concurrent callers all observe "allowed"
 * before any of their writes landed, so an org could pass a ceiling it had
 * already reached. Reserving up front also means the row exists while the call
 * is in flight, so a concurrent caller counts it.
 *
 * The lock is held only for the counting and the insert — never across the
 * embedding or model calls, which take seconds.
 *
 * The row is reserved as an attempt (`high_confidence = 0`). Call
 * `commitDeflection` once confidence is known to bill it. If the process dies
 * in between, the row stays an unbilled attempt: the caller is not charged for
 * a request that produced nothing, and the spend it did cost is still counted.
 */
export async function reserveGeneration(
  orgId: number,
  keyId?: number | null
): Promise<GenerationReservation> {
  // Cloud missing its Stripe key: misconfiguration, not unmetered — deny
  // rather than silently granting free usage.
  if (isCloudMisconfigured()) {
    return { granted: false, reason: 'deflection-limit', used: 0, limit: 0 }
  }

  // Self-hosted, no Stripe wired up — not metered, no ceiling to serialize
  // against, so no advisory lock or limit-counting query needed either.
  if (getDeploymentMode() === 'self-hosted') {
    const generationId = await reserveApiGeneration(orgId, keyId)
    return { granted: true, generationId }
  }

  const sub = await getSubscription(orgId)
  const periodStart = monthStart()

  if (!hasActiveAccess(sub?.status)) {
    return { granted: false, reason: 'deflection-limit', used: 0, limit: 0 }
  }

  const plan = getPlan(sub?.planId)
  if (!plan) {
    return { granted: false, reason: 'deflection-limit', used: 0, limit: 0 }
  }

  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${METERING_LOCK_CLASS}, ${orgId})`)

    if (plan.deflectionsPerMonth !== null) {
      const deflections = await countDeflections(tx, orgId, periodStart)
      if (isOverLimit(deflections, plan)) {
        return {
          granted: false as const,
          reason: 'deflection-limit' as const,
          used: deflections,
          limit: plan.deflectionsPerMonth,
        }
      }

      const attemptLimit = plan.deflectionsPerMonth * GENERATION_ATTEMPT_MULTIPLIER
      const attempts = await countAttempts(tx, orgId, periodStart)
      if (attempts >= attemptLimit) {
        return {
          granted: false as const,
          reason: 'attempt-limit' as const,
          used: attempts,
          limit: attemptLimit,
        }
      }
    }

    const generationId = await reserveApiGeneration(orgId, keyId, tx)
    return { granted: true as const, generationId }
  })
}

/**
 * Promotes a reserved generation to a billed deflection, if the org is still
 * under its limit.
 *
 * Re-checked under the same per-org lock rather than trusting the reservation:
 * confidence is only known after the model returns, so several in-flight calls
 * can each hold a reservation and then all turn out to be billable. Without
 * this the org would be billed past its plan limit.
 *
 * Returns false when the slot is gone. The caller still gets its answer — the
 * work is already paid for on our side — but it is not billed. That direction
 * is deliberate: at the boundary, give the answer away rather than charge for
 * something the plan did not cover.
 */
/**
 * Gives back a reservation whose request never reached the model.
 *
 * Attempts are counted against a multiple of the plan's deflection allowance,
 * so a reservation left behind by a request that was rejected after reserving
 * is indistinguishable from a real attempt and consumes quota the org never
 * used. Callers must release on every path between reserving and the model
 * call.
 *
 * Never call this once the model has been invoked — that attempt is real usage
 * whether or not the answer turned out to be billable.
 *
 * Best-effort by design: failing to release must not turn a handled rejection
 * into a 500, so this swallows and logs. The worst case is the pre-existing
 * behaviour of a stranded row.
 */
export async function releaseGeneration(generationId: number): Promise<void> {
  try {
    await deleteApiGeneration(generationId)
  } catch (e) {
    logger.error('releaseGeneration failed; reservation left stranded', {
      module: 'billing/usage',
      generationId,
      error: e,
    })
  }
}

export async function commitDeflection(orgId: number, generationId: number): Promise<boolean> {
  if (isCloudMisconfigured()) return false

  if (getDeploymentMode() === 'self-hosted') {
    await markApiGenerationBilled(generationId)
    return true
  }

  const sub = await getSubscription(orgId)
  const plan = getPlan(sub?.planId)

  // Access may have lapsed between reserveGeneration and commitDeflection
  // (e.g. the subscription was canceled mid-flight) — don't bill a slot
  // that no longer has a plan behind it. The caller already has its answer;
  // this only decides whether it's billed as a deflection.
  if (!plan) return false

  if (plan.deflectionsPerMonth === null) {
    await markApiGenerationBilled(generationId)
    return true
  }

  const periodStart = monthStart()

  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${METERING_LOCK_CLASS}, ${orgId})`)

    const deflections = await countDeflections(tx, orgId, periodStart)
    if (isOverLimit(deflections, plan)) return false

    await markApiGenerationBilled(generationId, tx)
    return true
  })
}

/**
 * Atomically decides whether a ticket's auto-deflect should count against the
 * plan's monthly limit, and persists that decision via `writeDecision` before
 * releasing the per-org advisory lock.
 *
 * The ingest auto-deflect path (unlike `reserveGeneration`/`commitDeflection`)
 * has no separate "attempt" row to reserve up front — the assessment is
 * already computed by the time this runs, and the only billable write is the
 * `ai_assessments.auto_deflected` flag itself. Checking the limit and writing
 * that flag as two separate steps let concurrent tickets for the same org all
 * observe "allowed" before any of their writes landed, so the org could pass
 * its limit. Holding the lock across both closes that gap.
 */
export async function reserveAutoDeflect(
  orgId: number,
  writeDecision: (tx: Pick<ReturnType<typeof getDb>, 'insert'>, autoDeflected: boolean) => Promise<void>
): Promise<boolean> {
  const db = getDb()

  if (isCloudMisconfigured()) {
    await writeDecision(db, false)
    return false
  }

  if (getDeploymentMode() === 'self-hosted') {
    await writeDecision(db, true)
    return true
  }

  const sub = await getSubscription(orgId)

  if (!hasActiveAccess(sub?.status)) {
    await writeDecision(db, false)
    return false
  }

  const plan = getPlan(sub?.planId)
  if (!plan) {
    await writeDecision(db, false)
    return false
  }

  if (plan.deflectionsPerMonth === null) {
    await writeDecision(db, true)
    return true
  }

  const periodStart = monthStart()

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${METERING_LOCK_CLASS}, ${orgId})`)

    const deflections = await countDeflections(tx, orgId, periodStart)
    const allowed = !isOverLimit(deflections, plan)
    await writeDecision(tx, allowed)
    return allowed
  })
}
