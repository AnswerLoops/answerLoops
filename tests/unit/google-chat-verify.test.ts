import { describe, it, expect, vi, beforeEach } from 'vitest'

const { verifyIdToken } = vi.hoisted(() => ({ verifyIdToken: vi.fn() }))
vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken(...args: unknown[]) {
      return verifyIdToken(...args)
    }
  },
}))

describe('verifyGoogleChatRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects a missing Authorization header', async () => {
    const { verifyGoogleChatRequest } = await import('@/lib/google-chat/verify')
    expect(await verifyGoogleChatRequest(null, 'https://example.com/api/google-chat/events')).toBe(false)
    expect(verifyIdToken).not.toHaveBeenCalled()
  })

  it('rejects a header that is not a Bearer token', async () => {
    const { verifyGoogleChatRequest } = await import('@/lib/google-chat/verify')
    expect(await verifyGoogleChatRequest('Basic abc123', 'https://example.com')).toBe(false)
    expect(verifyIdToken).not.toHaveBeenCalled()
  })

  it('accepts a token whose payload is the real Chat issuer, email-verified', async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({ email: 'chat@system.gserviceaccount.com', email_verified: true }),
    })
    const { verifyGoogleChatRequest } = await import('@/lib/google-chat/verify')
    const result = await verifyGoogleChatRequest('Bearer real-token', 'https://example.com/api/google-chat/events')
    expect(result).toBe(true)
    expect(verifyIdToken).toHaveBeenCalledWith({ idToken: 'real-token', audience: 'https://example.com/api/google-chat/events' })
  })

  it('rejects a token verified fine but issued by someone other than the Chat service account', async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({ email: 'someone-else@gserviceaccount.com', email_verified: true }),
    })
    const { verifyGoogleChatRequest } = await import('@/lib/google-chat/verify')
    expect(await verifyGoogleChatRequest('Bearer forged', 'https://example.com')).toBe(false)
  })

  it('rejects when verifyIdToken throws (invalid signature, expired, wrong audience)', async () => {
    verifyIdToken.mockRejectedValue(new Error('Wrong recipient'))
    const { verifyGoogleChatRequest } = await import('@/lib/google-chat/verify')
    expect(await verifyGoogleChatRequest('Bearer bad', 'https://example.com')).toBe(false)
  })

  it('rejects when the payload is missing entirely', async () => {
    verifyIdToken.mockResolvedValue({ getPayload: () => undefined })
    const { verifyGoogleChatRequest } = await import('@/lib/google-chat/verify')
    expect(await verifyGoogleChatRequest('Bearer no-payload', 'https://example.com')).toBe(false)
  })
})
