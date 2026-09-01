import { describe, it, expect, vi, beforeEach } from 'vitest'

// lib/discourse/send.ts's postToDiscourseTopic is the write side of the
// Discourse channel. It has three distinct exits and every one matters:
//   - MOCK_EXTERNALS on  -> returns `mock-discourse-<id>`, never touches fetch
//   - integration missing creds -> returns null, never touches fetch
//   - fully configured -> POSTs `{siteUrl}/posts.json` with Api-Key /
//     Api-Username headers and a `{topic_id, raw}` body, returns the new id
// The creds are read from three reused generic columns (bot_token = api key,
// team_id = site url, bot_username = the forum account), so a regression that
// swaps any of those would silently post as the wrong user or to nowhere.

let mockExternals = false
vi.mock('@/lib/mock-mode', () => ({
  get MOCK_EXTERNALS() {
    return mockExternals
  },
}))

const { getIntegration } = vi.hoisted(() => ({
  getIntegration: vi.fn(),
}))
vi.mock('@/lib/db/queries/integrations', () => ({ getIntegration }))

const FULL_INTEGRATION = {
  bot_token: 'a-discourse-admin-api-key',
  team_id: 'https://forum.example.com',
  bot_username: 'support-bot',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockExternals = false
  getIntegration.mockResolvedValue(FULL_INTEGRATION)
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ id: 987 }),
    text: async () => '',
  })
})

describe('postToDiscourseTopic', () => {
  it('MOCK_EXTERNALS: returns a mock id and never calls fetch', async () => {
    mockExternals = true
    const { postToDiscourseTopic } = await import('@/lib/discourse/send')

    const result = await postToDiscourseTopic('42', 'hello', 3)

    expect(result).toBe('mock-discourse-42')
    expect(global.fetch).not.toHaveBeenCalled()
    expect(getIntegration).not.toHaveBeenCalled()
  })

  it('returns null and does not call fetch when the integration is missing', async () => {
    getIntegration.mockResolvedValue(null)
    const { postToDiscourseTopic } = await import('@/lib/discourse/send')

    expect(await postToDiscourseTopic('42', 'hello', 3)).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('returns null when the bot username is not set (partial creds)', async () => {
    getIntegration.mockResolvedValue({ ...FULL_INTEGRATION, bot_username: null })
    const { postToDiscourseTopic } = await import('@/lib/discourse/send')

    expect(await postToDiscourseTopic('42', 'hello', 3)).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('happy path: POSTs to {siteUrl}/posts.json with auth headers + topic body, returns the new post id', async () => {
    const { postToDiscourseTopic } = await import('@/lib/discourse/send')

    const result = await postToDiscourseTopic('42', 'the answer', 3)

    expect(result).toBe('987')
    const [url, init] = vi.mocked(global.fetch).mock.calls[0]
    expect(url).toBe('https://forum.example.com/posts.json')
    expect((init as RequestInit).method).toBe('POST')
    const headers = new Headers((init as RequestInit).headers)
    expect(headers.get('Api-Key')).toBe('a-discourse-admin-api-key')
    expect(headers.get('Api-Username')).toBe('support-bot')
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body).toEqual({ topic_id: 42, raw: 'the answer' })
  })

  it('returns null when Discourse rejects the write', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => 'nope' })
    const { postToDiscourseTopic } = await import('@/lib/discourse/send')

    expect(await postToDiscourseTopic('42', 'the answer', 3)).toBeNull()
  })
})
