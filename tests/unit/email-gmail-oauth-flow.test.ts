import { describe, it, expect, vi, beforeEach } from 'vitest'

const { generateAuthUrl, getToken, refreshAccessToken, verifyIdToken, revokeToken, setCredentials } = vi.hoisted(() => ({
  generateAuthUrl: vi.fn(),
  getToken: vi.fn(),
  refreshAccessToken: vi.fn(),
  verifyIdToken: vi.fn(),
  revokeToken: vi.fn(),
  setCredentials: vi.fn(),
}))

vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    generateAuthUrl(...args: unknown[]) { return generateAuthUrl(...args) }
    getToken(...args: unknown[]) { return getToken(...args) }
    refreshAccessToken(...args: unknown[]) { return refreshAccessToken(...args) }
    verifyIdToken(...args: unknown[]) { return verifyIdToken(...args) }
    revokeToken(...args: unknown[]) { return revokeToken(...args) }
    setCredentials(...args: unknown[]) { return setCredentials(...args) }
  },
}))

vi.mock('@/lib/db/queries/email-oauth', () => ({
  updateOauthAccessToken: vi.fn(),
}))

const ENV_KEYS = ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'MOCK_EXTERNALS'] as const

function withEnv(vars: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  for (const key of ENV_KEYS) {
    if (vars[key] !== undefined) process.env[key] = vars[key]
    else delete process.env[key]
  }
}

describe('lib/email/gmail.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    withEnv({ GMAIL_CLIENT_ID: 'client-id', GMAIL_CLIENT_SECRET: 'client-secret' })
  })

  describe('buildGmailAuthUrl', () => {
    it('returns an error when GMAIL_CLIENT_ID/SECRET are not configured', async () => {
      withEnv({})
      const { buildGmailAuthUrl } = await import('@/lib/email/gmail')
      const result = buildGmailAuthUrl('state123')
      expect(result).toEqual({ error: expect.stringContaining('not configured') })
    })

    it('requests only the gmail.send scope plus openid/email, offline access, and forced consent', async () => {
      generateAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?mock=1')
      const { buildGmailAuthUrl } = await import('@/lib/email/gmail')
      const result = buildGmailAuthUrl('state123')
      expect(result).toBe('https://accounts.google.com/o/oauth2/v2/auth?mock=1')
      expect(generateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          access_type: 'offline',
          prompt: 'consent',
          state: 'state123',
          scope: expect.arrayContaining(['https://www.googleapis.com/auth/gmail.send']),
        })
      )
    })
  })

  describe('exchangeGmailCode', () => {
    it('fails when Google does not return a refresh token (repeat consent without prompt=consent)', async () => {
      getToken.mockResolvedValue({ tokens: { access_token: 'at', id_token: 'idt' } })
      const { exchangeGmailCode } = await import('@/lib/email/gmail')
      const result = await exchangeGmailCode('code123')
      expect(result).toEqual({ error: expect.stringContaining('refresh token') })
    })

    it('resolves the mailbox address from the id_token payload on success', async () => {
      getToken.mockResolvedValue({
        tokens: { access_token: 'at', refresh_token: 'rt', id_token: 'idt', expiry_date: Date.now() + 3600_000, scope: 'gmail.send' },
      })
      verifyIdToken.mockResolvedValue({ getPayload: () => ({ email: 'org@gmail.com' }) })

      const { exchangeGmailCode } = await import('@/lib/email/gmail')
      const result = await exchangeGmailCode('code123')

      expect(result).toMatchObject({ accessToken: 'at', refreshToken: 'rt', mailboxAddress: 'org@gmail.com' })
    })

    it('fails when the mailbox address cannot be determined', async () => {
      getToken.mockResolvedValue({ tokens: { access_token: 'at', refresh_token: 'rt' } })
      const { exchangeGmailCode } = await import('@/lib/email/gmail')
      const result = await exchangeGmailCode('code123')
      expect(result).toEqual({ error: expect.stringContaining('Gmail address') })
    })
  })

  describe('getValidGmailAccessToken', () => {
    const baseConnection = {
      id: 1,
      org_id: 5,
      provider: 'gmail',
      mailbox_address: 'org@gmail.com',
      granted_scope: 'gmail.send',
      status: 'connected' as const,
      disconnected_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }

    it('returns the cached access token without refreshing when still valid', async () => {
      const { getValidGmailAccessToken } = await import('@/lib/email/gmail')
      const result = await getValidGmailAccessToken({
        ...baseConnection,
        access_token: 'cached-token',
        access_token_expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
        refresh_token: 'rt',
      })
      expect(result).toBe('cached-token')
      expect(refreshAccessToken).not.toHaveBeenCalled()
    })

    it('refreshes and persists a new access token when the cached one is expired', async () => {
      refreshAccessToken.mockResolvedValue({ credentials: { access_token: 'new-token', expiry_date: Date.now() + 3600_000 } })
      const { updateOauthAccessToken } = await import('@/lib/db/queries/email-oauth')

      const { getValidGmailAccessToken } = await import('@/lib/email/gmail')
      const result = await getValidGmailAccessToken({
        ...baseConnection,
        access_token: 'stale-token',
        access_token_expires_at: new Date(Date.now() - 60_000).toISOString(),
        refresh_token: 'rt',
      })

      expect(result).toBe('new-token')
      expect(updateOauthAccessToken).toHaveBeenCalledWith(5, 'new-token', expect.any(String))
    })

    it('returns reauth_required when the refresh token is dead (invalid_grant)', async () => {
      refreshAccessToken.mockRejectedValue(new Error('invalid_grant'))
      const { getValidGmailAccessToken } = await import('@/lib/email/gmail')
      const result = await getValidGmailAccessToken({
        ...baseConnection,
        access_token: null,
        access_token_expires_at: null,
        refresh_token: 'dead-rt',
      })
      expect(result).toEqual({ error: 'reauth_required' })
    })
  })

  describe('sendGmail', () => {
    it('POSTs a base64url-encoded MIME message with the Bearer token', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' })
      vi.stubGlobal('fetch', fetchMock)

      const { sendGmail } = await import('@/lib/email/gmail')
      const result = await sendGmail('access-token', {
        to: 'customer@example.com',
        from: 'org@gmail.com',
        subject: 'Re: hello',
        text: 'hi there',
        headers: { 'Message-ID': '<abc@domain>' },
      })

      expect(result).toEqual({ success: true })
      expect(fetchMock).toHaveBeenCalledWith(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
        })
      )
      vi.unstubAllGlobals()
    })

    it('returns an error on a non-ok response instead of throwing', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' }))
      const { sendGmail } = await import('@/lib/email/gmail')
      const result = await sendGmail('bad-token', { to: 'a@b.com', from: 'org@gmail.com', subject: 's', text: 't', headers: {} })
      expect(result).toEqual({ error: expect.stringContaining('401') })
      vi.unstubAllGlobals()
    })
  })
})
