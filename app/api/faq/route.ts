import { auth } from '@/auth'
import { getLatestFAQ } from '@/lib/db/queries/faq'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'

export async function GET() {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const faq = await getLatestFAQ(session.orgId ?? DEFAULT_ORG_ID)
  return Response.json(faq ?? { content: null })
}
