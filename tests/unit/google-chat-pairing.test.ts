import { describe, it, expect, vi, beforeEach } from 'vitest'

// Google Chat's unlisted-app install has no OAuth callback to learn the
// org↔space mapping the way Slack/Discord's OAuth flows do — pairing
// happens instead via a one-time code an org generates, posted as
// `/connect <code>` inside the Chat space after a Workspace admin adds the
// app. These tests cover the DB-layer half of that pairing (the query
// functions the events route calls); route-level behavior is covered by
// reading app/api/google-chat/events/route.ts directly below.

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }))
vi.mock('@/lib/db/drizzle', () => ({ getDb }))
vi.mock('@/lib/crypto/tokens', () => ({
  encryptToken: (s: string) => `enc:${s}`,
  decryptToken: (s: string) => s.replace(/^enc:/, ''),
}))

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    orgId: 7,
    platform: 'google_chat',
    botToken: null,
    botSecret: 'gc_abc123',
    channelIds: null,
    guildChannelMap: null,
    teamId: null,
    webhookSecret: null,
    escalationRoleId: null,
    connectedGuildId: null,
    confidenceThreshold: 0.8,
    enabled: 0,
    createdAt: 'now',
    updatedAt: 'now',
    ...overrides,
  }
}

describe('getIntegrationByPairingCode', () => {
  beforeEach(() => vi.clearAllMocks())

  it('finds a pending (not-yet-enabled) integration by its pairing code', async () => {
    getDb.mockReturnValue({
      select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([row()]) }) }) }),
    })
    const { getIntegrationByPairingCode } = await import('@/lib/db/queries/integrations')
    const result = await getIntegrationByPairingCode('gc_abc123')
    expect(result?.org_id).toBe(7)
    expect(result?.enabled).toBe(0)
  })

  it('returns null when no row matches the code', async () => {
    getDb.mockReturnValue({
      select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }) }),
    })
    const { getIntegrationByPairingCode } = await import('@/lib/db/queries/integrations')
    expect(await getIntegrationByPairingCode('nope')).toBeNull()
  })
})

describe('completeGoogleChatPairing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets team_id to the space name and flips enabled to 1', async () => {
    const set = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
    getDb.mockReturnValue({ update: () => ({ set }) })

    const { completeGoogleChatPairing } = await import('@/lib/db/queries/integrations')
    await completeGoogleChatPairing(7, 'spaces/AAAA111')

    expect(set).toHaveBeenCalledWith(expect.objectContaining({ teamId: 'spaces/AAAA111', enabled: 1 }))
  })
})

describe('getIntegrationByGoogleChatSpace', () => {
  beforeEach(() => vi.clearAllMocks())

  it('finds an enabled, paired integration by space resourceName', async () => {
    getDb.mockReturnValue({
      select: () => ({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([row({ enabled: 1, teamId: 'spaces/AAAA111' })]) }) }),
      }),
    })
    const { getIntegrationByGoogleChatSpace } = await import('@/lib/db/queries/integrations')
    const result = await getIntegrationByGoogleChatSpace('spaces/AAAA111')
    expect(result?.org_id).toBe(7)
  })
})

describe('upsertIntegration — google_chat pairing-code creation stays disabled', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inserting with enabled: false does not default to enabled: 1 like every other platform', async () => {
    const values = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([row()]),
    })
    getDb.mockReturnValue({
      select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }) }),
      insert: () => ({ values }),
    })

    const { upsertIntegration } = await import('@/lib/db/queries/integrations')
    await upsertIntegration({ orgId: 7, platform: 'google_chat', botSecret: 'gc_abc123', enabled: false })

    expect(values).toHaveBeenCalledWith(expect.objectContaining({ enabled: 0 }))
  })
})
