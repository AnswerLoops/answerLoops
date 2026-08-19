import { randomUUID } from 'crypto'
import { test, expect } from '@playwright/test'
import { BOT_AUTH, ingest, waitForPipeline, waitFor, answerMessageId } from './helpers'

// The bot forwards 👍/👎 reactions to /api/feedback; this covers auth, the
// unknown-message no-op, and a vote being attributed to the right ticket.
test.describe('POST /api/feedback', () => {
  test('requires the bot secret', async ({ request }) => {
    const res = await request.post('/api/feedback', {
      data: { message_id: 'x', vote: 'up', actor: 'u1' },
    })
    expect(res.status()).toBe(401)
  })

  test('ignores a reaction on a non-answer message', async ({ request }) => {
    const res = await request.post('/api/feedback', {
      headers: BOT_AUTH,
      data: { message_id: 'not-an-answer', vote: 'up', actor: 'u1' },
    })
    expect(res.ok()).toBeTruthy()
    expect((await res.json()).ignored).toBe(true)
  })

  test('records a Discord vote against the answer’s ticket', async ({ request }) => {
    // Unique channel → the mock posts the answer under a known message id.
    const channelId = `fb-${randomUUID()}`
    const ticketId = await ingest(request, { content: 'How do I configure the client?', channelId })
    await waitForPipeline(request, ticketId)
    const messageId = answerMessageId(channelId)

    // The answer message is mapped at the very end of the pipeline; retry the
    // vote until the route can resolve it to the ticket.
    const recorded = (await waitFor(async () => {
      const r = await request.post('/api/feedback', {
        headers: BOT_AUTH,
        data: { message_id: messageId, vote: 'up', actor: 'community-1' },
      })
      const body = (await r.json()) as { ticket_id?: number }
      return body.ticket_id ? body : false
    })) as { ticket_id: number }
    expect(recorded.ticket_id).toBe(ticketId)

    // Re-voting from the same actor is accepted (saveFeedback upserts).
    const down = await request.post('/api/feedback', {
      headers: BOT_AUTH,
      data: { message_id: messageId, vote: 'down', actor: 'community-1' },
    })
    expect((await down.json()).ticket_id).toBe(ticketId)
  })
})
