import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Root-cause fix for a production bug: Discord ticket ingestion silently
// stopped working for OAuth-connected servers. trg_config_changed (which
// fires pg_notify('config_changed') via notify_config_changed()) only
// existed on the `integrations` table. Per-guild channel picks made in
// Settings → Discord live in `discord_guilds` instead, so saving a channel
// selection there never notified the running bot process — the change only
// took effect after a manual restart. Fix: a second trigger on
// discord_guilds, reusing the same notify_config_changed() function and the
// same idempotent DROP/CREATE pattern as the existing integrations trigger.

const ROOT = process.cwd()

function read(relPath: string): string {
  const abs = path.join(ROOT, relPath)
  expect(fs.existsSync(abs), `File not found: ${relPath}`).toBe(true)
  return fs.readFileSync(abs, 'utf-8')
}

describe('trg_config_changed_discord_guilds trigger (lib/db/migrate.ts)', () => {
  const src = read('lib/db/migrate.ts')

  it('defines a trigger named trg_config_changed_discord_guilds', () => {
    expect(src).toContain('trg_config_changed_discord_guilds')
  })

  it('the trigger is created on the discord_guilds table', () => {
    const idx = src.indexOf('CREATE TRIGGER trg_config_changed_discord_guilds')
    expect(idx).toBeGreaterThan(-1)
    const stmt = src.slice(idx, src.indexOf(';', idx))
    expect(stmt).toContain('ON discord_guilds')
  })

  it('the trigger fires on INSERT OR UPDATE OR DELETE, matching the integrations trigger', () => {
    const idx = src.indexOf('CREATE TRIGGER trg_config_changed_discord_guilds')
    const stmt = src.slice(idx, src.indexOf(';', idx))
    expect(stmt).toContain('AFTER INSERT OR UPDATE OR DELETE')
  })

  it('reuses the existing notify_config_changed() function rather than defining a new one', () => {
    const idx = src.indexOf('CREATE TRIGGER trg_config_changed_discord_guilds')
    const stmt = src.slice(idx, src.indexOf(';', idx))
    expect(stmt).toContain('EXECUTE FUNCTION notify_config_changed()')

    // Only one CREATE FUNCTION for notify_config_changed should exist —
    // confirms reuse, not a duplicate/divergent implementation.
    const fnDefCount = (src.match(/CREATE OR REPLACE FUNCTION notify_config_changed/g) ?? []).length
    expect(fnDefCount).toBe(1)
  })

  it('has the idempotent DROP TRIGGER IF EXISTS guard, same as trg_config_changed', () => {
    expect(src).toContain('DROP TRIGGER IF EXISTS trg_config_changed_discord_guilds ON discord_guilds')

    // The DROP must precede the CREATE for this trigger (idempotent re-run).
    const dropIdx = src.indexOf('DROP TRIGGER IF EXISTS trg_config_changed_discord_guilds')
    const createIdx = src.indexOf('CREATE TRIGGER trg_config_changed_discord_guilds')
    expect(dropIdx).toBeGreaterThan(-1)
    expect(createIdx).toBeGreaterThan(dropIdx)
  })

  it('the new trigger is declared after the existing integrations trigger in the same migration block', () => {
    const integrationsIdx = src.indexOf('CREATE TRIGGER trg_config_changed\n')
    const discordGuildsIdx = src.indexOf('CREATE TRIGGER trg_config_changed_discord_guilds')
    expect(integrationsIdx).toBeGreaterThan(-1)
    expect(discordGuildsIdx).toBeGreaterThan(integrationsIdx)
  })
})
