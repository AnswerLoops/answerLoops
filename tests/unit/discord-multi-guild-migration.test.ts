import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// Structural tests for 0017_discord_multi_guild.sql, added to lift the
// "one Discord server per org" cap. No DB connection — file-system and SQL
// content assertions only, matching tests/unit/migrations-email-channel.test.ts.

const DRIZZLE_DIR = path.join(process.cwd(), 'drizzle')
const FILE = '0017_discord_multi_guild.sql'

function readMigration(filename: string): string {
  const filePath = path.join(DRIZZLE_DIR, filename)
  expect(fs.existsSync(filePath), `Migration not found: ${filename}`).toBe(true)
  return fs.readFileSync(filePath, 'utf-8')
}

describe('0017_discord_multi_guild.sql', () => {
  it('file exists and is non-empty', () => {
    const sql = readMigration(FILE)
    expect(sql.trim().length).toBeGreaterThan(0)
  })

  it('creates discord_guilds table', () => {
    const sql = readMigration(FILE).toLowerCase()
    expect(sql).toContain('create table')
    expect(sql).toContain('discord_guilds')
  })

  it('table has org_id, guild_id, and channel_ids columns', () => {
    const sql = readMigration(FILE).toLowerCase()
    expect(sql).toContain('org_id')
    expect(sql).toContain('guild_id')
    expect(sql).toContain('channel_ids')
  })

  it('guild_id has a unique index — a server can only belong to one org', () => {
    const sql = readMigration(FILE).toLowerCase()
    expect(sql).toContain('create unique index')
    expect(sql).toContain('discord_guilds_guild_unique')
  })

  it('has an index on org_id for the settings-page list query', () => {
    const sql = readMigration(FILE).toLowerCase()
    expect(sql).toContain('idx_discord_guilds_org')
  })

  it('backfills existing single-guild OAuth connections from integrations', () => {
    const sql = readMigration(FILE).toLowerCase()
    expect(sql).toContain('insert into discord_guilds')
    expect(sql).toContain('from integrations')
    expect(sql).toContain("platform = 'discord'")
    expect(sql).toContain('connected_guild_id')
  })

  it('backfill is idempotent (ON CONFLICT DO NOTHING on guild_id)', () => {
    const sql = readMigration(FILE).toLowerCase()
    expect(sql).toContain('on conflict (guild_id) do nothing')
  })
})
