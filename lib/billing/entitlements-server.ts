import { getDeploymentMode, getPlan, hasActiveAccess } from './plans'
import { getSubscription } from '@/lib/db/queries/billing'
import { hasFeature, rateLimitPerMinute, type Feature } from './entitlements'

/**
 * Looks up an org's current plan and checks entitlement in one call — the
 * common case at server call sites. Checks subscription status, not just
 * planId: a canceled/unpaid/expired subscription (or no subscription row at
 * all) has zero access regardless of which plan it was last on — there is
 * no free tier to fall back to.
 */
export async function orgHasFeature(orgId: number, feature: Feature): Promise<boolean> {
  if (getDeploymentMode() === 'self-hosted') return true
  const sub = await getSubscription(orgId)
  if (!hasActiveAccess(sub?.status)) return false
  const plan = getPlan(sub?.planId)
  return plan ? hasFeature(plan.id, feature) : false
}

/**
 * Self-hosted gets the Enterprise ceiling rather than a literal unlimited —
 * it's still a single instance whose resources are worth protecting, even
 * though self-hosted orgs are never feature-gated.
 */
export async function orgRateLimitPerMinute(orgId: number): Promise<number> {
  if (getDeploymentMode() === 'self-hosted') return rateLimitPerMinute('enterprise')
  const sub = await getSubscription(orgId)
  if (!hasActiveAccess(sub?.status)) return 0
  const plan = getPlan(sub?.planId)
  return plan ? rateLimitPerMinute(plan.id) : 0
}
