import { auth } from '@/auth'
import { getResolvedTicketsThisWeek, insertFAQSnapshot } from '@/lib/db/queries/faq'
import { generateFAQ } from '@/lib/ai/faq-generator'
import { NoAIProviderConfiguredError } from '@/lib/ai/models'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'

export async function POST() {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = session.orgId ?? DEFAULT_ORG_ID

  const tickets = await getResolvedTicketsThisWeek(orgId)

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + 1) // Monday
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6) // Sunday

  let content: string
  try {
    content = await generateFAQ(tickets, orgId)
  } catch (err) {
    if (err instanceof NoAIProviderConfiguredError) {
      return Response.json({ error: 'No AI provider configured — connect one in Settings → AI Model to generate an FAQ.' }, { status: 503 })
    }
    throw err
  }
  const snapshot = await insertFAQSnapshot(
    weekStart.toISOString().split('T')[0],
    weekEnd.toISOString().split('T')[0],
    content,
    tickets.length,
    orgId
  )

  return Response.json({ ok: true, snapshot_id: snapshot.id, ticket_count: tickets.length })
}
