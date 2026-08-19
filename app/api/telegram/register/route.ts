import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getIntegration } from '@/lib/db/queries/integrations'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = session.orgId ?? DEFAULT_ORG_ID
  const integration = await getIntegration(orgId, 'telegram')

  if (!integration?.bot_token) {
    return Response.json({ error: 'Save bot token first' }, { status: 400 })
  }
  if (!integration.bot_secret) {
    return Response.json({ error: 'Bot secret missing — re-save the integration' }, { status: 400 })
  }

  const baseUrl = process.env.AUTH_URL ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`
  const webhookUrl = `${baseUrl}/api/telegram/webhook`

  const res = await fetch(
    `https://api.telegram.org/bot${integration.bot_token}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: integration.bot_secret,
        allowed_updates: ['message'],
        drop_pending_updates: true,
      }),
    }
  )

  const data = await res.json() as { ok: boolean; description?: string }
  if (!res.ok || !data.ok) {
    return Response.json({ error: data.description ?? 'Telegram API error' }, { status: 502 })
  }

  return Response.json({ ok: true, webhookUrl })
}
