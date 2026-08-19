import { test, expect } from '@playwright/test'
import {
  voteFromEmoji,
  forwardMessage,
  forwardReaction,
  type BotConfig,
  type FetchLike,
  type IncomingMessage,
  type IncomingReaction,
} from '../bot/handlers'

const cfg: BotConfig = { targetUrl: 'http://app.test', botSecret: 'sek', channelIds: ['chan-1'] }

interface Call {
  url: string
  body: Record<string, unknown>
  auth: string | undefined
}

/** A stub fetch that records calls and returns a canned JSON response. */
function recordingFetch(json: unknown = { ok: true, ticket_id: 5 }): { fetch: FetchLike; calls: Call[] } {
  const calls: Call[] = []
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({
      url,
      body: JSON.parse(String(init.body)),
      auth: (init.headers as Record<string, string>)?.Authorization,
    })
    return { ok: true, status: 200, text: async () => '', json: async () => json }
  }
  return { fetch: fetchImpl, calls }
}

function message(over: Partial<IncomingMessage> = {}): IncomingMessage {
  return {
    id: 'msg-1',
    content: 'a sufficiently long question',
    channelId: 'chan-1',
    author: { bot: false, id: 'user-1', username: 'bob' },
    channel: { isThread: () => false, parentId: null },
    ...over,
  }
}

test.describe('bot: voteFromEmoji', () => {
  test('maps thumb emojis and rejects others', () => {
    expect(voteFromEmoji('👍')).toBe('up')
    expect(voteFromEmoji('👎')).toBe('down')
    expect(voteFromEmoji('❤️')).toBeNull()
    expect(voteFromEmoji(null)).toBeNull()
  })
})

test.describe('bot: forwardMessage', () => {
  test('forwards a monitored message to /api/ingest', async () => {
    const { fetch, calls } = recordingFetch()
    const result = await forwardMessage(message(), cfg, fetch)

    expect(result.forwarded).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('http://app.test/api/ingest')
    expect(calls[0].auth).toBe('Bearer sek')
    expect(calls[0].body).toMatchObject({
      message_id: 'msg-1',
      content: 'a sufficiently long question',
      author_id: 'user-1',
      author_name: 'bob',
      channel_id: 'chan-1',
    })
    expect(result.data?.ticket_id).toBe(5)
  })

  test('forwards a thread message under its parent channel', async () => {
    const { fetch, calls } = recordingFetch()
    await forwardMessage(
      message({ channelId: 'thread-9', channel: { isThread: () => true, parentId: 'chan-1' } }),
      cfg,
      fetch
    )
    expect(calls[0].body).toMatchObject({ channel_id: 'chan-1', thread_id: 'thread-9' })
  })

  test('ignores bot authors, unmonitored channels, and short messages', async () => {
    const { fetch, calls } = recordingFetch()

    expect((await forwardMessage(message({ author: { bot: true, id: 'b', username: 'bot' } }), cfg, fetch)).forwarded).toBe(false)
    expect((await forwardMessage(message({ channelId: 'other' }), cfg, fetch)).forwarded).toBe(false)
    expect((await forwardMessage(message({ content: 'hi' }), cfg, fetch)).forwarded).toBe(false)

    expect(calls).toHaveLength(0)
  })
})

test.describe('bot: forwardReaction', () => {
  function reaction(over: Partial<IncomingReaction> = {}): IncomingReaction {
    return {
      partial: false,
      emoji: { name: '👍' },
      message: { id: 'answer-7' },
      fetch: async () => undefined,
      ...over,
    }
  }

  test('forwards a vote to /api/feedback', async () => {
    const { fetch, calls } = recordingFetch({ ok: true, ticket_id: 7 })
    const result = await forwardReaction(reaction(), { bot: false, id: 'voter-1' }, cfg, fetch)

    expect(result.forwarded).toBe(true)
    expect(calls[0].url).toBe('http://app.test/api/feedback')
    expect(calls[0].body).toEqual({ message_id: 'answer-7', vote: 'up', actor: 'voter-1' })
    expect(result.data?.ticket_id).toBe(7)
  })

  test('hydrates a partial reaction before forwarding', async () => {
    let fetched = false
    const { fetch, calls } = recordingFetch()
    await forwardReaction(
      reaction({ partial: true, fetch: async () => { fetched = true } }),
      { bot: false, id: 'voter-1' },
      cfg,
      fetch
    )
    expect(fetched).toBe(true)
    expect(calls).toHaveLength(1)
  })

  test('ignores bot reactors and non-vote emojis', async () => {
    const { fetch, calls } = recordingFetch()
    expect((await forwardReaction(reaction(), { bot: true, id: 'b' }, cfg, fetch)).forwarded).toBe(false)
    expect((await forwardReaction(reaction({ emoji: { name: '🎉' } }), { bot: false, id: 'v' }, cfg, fetch)).forwarded).toBe(false)
    expect(calls).toHaveLength(0)
  })
})
