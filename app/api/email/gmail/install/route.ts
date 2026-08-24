import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'
import { buildGmailAuthUrl } from '@/lib/email/gmail'

export const GMAIL_OAUTH_STATE_COOKIE = 'answerloops-gmail-oauth-state'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return Response.redirect(new URL('/login', req.url))

  const orgId = (session as { orgId?: number }).orgId ?? DEFAULT_ORG_ID
  const state = Buffer.from(JSON.stringify({ orgId, ts: Date.now() })).toString('base64url')

  const authUrl = buildGmailAuthUrl(state)
  if (typeof authUrl !== 'string') {
    const settingsUrl = new URL('/settings', process.env.AUTH_URL ?? req.nextUrl.origin)
    settingsUrl.searchParams.set('tab', 'email')
    settingsUrl.searchParams.set('gmail_error', 'server_misconfigured')
    return Response.redirect(settingsUrl)
  }

  const response = NextResponse.redirect(authUrl)
  response.cookies.set(GMAIL_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60,
    path: '/',
  })
  return response
}
