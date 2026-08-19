import { auth } from '@/auth'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'
import { getDeploymentMode } from '@/lib/billing/plans'
import { orgHasAIKey } from '@/lib/db/queries/ai-config'
import { getPlatformKeyTrialStatus } from '@/lib/billing/platform-key-trial'

export const dynamic = 'force-dynamic'

// Null means "not applicable" — either self-hosted (no trial concept, the
// platform key is already the self-hoster's own .env) or the org already
// has its own key configured. Only a cloud org with no key gets a real
// trial-status object back.
export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  const orgId = session.orgId ?? DEFAULT_ORG_ID

  if (getDeploymentMode() === 'self-hosted' || (await orgHasAIKey(orgId))) {
    return Response.json(null)
  }

  const status = await getPlatformKeyTrialStatus(orgId)
  return Response.json(status)
}
