import { auth } from '@/auth'
import { getEmailDomain } from '@/lib/db/queries/email-domains'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const orgId = session.orgId ?? DEFAULT_ORG_ID
  const row = await getEmailDomain(orgId)
  if (!row) return Response.json(null)

  // Strip the internal Resend id from the client-facing response — not a
  // secret, but not needed by the UI either.
  const { provider_domain_id: _id, ...safe } = row
  return Response.json(safe)
}
