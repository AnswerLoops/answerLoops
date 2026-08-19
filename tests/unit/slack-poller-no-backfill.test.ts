import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Real bug found live: the very first time the poller successfully reads a
// channel (no slack_poll_cursors row yet, e.g. right after connecting), it
// fetched conversations.history with no floor at all, then ticketed every
// one of up to 100 pre-existing messages it got back. A brand-new customer
// connecting Slack for the first time would have their community's entire
// recent history flood in as "new" tickets — confirmed live: 5 old test
// messages became 5 tickets the moment the bot successfully joined the
// channel. Discord never has this problem (its gateway only ever sees
// messages posted after the bot joins) — Slack polling now matches that:
// a first poll seeds the cursor to whatever's newest right now and tickets
// nothing, so only messages posted after connecting ever become tickets.
//
// pollChannel no longer calls processCommunityMessage directly — it
// forwards to /api/ingest over HTTP instead (see the separate bug this
// fixed: next/server's after() throws when called outside a real Next.js
// request, which every direct in-process call from the bot was). This
// file's fetch mock now serves two different endpoints — Slack's
// conversations.history and our own /api/ingest — distinguished by URL.

const { calls, rowsFor } = vi.hoisted(() => ({
  calls: [] as { sql: string; params: unknown[] }[],
  // Canned rows for the next getCursor SELECT, consumed one at a time —
  // lets each test control what "existing cursor" (if any) is found.
  rowsFor: { cursorRows: [] as { last_ts: string }[][] },
}))

vi.mock('@/lib/db/drizzle', async () => {
  const { drizzle } = await import('drizzle-orm/pg-proxy')
  const fakeDb = drizzle(async (sql: string, params: unknown[]) => {
    calls.push({ sql, params })
    if (sql.trim().toLowerCase().startsWith('select')) {
      return { rows: rowsFor.cursorRows.shift() ?? [] }
    }
    return { rows: [] }
  })
  return { getDb: () => fakeDb }
})

async function poller() {
  return import('@/lib/slack/poller')
}

function slackHistoryResponse(messages: Record<string, unknown>[]) {
  return { ok: true, json: async () => ({ ok: true, messages }) } as Response
}

function ingestResponse() {
  return { ok: true, json: async () => ({ ok: true, ticket_id: 1 }) } as Response
}

beforeEach(() => {
  calls.length = 0
  rowsFor.cursorRows = []
  global.fetch = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function ingestCalls() {
  return vi.mocked(global.fetch).mock.calls.filter(([url]) => String(url).includes('/api/ingest'))
}

describe('pollChannel: first poll never backfills history into tickets', () => {
  it('seeds the cursor to the newest existing message and forwards nothing to /api/ingest, when the channel has messages', async () => {
    rowsFor.cursorRows = [[]] // getCursor: no row yet (first poll)

    vi.mocked(global.fetch).mockResolvedValue(
      slackHistoryResponse([
        { ts: '1700000300.000100', text: 'a message from before we connected, ten+ chars', user: 'U1' },
        { ts: '1700000200.000100', text: 'an older message, also plenty long enough', user: 'U2' },
      ])
    )

    const { pollChannel } = await poller()
    await pollChannel(3, 'C123', 'xoxb-test', 'bot-secret', 'http://app:3000')

    expect(ingestCalls()).toHaveLength(0)

    // setCursor is the second compiled statement — seeded to the newest
    // (first in Slack's newest-first array) message's ts, not "now".
    const insertCall = calls.find((c) => c.sql.trim().toLowerCase().startsWith('insert'))
    expect(insertCall).toBeDefined()
    expect(insertCall!.params).toContain('1700000300.000100')
  })

  it('seeds the cursor to "now" when the channel has no messages at all yet', async () => {
    rowsFor.cursorRows = [[]]
    vi.mocked(global.fetch).mockResolvedValue(slackHistoryResponse([]))

    const before = Date.now() / 1000
    const { pollChannel } = await poller()
    await pollChannel(3, 'C123', 'xoxb-test', 'bot-secret', 'http://app:3000')
    const after = Date.now() / 1000

    expect(ingestCalls()).toHaveLength(0)
    const insertCall = calls.find((c) => c.sql.trim().toLowerCase().startsWith('insert'))
    expect(insertCall).toBeDefined()
    const seeded = Number(insertCall!.params.find((p) => typeof p === 'string' && /^\d/.test(p)))
    expect(seeded).toBeGreaterThanOrEqual(before)
    expect(seeded).toBeLessThanOrEqual(after)
  })

  it('does not set the oldest search param on a first poll — fetches without a floor purely to find the current newest ts', async () => {
    rowsFor.cursorRows = [[]]
    vi.mocked(global.fetch).mockResolvedValue(slackHistoryResponse([]))

    const { pollChannel } = await poller()
    await pollChannel(3, 'C123', 'xoxb-test', 'bot-secret', 'http://app:3000')

    const [url] = vi.mocked(global.fetch).mock.calls[0]
    expect(String(url)).not.toContain('oldest=')
  })
})

describe('pollChannel: subsequent polls behave exactly as before — this is not a regression in normal operation', () => {
  it('a channel with an existing cursor still forwards new messages to /api/ingest and advances the cursor', async () => {
    rowsFor.cursorRows = [[{ last_ts: '1700000000.000000' }]] // getCursor: existing row

    vi.mocked(global.fetch).mockImplementation(async (url) => {
      if (String(url).includes('/api/ingest')) return ingestResponse()
      return slackHistoryResponse([
        { ts: '1700000500.000100', text: 'a brand new message worth ticketing', user: 'U1' },
      ])
    })

    const { pollChannel } = await poller()
    await pollChannel(3, 'C123', 'xoxb-test', 'bot-secret', 'http://app:3000')

    expect(ingestCalls()).toHaveLength(1)
    const [historyUrl] = vi.mocked(global.fetch).mock.calls[0]
    expect(String(historyUrl)).toContain('oldest=1700000000.000000')
  })
})
