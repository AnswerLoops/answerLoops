import { auth } from '@/auth'
import { orgHasProductAccess } from '@/lib/billing/access'
import { navState, type NavState } from '@/components/marketing/chrome'

/**
 * Resolves what the marketing header should offer the current visitor.
 *
 * Kept in one place because every marketing page needs the same answer, and
 * because the interesting case is easy to miss: somebody who has signed in but
 * has no active plan is authenticated and still cannot enter the product. A
 * header deciding on authentication alone offers them the dashboard, the access
 * gate returns them to /pricing, and the header offers the dashboard again.
 *
 * Only queried for a signed-in visitor, so an anonymous request still costs
 * nothing beyond the session read these pages already do.
 */
export async function resolveNavState(): Promise<NavState> {
  const session = await auth()
  if (!session?.user) return navState(false, false)

  // No org claim means the session cannot be scoped to a workspace at all, so
  // it certainly has no plan. Treated as no-plan rather than assuming a default
  // org, which is the mistake the auth gate was fixed for.
  const orgId = session.orgId
  if (!orgId) return navState(true, false)

  return navState(true, await orgHasProductAccess(orgId))
}
