import { describe, it, expect, vi, beforeEach } from 'vitest'

// Real bug fix: Slack's chat.postMessage needs the real channel id in
// `channel` plus, for a thread reply, a separate `thread_ts` field — it
// cannot reuse the channel field for both. See slack-thread-reply-channel.test.ts
// for the structural checks on lib/ai/agent.ts and lib/ingest/pipeline.ts
// that thread the real values through to this function correctly.

const { getIntegration } = vi.hoisted(() => ({
  getIntegration: vi.fn(async () => ({ bot_token: 'xoxb-test' })),
}))
vi.mock('@/lib/db/queries/integrations', () => ({ getIntegration }))

beforeEach(() => {
  vi.clearAllMocks()
  getIntegration.mockResolvedValue({ bot_token: 'xoxb-test' })
  global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ ok: true, ts: '123' }) })
})

describe('lib/slack/send.ts — sendToSlackChannel accepts a separate thread_ts', () => {
  it('sets thread_ts on the Slack API call when provided', async () => {
    const { sendToSlackChannel } = await import('@/lib/slack/send')

    await sendToSlackChannel('C123', 'hello', 3, '1700000000.000100')

    const [, init] = vi.mocked(global.fetch).mock.calls[0]
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.channel).toBe('C123')
    expect(body.thread_ts).toBe('1700000000.000100')
  })

  it('omits thread_ts entirely when not a thread reply', async () => {
    const { sendToSlackChannel } = await import('@/lib/slack/send')

    await sendToSlackChannel('C123', 'hello', 3)

    const [, init] = vi.mocked(global.fetch).mock.calls[0]
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body).not.toHaveProperty('thread_ts')
  })
})
