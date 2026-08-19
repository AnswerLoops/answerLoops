import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { exchangeGmailCode } from '@/lib/email/gmail'
import { upsertEmailOauthConnection } from '@/lib/db/queries/email-oauth'
import { upsertIntegration } from '@/lib/db/queries/integrations'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return Response.redirect(new URL('/login', req.url))

  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  const baseUrl = process.env.AUTH_URL ?? req.nextUrl.origin
  const settingsUrl = new URL('/settings', baseUrl)
  settingsUrl.searchParams.set('tab', 'email')

  let orgId: number
  try {
    const decoded = JSON.parse(Buffer.from(state ?? '', 'base64url').toString()) as { orgId: number; ts: number }
    if (Date.now() - decoded.ts > 10 * 60 * 1000) throw new Error('expired')
    orgId = decoded.orgId
  } catch {
    settingsUrl.searchParams.set('gmail_error', 'invalid_state')
    return Response.redirect(settingsUrl)
  }

  if (error || !code) {
    settingsUrl.searchParams.set('gmail_error', error ?? 'cancelled')
    return Response.redirect(settingsUrl)
  }

  const result = await exchangeGmailCode(code)
  if ('error' in result) {
    settingsUrl.searchParams.set('gmail_error', 'token_exchange_failed')
    return Response.redirect(settingsUrl)
  }

  await upsertEmailOauthConnection({
    orgId,
    provider: 'gmail',
    mailboxAddress: result.mailboxAddress,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    accessTokenExpiresAt: result.expiresAt,
    grantedScope: result.scope,
  })
  await upsertIntegration({ orgId, platform: 'email', emailSendMethod: 'oauth' })

  settingsUrl.searchParams.set('gmail_connected', '1')
  return Response.redirect(settingsUrl)
}
