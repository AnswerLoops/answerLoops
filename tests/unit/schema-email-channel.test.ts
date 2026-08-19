import { describe, it, expect } from 'vitest'

// Schema-level assertions for columns added on feat/email-channel.
// Imports lib/db/schema — no DB connection needed.

describe('orgs table: ROI config columns', () => {
  it('orgs table defines roiMinutesPerTicket', async () => {
    const { orgs } = await import('../../lib/db/schema')
    // Drizzle column objects are nested under the table's SQL columns map.
    // Casting to unknown avoids TS complaints about private Drizzle internals.
    const cols = orgs as unknown as Record<string, unknown>
    expect(cols).toHaveProperty('roiMinutesPerTicket')
  })

  it('orgs table defines roiStaffHourlyRate', async () => {
    const { orgs } = await import('../../lib/db/schema')
    const cols = orgs as unknown as Record<string, unknown>
    expect(cols).toHaveProperty('roiStaffHourlyRate')
  })
})

describe('tickets table: source_platform column', () => {
  it('tickets table defines sourcePlatform', async () => {
    const { tickets } = await import('../../lib/db/schema')
    const cols = tickets as unknown as Record<string, unknown>
    expect(cols).toHaveProperty('sourcePlatform')
  })
})

describe('integrations table: connected_guild_id column', () => {
  it('integrations table defines connectedGuildId', async () => {
    const { integrations } = await import('../../lib/db/schema')
    const cols = integrations as unknown as Record<string, unknown>
    expect(cols).toHaveProperty('connectedGuildId')
  })
})

describe('orgs queries: ROI config functions exported', () => {
  it('getOrgROIConfig is exported from lib/db/queries/orgs', async () => {
    const orgsQueries = await import('../../lib/db/queries/orgs')
    expect(typeof orgsQueries.getOrgROIConfig).toBe('function')
  })

  it('saveOrgROIConfig is exported from lib/db/queries/orgs', async () => {
    const orgsQueries = await import('../../lib/db/queries/orgs')
    expect(typeof orgsQueries.saveOrgROIConfig).toBe('function')
  })
})

describe('integrations queries: upsertIntegration exported', () => {
  it('upsertIntegration is exported from lib/db/queries/integrations', async () => {
    const intQueries = await import('../../lib/db/queries/integrations')
    expect(typeof intQueries.upsertIntegration).toBe('function')
  })
})

describe('tickets queries: source_platform field wired in', () => {
  it('createTicket is still exported after source_platform addition', async () => {
    const ticketsQueries = await import('../../lib/db/queries/tickets')
    expect(typeof ticketsQueries.createTicket).toBe('function')
  })
})
