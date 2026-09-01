import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// The Discourse channel adds one column (`bot_username` on `integrations`,
// posted as the Api-Username header on every write) and one billing feature
// (`discourse_integration`, a Standard-plan entitlement). These assertions
// catch the classic split-brain regression: migration SQL shipped but the
// Drizzle schema not updated (or vice-versa), or the feature added to the
// union type but left out of a plan's feature list so it's gated off for
// everyone.

const ROOT = process.cwd()

describe('drizzle/0036_discourse_bot_username.sql', () => {
  const file = path.join(ROOT, 'drizzle/0036_discourse_bot_username.sql')

  it('exists and is non-empty', () => {
    expect(fs.existsSync(file)).toBe(true)
    expect(fs.readFileSync(file, 'utf-8').trim().length).toBeGreaterThan(0)
  })

  it('alters the integrations table to add bot_username', () => {
    const sql = fs.readFileSync(file, 'utf-8')
    expect(sql).toContain('ALTER TABLE integrations')
    expect(sql).toContain('bot_username')
  })
})

describe('lib/db/schema.ts: integrations.botUsername', () => {
  it('the integrations table defines botUsername', async () => {
    const { integrations } = await import('../../lib/db/schema')
    const cols = integrations as unknown as Record<string, unknown>
    expect(cols).toHaveProperty('botUsername')
  })

  it('the schema source maps it to the bot_username column', () => {
    const schemaSrc = fs.readFileSync(path.join(ROOT, 'lib/db/schema.ts'), 'utf-8')
    expect(schemaSrc).toContain("bot_username")
  })
})

describe('lib/billing/entitlements.ts: discourse_integration feature', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/billing/entitlements.ts'), 'utf-8')

  it('is part of the Feature union', () => {
    expect(src).toMatch(/\|\s*'discourse_integration'/)
  })

  it('is included in STANDARD_FEATURES', () => {
    const line = src.split('\n').find((l) => l.includes('STANDARD_FEATURES')) ?? ''
    expect(line).toContain("'discourse_integration'")
  })
})
