import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'
import { orgHasFeature } from '@/lib/billing/entitlements-server'

// Permissions: View Channel + Send Messages + Read Message History + Add Reactions + Embed Links
const PERMISSIONS = '85056'

export async function GET(req: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'DISCORD_CLIENT_ID not configured' }, { status: 503 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = (session as { orgId?: number }).orgId ?? DEFAULT_ORG_ID
  if (!(await orgHasFeature(orgId, 'discord_integration'))) {
    return NextResponse.json({ error: 'Discord integration requires the Standard plan or above' }, { status: 403 })
  }

  const baseUrl = process.env.AUTH_URL ?? req.nextUrl.origin
  const redirectUri = `${baseUrl}/api/discord/callback`

  const state = Buffer.from(
    JSON.stringify({ orgId, ts: Date.now(), from: 'onboarding' })
  ).toString('base64url')

  const url = `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot&permissions=${PERMISSIONS}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`

  return NextResponse.json({ url })
}
