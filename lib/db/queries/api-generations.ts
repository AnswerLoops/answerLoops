import { eq, and, gte, sql } from 'drizzle-orm'
import { getDb } from '../drizzle'
import { apiGenerations } from '../schema'

/**
 * Accepts either the pooled handle or an open transaction, so the metering
 * layer can do these writes inside the same locked transaction as its counts.
 */
type Writer = Pick<ReturnType<typeof getDb>, 'insert' | 'update' | 'delete'>

/**
 * Claims a generate_answer slot, before the call runs. The row starts unbilled
 * (`high_confidence = 0`) because confidence is not known until the model has
 * answered — see `markApiGenerationBilled`. Writing it up front is what makes
 * an in-flight call visible to a concurrent one.
 *
 * keyId attributes the call to the API key that drove it — null for rows
 * written before per-key attribution existed.
 */
export async function reserveApiGeneration(
  orgId: number,
  keyId?: number | null,
  exec: Writer = getDb()
): Promise<number> {
  const [row] = await exec
    .insert(apiGenerations)
    .values({ orgId, keyId: keyId ?? null, highConfidence: 0 })
    .returning({ id: apiGenerations.id })
  return row.id
}

/**
 * Promotes a reserved row to a billed deflection. highConfidence mirrors
 * auto_deflected on tickets: only confident answers bill.
 */
export async function markApiGenerationBilled(
  id: number,
  exec: Writer = getDb()
): Promise<void> {
  await exec.update(apiGenerations).set({ highConfidence: 1 }).where(eq(apiGenerations.id, id))
}

/**
 * Drops a reserved row that never became a real call. Reserving writes the row
 * up front so concurrent calls can see it, which means a request that is
 * rejected *after* reserving would otherwise leave a permanent attempt behind
 * and consume the org's quota for nothing.
 *
 * Deliberately narrow: only ever call this for a reservation this same request
 * created and then abandoned. Never call it to undo a call that actually
 * reached the model — that row is real usage whether or not it was billable.
 */
export async function deleteApiGeneration(
  id: number,
  exec: Writer = getDb()
): Promise<void> {
  await exec.delete(apiGenerations).where(eq(apiGenerations.id, id))
}

/** Count of high-confidence generate_answer calls for the org since periodStart. */
export async function getMonthlyApiGenerations(orgId: number, periodStart: Date): Promise<number> {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(apiGenerations)
    .where(
      and(
        eq(apiGenerations.orgId, orgId),
        eq(apiGenerations.highConfidence, 1),
        gte(apiGenerations.createdAt, periodStart.toISOString())
      )
    )
  return Number(row?.n ?? 0)
}

/**
 * Count of *all* generate_answer calls since periodStart, high-confidence or
 * not. Deliberately separate from the billing count above: only high-confidence
 * generations bill as deflections, but every call costs an embedding plus two
 * LLM round trips, so the total needs a ceiling of its own.
 */
export async function getMonthlyApiGenerationAttempts(orgId: number, periodStart: Date): Promise<number> {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(apiGenerations)
    .where(
      and(eq(apiGenerations.orgId, orgId), gte(apiGenerations.createdAt, periodStart.toISOString()))
    )
  return Number(row?.n ?? 0)
}

/** Per-key call counts for the current period — powers usage attribution during incident response. */
export async function getApiGenerationsByKey(
  orgId: number,
  periodStart: Date
): Promise<{ keyId: number | null; calls: number }[]> {
  const rows = await getDb()
    .select({ keyId: apiGenerations.keyId, calls: sql<number>`count(*)::int` })
    .from(apiGenerations)
    .where(
      and(eq(apiGenerations.orgId, orgId), gte(apiGenerations.createdAt, periodStart.toISOString()))
    )
    .groupBy(apiGenerations.keyId)
  return rows.map((r) => ({ keyId: r.keyId, calls: Number(r.calls) }))
}
