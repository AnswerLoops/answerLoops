import { auth } from '@/auth'
import { getOrgMembers } from '@/lib/db/queries/members'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'

export async function GET() {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = session.orgId ?? DEFAULT_ORG_ID
  const members = await getOrgMembers(orgId)
  return Response.json(members)
}
