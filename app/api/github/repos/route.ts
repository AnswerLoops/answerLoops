import { auth } from '@/auth'
import { getRepos } from '@/lib/db/queries/github'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'

export async function GET() {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = session.orgId ?? DEFAULT_ORG_ID
  return Response.json(await getRepos(orgId))
}
