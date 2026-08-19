import { auth } from '@/auth'
import { getTickets } from '@/lib/db/queries/tickets'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'
import type { TicketStatus, Priority, TicketCategory } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = session.orgId ?? DEFAULT_ORG_ID

  const url = new URL(request.url)
  const tickets = await getTickets({
    status: url.searchParams.get('status') as TicketStatus | undefined ?? undefined,
    priority: url.searchParams.get('priority') as Priority | undefined ?? undefined,
    category: url.searchParams.get('category') as TicketCategory | undefined ?? undefined,
  }, orgId)
  return Response.json(tickets)
}
