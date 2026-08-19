import { auth } from '@/auth'
import { getEmailOauthConnection } from '@/lib/db/queries/email-oauth'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const orgId = session.orgId ?? DEFAULT_ORG_ID
  const row = await getEmailOauthConnection(orgId)
  if (!row) return Response.json(null)

  // Never expose access_token/refresh_token to the client.
  const { access_token: _at, refresh_token: _rt, ...safe } = row
  return Response.json(safe)
}
