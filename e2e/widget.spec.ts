import fs from 'fs'
import { test, expect } from '@playwright/test'
import { WIDGET_TOKEN_FILE } from './global-setup'

// Widget: API-level tests for /api/widget/chat and /api/widget/lead.
// Uses the token seeded in global-setup. The chat response is a stream;
// under MOCK_EXTERNALS=1 the AI model returns mock text.

function getToken(): string {
  const data = JSON.parse(fs.readFileSync(WIDGET_TOKEN_FILE, 'utf-8')) as { token: string }
  return data.token
}

test.describe('widget: /api/widget/chat', () => {
  test('returns 400 for missing widgetToken', async ({ request }) => {
    const res = await request.post('/api/widget/chat', {
      data: { messages: [{ role: 'user', content: 'hello', id: '1', parts: [] }] },
    })
    expect(res.status()).toBe(400)
  })

  test('returns 400 for missing messages', async ({ request }) => {
    const token = getToken()
    const res = await request.post('/api/widget/chat', {
      data: { widgetToken: token, visitorId: 'e2e-visitor-no-messages', messages: [] },
    })
    expect(res.status()).toBe(400)
  })

  test('returns 400 for missing visitorId', async ({ request }) => {
    const token = getToken()
    const res = await request.post('/api/widget/chat', {
      data: {
        widgetToken: token,
        messages: [{ role: 'user', content: 'hello', id: '1', parts: [{ type: 'text', text: 'hello' }] }],
      },
    })
    expect(res.status()).toBe(400)
  })

  test('returns 404 for invalid widget token', async ({ request }) => {
    const res = await request.post('/api/widget/chat', {
      data: {
        widgetToken: 'not-a-real-token',
        visitorId: 'e2e-visitor-invalid-token',
        messages: [{ role: 'user', content: 'hello', id: '1', parts: [{ type: 'text', text: 'hello' }] }],
      },
    })
    expect(res.status()).toBe(404)
  })

  test('returns streamed response for valid token + message', async ({ request }) => {
    const token = getToken()
    const res = await request.post('/api/widget/chat', {
      data: {
        widgetToken: token,
        visitorId: 'e2e-visitor-stream',
        messages: [{ role: 'user', content: 'How do I configure the client?', id: '1', parts: [{ type: 'text', text: 'How do I configure the client?' }] }],
      },
    })
    // Streamed responses return 200 with text/event-stream or text/plain
    expect([200, 201]).toContain(res.status())
  })

  test('returns 400 for a message exceeding the per-message character cap', async ({ request }) => {
    const token = getToken()
    const tooLong = 'a'.repeat(4_001)
    const res = await request.post('/api/widget/chat', {
      data: {
        widgetToken: token,
        visitorId: 'e2e-visitor-char-cap',
        messages: [{ role: 'user', content: tooLong, id: '1', parts: [{ type: 'text', text: tooLong }] }],
      },
    })
    expect(res.status()).toBe(400)
  })

  test('returns 400 for more than the max allowed messages in one request', async ({ request }) => {
    const token = getToken()
    const messages = Array.from({ length: 51 }, (_, i) => ({
      role: 'user',
      content: 'hi',
      id: String(i),
      parts: [{ type: 'text', text: 'hi' }],
    }))
    const res = await request.post('/api/widget/chat', {
      data: { widgetToken: token, visitorId: 'e2e-visitor-message-cap', messages },
      headers: { 'x-forwarded-for': 'test-ip-message-cap' },
    })
    expect(res.status()).toBe(400)
  })

  test('returns 429 once the per-IP+token rate limit is exceeded', async ({ request }) => {
    const token = getToken()
    const ip = 'test-ip-rate-limit-unique'
    const payload = {
      widgetToken: token,
      visitorId: 'e2e-visitor-rate-limit',
      messages: [{ role: 'user', content: 'hi', id: '1', parts: [{ type: 'text', text: 'hi' }] }],
    }
    let last429 = false
    for (let i = 0; i < 21; i++) {
      const res = await request.post('/api/widget/chat', {
        data: payload,
        headers: { 'x-forwarded-for': ip },
      })
      last429 = res.status() === 429
    }
    expect(last429).toBe(true)
  })
})

test.describe('widget: /api/widget/lead', () => {
  test('returns 400 for missing widgetToken', async ({ request }) => {
    const res = await request.post('/api/widget/lead', {
      data: { email: 'user@example.com' },
    })
    expect(res.status()).toBe(400)
  })

  test('returns 400 for invalid email', async ({ request }) => {
    const token = getToken()
    const res = await request.post('/api/widget/lead', {
      data: { widgetToken: token, email: 'not-an-email' },
    })
    expect(res.status()).toBe(400)
  })

  test('returns 404 for invalid widget token', async ({ request }) => {
    const res = await request.post('/api/widget/lead', {
      data: { widgetToken: 'fake-token', email: 'user@example.com' },
    })
    expect(res.status()).toBe(404)
  })

  test('captures a lead for valid token + email', async ({ request }) => {
    const token = getToken()
    const res = await request.post('/api/widget/lead', {
      data: { widgetToken: token, email: 'lead@example.com' },
    })
    expect(res.ok()).toBeTruthy()
    expect((await res.json()).ok).toBe(true)
  })

  test('deduplicates the same lead (upsert)', async ({ request }) => {
    const token = getToken()
    const email = 'dup-lead@example.com'
    const first = await request.post('/api/widget/lead', { data: { widgetToken: token, email } })
    expect(first.ok()).toBeTruthy()
    const second = await request.post('/api/widget/lead', { data: { widgetToken: token, email } })
    expect(second.ok()).toBeTruthy()
  })
})

test.describe('widget: embed page', () => {
  test('widget page renders for valid token', async ({ page }) => {
    const token = getToken()
    await page.goto(`/widget/${token}`)
    // Widget embed should render without error
    await expect(page.locator('body')).not.toContainText(/error|not found/i)
  })
})
