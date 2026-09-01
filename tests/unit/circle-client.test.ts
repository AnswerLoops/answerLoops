import { describe, it, expect, vi, beforeEach } from 'vitest'

// lib/circle/client.ts is the read-only Circle Admin v2 client. Two pure-ish
// pieces matter:
//   - normalizeCircleContent maps an untyped post/comment (from the
//     non-contractual Workflow webhook OR the API) into CircleContent. A
//     regression in the field mapping silently drops the author, the space
//     (breaking the watched-space filter), or — for a comment — points the
//     ticket thread at the comment instead of its parent post.
//   - circleFetch must send `Authorization: Bearer <token>` against the v2
//     base; fetchCirclePost must be inert under MOCK_EXTERNALS (no network in
//     tests / CI), mirroring tests/unit/discourse-send-routing.test.ts.

let mockExternals = false
vi.mock('@/lib/mock-mode', () => ({
  get MOCK_EXTERNALS() {
    return mockExternals
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockExternals = false
})

describe('normalizeCircleContent', () => {
  it('maps a post shape and joins name + body', async () => {
    const { normalizeCircleContent } = await import('@/lib/circle/client')
    const out = normalizeCircleContent(
      { id: 55, name: 'Login broken', body: 'I cannot sign in', space_id: 9, user_id: 3, user_name: 'Ada' },
      'post'
    )
    expect(out).toEqual({
      id: '55',
      body: 'Login broken\n\nI cannot sign in',
      authorId: '3',
      authorName: 'Ada',
      spaceId: '9',
      postId: '55',
      url: null,
    })
  })

  it('extracts body when it arrives as a { body: string } object', async () => {
    const { normalizeCircleContent } = await import('@/lib/circle/client')
    const out = normalizeCircleContent({ id: 1, body: { body: 'nested text' } }, 'post')
    expect(out?.body).toBe('nested text')
  })

  it('for a comment, postId is the parent post_id and id is the comment id', async () => {
    const { normalizeCircleContent } = await import('@/lib/circle/client')
    const out = normalizeCircleContent(
      { id: 900, body: 'a reply', post_id: 55, user_id: 4 },
      'comment'
    )
    expect(out?.id).toBe('900')
    expect(out?.postId).toBe('55')
  })

  it('returns null when the record has no id', async () => {
    const { normalizeCircleContent } = await import('@/lib/circle/client')
    expect(normalizeCircleContent({ body: 'orphan' }, 'post')).toBeNull()
  })
})

describe('circleFetch', () => {
  it('sets Authorization: Bearer <token> and hits the Admin v2 base', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    const { circleFetch } = await import('@/lib/circle/client')

    await circleFetch('a-circle-admin-token', '/posts/42')

    const [url, init] = vi.mocked(global.fetch).mock.calls[0]
    expect(url).toBe('https://app.circle.so/api/admin/v2/posts/42')
    const headers = new Headers((init as RequestInit).headers)
    expect(headers.get('Authorization')).toBe('Bearer a-circle-admin-token')
  })
})

describe('fetchCirclePost', () => {
  it('returns null under MOCK_EXTERNALS without calling fetch', async () => {
    mockExternals = true
    global.fetch = vi.fn()
    const { fetchCirclePost } = await import('@/lib/circle/client')

    expect(await fetchCirclePost('tok', '42')).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
