import { describe, it, expect, vi } from 'vitest'
import { drizzle } from 'drizzle-orm/pg-proxy'

// getIntegrationByDiscourseSite is how the inbound webhook resolves which
// org sent an event: Discourse puts the forum's base URL in the
// X-Discourse-Instance header, and the org stored that same URL in teamId
// at connect time. Discourse is inconsistent about a trailing slash on that
// header, so the query MUST normalize it before comparing — otherwise a
// forum registered as `https://forum.example.com` never matches an event
// that arrives as `https://forum.example.com/` and every post is silently
// dropped. It must also scope to platform='discourse' + enabled so it can't
// collect a disabled row or another channel's row that happens to share a
// teamId. Verified against drizzle's pg-proxy driver (compiled SQL, no real
// connection).

describe('getIntegrationByDiscourseSite', () => {
  it('normalizes a trailing slash off the site URL before querying', async () => {
    const calls: { sql: string; params: unknown[] }[] = []
    const fakeDb = drizzle(async (sqlText: string, params: unknown[]) => {
      calls.push({ sql: sqlText, params })
      return { rows: [] }
    })
    vi.doMock('@/lib/db/drizzle', () => ({ getDb: () => fakeDb }))
    vi.resetModules()

    const { getIntegrationByDiscourseSite } = await import('@/lib/db/queries/integrations')
    const result = await getIntegrationByDiscourseSite('https://forum.example.com///')

    expect(result).toBeNull()
    expect(calls.length).toBe(1)
    // The normalized value, not the raw one with trailing slashes.
    expect(calls[0].params).toContain('https://forum.example.com')
    expect(calls[0].params).not.toContain('https://forum.example.com///')
  })

  it('scopes the query to platform=discourse and enabled', async () => {
    const calls: { sql: string; params: unknown[] }[] = []
    const fakeDb = drizzle(async (sqlText: string, params: unknown[]) => {
      calls.push({ sql: sqlText, params })
      return { rows: [] }
    })
    vi.doMock('@/lib/db/drizzle', () => ({ getDb: () => fakeDb }))
    vi.resetModules()

    const { getIntegrationByDiscourseSite } = await import('@/lib/db/queries/integrations')
    await getIntegrationByDiscourseSite('https://forum.example.com')

    const sql = calls[0].sql.toLowerCase()
    expect(sql).toContain('team_id')
    expect(sql).toContain('platform')
    expect(sql).toContain('enabled')
    expect(calls[0].params).toContain('discourse')
  })
})
