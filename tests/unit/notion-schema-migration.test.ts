import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// Notion workspace as a KB source (feat/notion-kb-source). This adds one table
// (`notion_connections`, one row per org, holding the encrypted internal
// integration token) and one column (`kb_sources.published`, default 1 so every
// existing source and every non-Notion importer stays published; Notion is the
// only source that imports hidden).
//
// These assertions catch the classic split-brain regression: migration SQL
// shipped but the Drizzle schema not updated (or vice-versa), the new table
// left out of `hardPurgeOrg` so a deleted customer's encrypted token outlives
// their account, or Notion quietly turned into a plan-gated feature (it is
// deliberately NOT gated).

const ROOT = process.cwd()

describe('drizzle/0037_notion_kb.sql', () => {
  const file = path.join(ROOT, 'drizzle/0037_notion_kb.sql')

  it('exists and is non-empty', () => {
    expect(fs.existsSync(file)).toBe(true)
    expect(fs.readFileSync(file, 'utf-8').trim().length).toBeGreaterThan(0)
  })

  it('creates the notion_connections table', () => {
    const sql = fs.readFileSync(file, 'utf-8')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS notion_connections')
  })

  it('makes org_id a required unique FK and stores the access token', () => {
    const sql = fs.readFileSync(file, 'utf-8')
    expect(sql).toContain('org_id INTEGER NOT NULL UNIQUE')
    expect(sql).toContain('REFERENCES orgs(id)')
    expect(sql).toContain('access_token')
  })

  it('adds kb_sources.published idempotently with a default of 1 and indexes it', () => {
    const sql = fs.readFileSync(file, 'utf-8')
    expect(sql).toContain('ALTER TABLE kb_sources ADD COLUMN IF NOT EXISTS published')
    expect(sql).toMatch(/published INTEGER NOT NULL DEFAULT 1/)
    expect(sql).toContain('idx_kb_sources_published')
  })
})

describe('lib/db/schema.ts', () => {
  const schemaSrc = fs.readFileSync(path.join(ROOT, 'lib/db/schema.ts'), 'utf-8')

  it('exports the notionConnections table mapped to notion_connections', async () => {
    const { notionConnections } = await import('../../lib/db/schema')
    expect(notionConnections).toBeDefined()
    expect(schemaSrc).toContain("'notion_connections'")
    expect(schemaSrc).toContain('access_token')
  })

  it('the kbSources block gains a published column', () => {
    const idx = schemaSrc.indexOf('export const kbSources = pgTable(')
    expect(idx).toBeGreaterThan(-1)
    const block = schemaSrc.slice(idx, schemaSrc.indexOf('export const notionConnections', idx))
    expect(block).toContain('published')
    expect(block).toContain('idx_kb_sources_published')
  })
})

describe('lib/billing/entitlements.ts — Notion is deliberately NOT plan-gated', () => {
  it('has no reference to notion anywhere in the entitlement definitions', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/billing/entitlements.ts'), 'utf-8')
    expect(src.toLowerCase()).not.toContain('notion')
  })
})

describe('lib/db/queries/orgs.ts — hardPurgeOrg', () => {
  it('deletes the org row from notion_connections so the encrypted token does not outlive the account', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/db/queries/orgs.ts'), 'utf-8')
    const purgeBody = src.slice(src.indexOf('export async function hardPurgeOrg'))
    expect(purgeBody).toContain('delete(notionConnections)')
    expect(purgeBody).toMatch(/delete\(notionConnections\)\.where\(eq\(notionConnections\.orgId, orgId\)\)/)
  })
})
