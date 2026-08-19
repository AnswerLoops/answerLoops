import { auth } from '@/auth'
import { listArticles } from '@/lib/db/queries/kb'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  const orgId = session?.orgId ?? DEFAULT_ORG_ID
  return Response.json(await listArticles(true, orgId))
}
