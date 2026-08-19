import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Bug (GitHub issue #226): Slack's basic message event carries only the raw
// user id (e.g. U0BMB9H6SFQ), no display name — unlike Discord/Telegram/
// GitHub/Email, which all already store a readable name. That raw id ended
// up stored as tickets.source_author_name and rendered as-is on every
// ticket surface ("From U0BMB9H6SFQ"). Fixed by resolving the id to a
// display name via Slack's users.info API at ingest time (same pattern as
// the existing getSlackPermalink), on both ingest paths — falling back to
// the raw id, exactly like today, if the lookup fails for any reason
// (including missing_scope on an org that hasn't reconnected Slack since
// the new users:read scope was added).

const ROOT = process.cwd()
function read(relPath: string): string {
  const abs = path.join(ROOT, relPath)
  expect(fs.existsSync(abs), `File not found: ${relPath}`).toBe(true)
  return fs.readFileSync(abs, 'utf-8')
}

describe('lib/slack/user-info.ts — getSlackDisplayName', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('returns display_name on a successful lookup', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: async () => ({ ok: true, user: { profile: { display_name: 'Jane', real_name: 'Jane Doe' } } }),
    } as Response)

    const { getSlackDisplayName } = await import('@/lib/slack/user-info')
    const name = await getSlackDisplayName('xoxb-test', 'U123')

    expect(name).toBe('Jane')
    const [requestUrl, init] = vi.mocked(global.fetch).mock.calls[0]
    expect(String(requestUrl)).toContain('users.info')
    expect(String(requestUrl)).toContain('user=U123')
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer xoxb-test' })
  })

  it('falls back to real_name when display_name is empty', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: async () => ({ ok: true, user: { profile: { display_name: '', real_name: 'Jane Doe' } } }),
    } as Response)

    const { getSlackDisplayName } = await import('@/lib/slack/user-info')
    const name = await getSlackDisplayName('xoxb-test', 'U123')

    expect(name).toBe('Jane Doe')
  })

  it('returns null (never throws) when Slack returns ok: false, e.g. missing_scope', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: async () => ({ ok: false, error: 'missing_scope' }),
    } as Response)

    const { getSlackDisplayName } = await import('@/lib/slack/user-info')
    const name = await getSlackDisplayName('xoxb-test', 'U123')

    expect(name).toBeNull()
  })

  it('returns null (never throws) when both display_name and real_name are empty', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: async () => ({ ok: true, user: { profile: {} } }),
    } as Response)

    const { getSlackDisplayName } = await import('@/lib/slack/user-info')
    const name = await getSlackDisplayName('xoxb-test', 'U123')

    expect(name).toBeNull()
  })

  it('returns null (never throws) when the fetch itself rejects', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('network down'))

    const { getSlackDisplayName } = await import('@/lib/slack/user-info')
    const name = await getSlackDisplayName('xoxb-test', 'U123')

    expect(name).toBeNull()
  })
})

describe('Slack sender display name is resolved and falls back safely', () => {
  it('the Slack Events API webhook resolves a display name and falls back to the raw user id', () => {
    const src = read('app/api/slack/events/route.ts')
    expect(src).toContain('getSlackDisplayName(botToken, userId)')
    expect(src).toContain('authorName: displayName ?? userId')
  })

  it('the Slack poller resolves a display name per message and falls back to the raw user id', () => {
    const src = read('lib/slack/poller.ts')
    expect(src).toContain('getSlackDisplayName(botToken, msg.user!)')
    expect(src).toContain('author_name: displayName ?? msg.user!')
  })

  it('the OAuth install flow requests the users:read scope needed for name resolution', () => {
    const src = read('app/api/slack/install/route.ts')
    expect(src).toMatch(/SCOPES = '[^']*users:read[^']*'/)
  })
})
