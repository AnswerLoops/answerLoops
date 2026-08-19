import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { orgHasFeature } from '@/lib/billing/entitlements-server'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'

// channels:join lets the bot add itself to a public channel once selected in
// the picker — without it, Slack never adds the bot to any channel on its
// own and conversations.history silently fails with not_in_channel forever.
// users:read resolves a message's raw user id to a display name via
// users.info (lib/slack/user-info.ts) — without it every Slack ticket's
// "From" field shows an opaque id like U0BMB9H6SFQ instead of a name. Not
// retroactive: an org that connected before this scope was added keeps its
// old-scoped token until it disconnects and reconnects.
const SCOPES = 'channels:history,channels:read,channels:join,chat:write,reactions:write,users:read'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = (session as { orgId?: number }).orgId ?? DEFAULT_ORG_ID
  if (!(await orgHasFeature(orgId, 'slack_integration'))) {
    return Response.json({ error: 'Slack integration requires the Standard plan or above' }, { status: 403 })
  }

  const clientId = process.env.SLACK_CLIENT_ID
  if (!clientId) return Response.json({ error: 'SLACK_CLIENT_ID not configured' }, { status: 503 })

  const baseUrl = process.env.AUTH_URL ?? req.nextUrl.origin
  const redirectUri = `${baseUrl}/api/slack/callback`
  const from = req.nextUrl.searchParams.get('from') ?? undefined
  const state = Buffer.from(JSON.stringify({ orgId, ts: Date.now(), from })).toString('base64url')

  const url = new URL('https://slack.com/oauth/v2/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)

  return Response.json({ url: url.toString() })
}
