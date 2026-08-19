import { test, expect } from '@playwright/test'
import { BOT_AUTH, ingest, waitForPipeline } from './helpers'

// /api/slash/ask and /api/slash/summarize — bot-facing slash command endpoints.
// Auth uses the same bot secret as ingest. AI responses come from the mock.

test.describe('slash: /api/slash/ask', () => {
  test('requires bot secret', async ({ request }) => {
    const res = await request.post('/api/slash/ask', {
      data: { question: 'How do I configure the client?', channel_id: 'ch-1' },
    })
    expect(res.status()).toBe(401)
  })

  test('rejects short question', async ({ request }) => {
    const res = await request.post('/api/slash/ask', {
      headers: BOT_AUTH,
      data: { question: 'hi', channel_id: 'ch-1' },
    })
    expect(res.status()).toBe(400)
  })

  test('returns an answer for a valid question', async ({ request }) => {
    // Seed KB first so search has something to find
    const ticketId = await ingest(request, { content: 'How do I configure the client connection?' })
    await waitForPipeline(request, ticketId)

    const res = await request.post('/api/slash/ask', {
      headers: BOT_AUTH,
      data: { question: 'How do I configure the client?', channel_id: 'ch-slash-1' },
    })
    expect(res.ok()).toBeTruthy()
    const body = (await res.json()) as { answer: string }
    expect(typeof body.answer).toBe('string')
    expect(body.answer.length).toBeGreaterThan(0)
  })
})

test.describe('slash: /api/slash/summarize', () => {
  test('requires bot secret', async ({ request }) => {
    const res = await request.post('/api/slash/summarize', {
      data: { messages: ['hello world'], channel_id: 'ch-1' },
    })
    expect(res.status()).toBe(401)
  })

  test('rejects empty messages array', async ({ request }) => {
    const res = await request.post('/api/slash/summarize', {
      headers: BOT_AUTH,
      data: { messages: [], channel_id: 'ch-1' },
    })
    expect(res.status()).toBe(400)
  })

  test('returns a summary for valid messages', async ({ request }) => {
    const res = await request.post('/api/slash/summarize', {
      headers: BOT_AUTH,
      data: {
        messages: [
          'User asked how to reset their password.',
          'Staff replied with the steps to reset via settings page.',
          'User confirmed it worked.',
        ],
        channel_id: 'ch-slash-2',
      },
    })
    expect(res.ok()).toBeTruthy()
    const body = (await res.json()) as { summary: string }
    expect(typeof body.summary).toBe('string')
    expect(body.summary.length).toBeGreaterThan(0)
  })
})
