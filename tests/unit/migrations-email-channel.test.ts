import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// Structural tests for the four migrations added on feat/email-channel.
// No DB connection — file-system and SQL content assertions only.

const DRIZZLE_DIR = path.join(process.cwd(), 'drizzle')

function readMigration(filename: string): string {
  const filePath = path.join(DRIZZLE_DIR, filename)
  expect(fs.existsSync(filePath), `Migration not found: ${filename}`).toBe(true)
  return fs.readFileSync(filePath, 'utf-8')
}

describe('0006_discord_connected_guild.sql', () => {
  const FILE = '0006_discord_connected_guild.sql'

  it('file exists and is non-empty', () => {
    const sql = readMigration(FILE)
    expect(sql.trim().length).toBeGreaterThan(0)
  })

  it('adds connected_guild_id column to integrations', () => {
    const sql = readMigration(FILE).toLowerCase()
    expect(sql).toContain('connected_guild_id')
    expect(sql).toContain('integrations')
    expect(sql).toContain('alter table')
  })

  it('creates an index on connected_guild_id', () => {
    const sql = readMigration(FILE).toLowerCase()
    expect(sql).toContain('create index')
    expect(sql).toContain('idx_integrations_guild')
  })
})

describe('0007_ticket_source_platform.sql', () => {
  const FILE = '0007_ticket_source_platform.sql'

  it('file exists and is non-empty', () => {
    const sql = readMigration(FILE)
    expect(sql.trim().length).toBeGreaterThan(0)
  })

  it('adds source_platform column to tickets', () => {
    const sql = readMigration(FILE).toLowerCase()
    expect(sql).toContain('source_platform')
    expect(sql).toContain('tickets')
    expect(sql).toContain('alter table')
  })

  it('defaults source_platform to discord so existing rows are attributed correctly', () => {
    const sql = readMigration(FILE).toLowerCase()
    expect(sql).toContain("default 'discord'")
  })

  it('column is NOT NULL to enforce attribution on all rows', () => {
    const sql = readMigration(FILE).toLowerCase()
    expect(sql).toContain('not null')
  })
})

describe('0008_slack_poll_cursors.sql', () => {
  const FILE = '0008_slack_poll_cursors.sql'

  it('file exists and is non-empty', () => {
    const sql = readMigration(FILE)
    expect(sql.trim().length).toBeGreaterThan(0)
  })

  it('creates slack_poll_cursors table', () => {
    const sql = readMigration(FILE).toLowerCase()
    expect(sql).toContain('create table')
    expect(sql).toContain('slack_poll_cursors')
  })

  it('table has org_id and channel_id as composite primary key', () => {
    const sql = readMigration(FILE).toLowerCase()
    expect(sql).toContain('org_id')
    expect(sql).toContain('channel_id')
    expect(sql).toContain('primary key')
  })

  it('has last_ts column to track poll position', () => {
    const sql = readMigration(FILE).toLowerCase()
    expect(sql).toContain('last_ts')
  })

  it('last_ts defaults to 0 (start of Slack epoch)', () => {
    const sql = readMigration(FILE).toLowerCase()
    expect(sql).toContain("default '0'")
  })
})

describe('0009_org_roi_settings.sql', () => {
  const FILE = '0009_org_roi_settings.sql'

  it('file exists and is non-empty', () => {
    const sql = readMigration(FILE)
    expect(sql.trim().length).toBeGreaterThan(0)
  })

  it('adds roi_minutes_per_ticket to orgs', () => {
    const sql = readMigration(FILE).toLowerCase()
    expect(sql).toContain('roi_minutes_per_ticket')
    expect(sql).toContain('orgs')
    expect(sql).toContain('alter table')
  })

  it('adds roi_staff_hourly_rate to orgs', () => {
    const sql = readMigration(FILE).toLowerCase()
    expect(sql).toContain('roi_staff_hourly_rate')
  })

  it('both ROI columns are integers', () => {
    const sql = readMigration(FILE).toLowerCase()
    // Both ALTER TABLE statements should mention integer type
    const matches = [...sql.matchAll(/integer/g)]
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })
})
