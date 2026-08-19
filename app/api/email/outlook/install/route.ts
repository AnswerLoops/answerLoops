import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'
import { buildOutlookAuthUrl } from '@/lib/email/outlook'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return Response.redirect(new URL('/login', req.url))

  const orgId = (session as { orgId?: number }).orgId ?? DEFAULT_ORG_ID
  const state = Buffer.from(JSON.stringify({ orgId, ts: Date.now() })).toString('base64url')

  const authUrl = buildOutlookAuthUrl(state)
  if (typeof authUrl !== 'string') {
    const settingsUrl = new URL('/settings', process.env.AUTH_URL ?? req.nextUrl.origin)
    settingsUrl.searchParams.set('tab', 'email')
    settingsUrl.searchParams.set('outlook_error', 'server_misconfigured')
    return Response.redirect(settingsUrl)
  }

  return Response.redirect(authUrl)
}
