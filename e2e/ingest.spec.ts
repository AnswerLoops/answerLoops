import { test, expect } from '@playwright/test'
import { BOT_AUTH, waitForPipeline, getTicket } from './helpers'

// Direct coverage of the bot-facing ingest endpoint: auth, validation, dedup,
// and the full triage->embed->agent->assess pipeline it kicks off.
test.describe('POST /api/ingest', () => {
  const validBody = {
    message_id: 'ingest-spec-1',
    content: 'How do I configure the client?',
    author_id: 'u1',
    author_name: 'tester',
    channel_id: 'c1',
  }

  test('rejects a missing or wrong bot secret', async ({ request }) => {
    const noAuth = await request.post('/api/ingest', { data: validBody })
    expect(noAuth.status()).toBe(401)

    const badAuth = await request.post('/api/ingest', {
      headers: { Authorization: 'Bearer wrong' },
      data: validBody,
    })
    expect(badAuth.status()).toBe(401)
  })

  test('rejects an invalid body with 400', async ({ request }) => {
    const res = await request.post('/api/ingest', {
      headers: BOT_AUTH,
      data: { message_id: 'x', content: '' }, // empty content + missing fields
    })
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toBeTruthy()
  })

  test('creates a ticket and runs the pipeline', async ({ request }) => {
    const res = await request.post('/api/ingest', {
      headers: BOT_AUTH,
      data: { ...validBody, message_id: 'ingest-spec-create' },
    })
    expect(res.ok()).toBeTruthy()
    const { ticket_id } = (await res.json()) as { ticket_id: number }

    const row = (await getTicket(request, ticket_id))!
    expect(row.category).toBe('how_to')
    expect(row.status).toBe('open')

    // The agent posts an answer (status leaves 'pending').
    await waitForPipeline(request, ticket_id)
    const after = (await getTicket(request, ticket_id))!
    expect(after.ai_draft_status).toBe('posted')
    expect(after.ai_draft).toBeTruthy()
  })

  test('dedups a repeated discord message', async ({ request }) => {
    const body = { ...validBody, message_id: 'ingest-spec-dup' }
    const first = await request.post('/api/ingest', { headers: BOT_AUTH, data: body })
    const firstId = (await first.json()).ticket_id

    const second = await request.post('/api/ingest', { headers: BOT_AUTH, data: body })
    const secondBody = await second.json()
    expect(secondBody.duplicate).toBe(true)
    expect(secondBody.ticket_id).toBe(firstId)
  })
})
