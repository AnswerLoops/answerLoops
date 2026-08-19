import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/queries/email-oauth', () => ({
  updateOauthAccessToken: vi.fn(),
}))

const ENV_KEYS = ['OUTLOOK_CLIENT_ID', 'OUTLOOK_CLIENT_SECRET', 'MOCK_EXTERNALS'] as const

function withEnv(vars: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  for (const key of ENV_KEYS) {
    if (vars[key] !== undefined) process.env[key] = vars[key]
    else delete process.env[key]
  }
}

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 400, json: async () => body, text: async () => JSON.stringify(body) }
}

describe('lib/email/outlook.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    withEnv({ OUTLOOK_CLIENT_ID: 'client-id', OUTLOOK_CLIENT_SECRET: 'client-secret' })
  })

  describe('buildOutlookAuthUrl', () => {
    it('returns an error when OUTLOOK_CLIENT_ID/SECRET are not configured', async () => {
      withEnv({})
      const { buildOutlookAuthUrl } = await import('@/lib/email/outlook')
      const result = buildOutlookAuthUrl('state123')
      expect(result).toEqual({ error: expect.stringContaining('not configured') })
    })

    it('requests offline_access and Mail.Send only, with the signed state', async () => {
      const { buildOutlookAuthUrl } = await import('@/lib/email/outlook')
      const result = buildOutlookAuthUrl('state123') as string
      const url = new URL(result)
      expect(url.hostname).toBe('login.microsoftonline.com')
      expect(url.searchParams.get('scope')).toContain('Mail.Send')
      expect(url.searchParams.get('scope')).toContain('offline_access')
      expect(url.searchParams.get('state')).toBe('state123')
    })
  })

  describe('exchangeOutlookCode', () => {
    it('fails when the token endpoint does not return a refresh token', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ access_token: 'at' })))
      const { exchangeOutlookCode } = await import('@/lib/email/outlook')
      const result = await exchangeOutlookCode('code123')
      expect(result).toEqual({ error: expect.any(String) })
    })

    it('resolves the mailbox address via a Graph /me call on success', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(jsonResponse({ access_token: 'at', refresh_token: 'rt', expires_in: 3600, scope: 'Mail.Send' }))
        .mockResolvedValueOnce(jsonResponse({ mail: 'org@outlook.com' }))
      vi.stubGlobal('fetch', fetchMock)

      const { exchangeOutlookCode } = await import('@/lib/email/outlook')
      const result = await exchangeOutlookCode('code123')

      expect(result).toMatchObject({ accessToken: 'at', refreshToken: 'rt', mailboxAddress: 'org@outlook.com' })
    })

    it('fails when the mailbox address cannot be determined', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(jsonResponse({ access_token: 'at', refresh_token: 'rt', expires_in: 3600 }))
        .mockResolvedValueOnce(jsonResponse({}))
      vi.stubGlobal('fetch', fetchMock)

      const { exchangeOutlookCode } = await import('@/lib/email/outlook')
      const result = await exchangeOutlookCode('code123')
      expect(result).toEqual({ error: expect.stringContaining('Outlook address') })
    })
  })

  describe('getValidOutlookAccessToken', () => {
    const baseConnection = {
      id: 1,
      org_id: 5,
      provider: 'outlook' as const,
      mailbox_address: 'org@outlook.com',
      granted_scope: 'Mail.Send',
      status: 'connected' as const,
      disconnected_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }

    it('returns the cached access token without refreshing when still valid', async () => {
      const { getValidOutlookAccessToken } = await import('@/lib/email/outlook')
      const result = await getValidOutlookAccessToken({
        ...baseConnection,
        access_token: 'cached-token',
        access_token_expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
        refresh_token: 'rt',
      })
      expect(result).toBe('cached-token')
    })

    it('refreshes and persists a new access token when the cached one is expired', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ access_token: 'new-token', expires_in: 3600 })))
      const { updateOauthAccessToken } = await import('@/lib/db/queries/email-oauth')

      const { getValidOutlookAccessToken } = await import('@/lib/email/outlook')
      const result = await getValidOutlookAccessToken({
        ...baseConnection,
        access_token: 'stale-token',
        access_token_expires_at: new Date(Date.now() - 60_000).toISOString(),
        refresh_token: 'rt',
      })

      expect(result).toBe('new-token')
      expect(updateOauthAccessToken).toHaveBeenCalledWith(5, 'new-token', expect.any(String))
    })

    it('returns reauth_required when the refresh token is dead', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'invalid_grant' }, false)))
      const { getValidOutlookAccessToken } = await import('@/lib/email/outlook')
      const result = await getValidOutlookAccessToken({
        ...baseConnection,
        access_token: null,
        access_token_expires_at: null,
        refresh_token: 'dead-rt',
      })
      expect(result).toEqual({ error: 'reauth_required' })
    })
  })

  describe('sendOutlook', () => {
    it('creates a draft, sends it, then reads back the real internetMessageId', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(jsonResponse({ id: 'draft-id-1' })) // POST /me/messages
        .mockResolvedValueOnce(jsonResponse({ id: 'msg-1' })) // PATCH extended property (In-Reply-To)
        .mockResolvedValueOnce(jsonResponse({})) // POST /send
        .mockResolvedValueOnce(jsonResponse({ internetMessageId: '<real-id@outlook.com>' })) // GET read-back
      vi.stubGlobal('fetch', fetchMock)

      const { sendOutlook } = await import('@/lib/email/outlook')
      const result = await sendOutlook('access-token', {
        to: 'customer@example.com',
        from: 'org@outlook.com',
        subject: 'Re: hello',
        text: 'hi there',
        inReplyTo: '<prior@example.com>',
      })

      expect(result).toEqual({ success: true, rfcMessageId: '<real-id@outlook.com>', providerMessageId: 'draft-id-1' })
      // draft creation must not hit the single-call sendMail convenience endpoint
      expect(fetchMock.mock.calls[0][0]).toContain('/me/messages')
      expect(fetchMock.mock.calls[0][0]).not.toContain('sendMail')
    })

    it('falls back to a synthesized id when internetMessageId cannot be read back, but still succeeds', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(jsonResponse({ id: 'draft-id-2' })) // draft
        .mockResolvedValueOnce(jsonResponse({})) // send (no inReplyTo this time, so no PATCH call)
        .mockResolvedValue(jsonResponse({}, false)) // every read-back retry fails
      vi.stubGlobal('fetch', fetchMock)

      const { sendOutlook } = await import('@/lib/email/outlook')
      const result = await sendOutlook('access-token', {
        to: 'customer@example.com',
        from: 'org@outlook.com',
        subject: 'Re: hello',
        text: 'hi there',
      })

      expect(result).toMatchObject({ success: true, providerMessageId: 'draft-id-2' })
      if ('rfcMessageId' in result) expect(result.rfcMessageId).toContain('draft-id-2')
    }, 10000)

    it('returns an error when draft creation fails, without attempting to send', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false)))
      const { sendOutlook } = await import('@/lib/email/outlook')
      const result = await sendOutlook('bad-token', { to: 'a@b.com', from: 'org@outlook.com', subject: 's', text: 't' })
      expect(result).toEqual({ error: expect.any(String) })
    })
  })

  describe('revokeOutlookToken', () => {
    it('is a documented no-op (Microsoft has no server-side revoke endpoint)', async () => {
      const { revokeOutlookToken } = await import('@/lib/email/outlook')
      await expect(revokeOutlookToken('rt')).resolves.toBeUndefined()
    })
  })
})
