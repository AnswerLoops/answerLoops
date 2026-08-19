import { auth } from '@/auth'
import { getIntegration } from '@/lib/db/queries/integrations'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'

interface SlackChannel {
  id: string
  name: string
  is_member: boolean
  num_members: number
}

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = (session as { orgId?: number }).orgId ?? DEFAULT_ORG_ID

  const integration = await getIntegration(orgId, 'slack')
  if (!integration?.bot_token) {
    return Response.json({ error: 'Slack not connected' }, { status: 400 })
  }

  const res = await fetch(
    'https://slack.com/api/conversations.list?types=public_channel&exclude_archived=true&limit=200',
    { headers: { Authorization: `Bearer ${integration.bot_token}` } }
  )
  const data = await res.json() as { ok: boolean; channels?: SlackChannel[]; error?: string }

  if (!data.ok) return Response.json({ error: data.error ?? 'slack_api_error' }, { status: 400 })

  const channels = (data.channels ?? [])
    .map((c) => ({ id: c.id, name: c.name, is_member: c.is_member, num_members: c.num_members }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return Response.json(channels)
}
