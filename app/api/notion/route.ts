import { auth } from '@/auth'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'
import { getNotionConnection } from '@/lib/db/queries/notion'

export const dynamic = 'force-dynamic'

/** Connection state for the Settings card and the KB-page Notion panel. Never returns the token. */
export async function GET() {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = (session as { orgId?: number }).orgId ?? DEFAULT_ORG_ID

  const connection = await getNotionConnection(orgId)
  return Response.json({ connection })
}
