import { z } from 'zod'
import { saveFeedback, getTicketIdByAnswerMessage } from '@/lib/db/queries/feedback'

const FeedbackSchema = z.object({
  message_id: z.string(),
  vote: z.enum(['up', 'down']),
  actor: z.string(),
})

// Receives 👍/👎 reactions on posted AI answers, forwarded by the Discord bot.
export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (!auth || auth !== `Bearer ${process.env.BOT_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = FeedbackSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { message_id, vote, actor } = parsed.data

  // Only AI answer messages map to a ticket; reactions on anything else are ignored.
  const ticketId = await getTicketIdByAnswerMessage(message_id)
  if (ticketId === null) {
    return Response.json({ ok: true, ignored: true })
  }

  await saveFeedback({ ticketId, source: 'discord', vote, actor })
  return Response.json({ ok: true, ticket_id: ticketId })
}
