import { and, eq, inArray } from 'drizzle-orm'
import { getDb } from '../drizzle'
import { orgFeatureFlags } from '../schema'

/**
 * Org ids (out of the given candidates) where key=value in org_feature_flags.
 * Batched rather than one lookup per org — every caller here is filtering an
 * existing list (e.g. the bot's active Slack integrations), not asking about
 * a single org in isolation.
 *
 * This table is written only by an internal process outside this app —
 * nothing in this app ever writes to it.
 */
export async function getOrgIdsWithFlag(
  orgIds: number[],
  key: string,
  value = '1'
): Promise<Set<number>> {
  if (orgIds.length === 0) return new Set()
  const rows = await getDb()
    .select({ orgId: orgFeatureFlags.orgId })
    .from(orgFeatureFlags)
    .where(and(
      inArray(orgFeatureFlags.orgId, orgIds),
      eq(orgFeatureFlags.key, key),
      eq(orgFeatureFlags.value, value)
    ))
  return new Set(rows.map((r) => r.orgId))
}
