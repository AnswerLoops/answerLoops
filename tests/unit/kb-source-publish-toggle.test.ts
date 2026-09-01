import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// The publish toggle (feat/notion-kb-source). `kb_sources.published` is what
// the KB UI shows and toggles; `kb_articles.published` is what retrieval and
// the widget actually filter on. If they drift, a source can look published in
// the UI while its chunks stay invisible to the AI (or vice-versa), so
// setKBSourcePublished must write BOTH tables, and both writes must be
// org-scoped — a source id alone is guessable across tenants.
//
// Also guards the "only Notion imports hidden" contract: createArticleFromSource
// gained an optional `published` that is written ONLY when explicitly passed, so
// every other importer still gets the column default of 1.

const ROOT = process.cwd()

function read(relPath: string): string {
  const absPath = path.join(ROOT, relPath)
  expect(fs.existsSync(absPath), `File not found: ${relPath}`).toBe(true)
  return fs.readFileSync(absPath, 'utf-8')
}

describe('lib/db/queries/kb-sources.ts — setKBSourcePublished', () => {
  const src = read('lib/db/queries/kb-sources.ts')
  const idx = src.indexOf('export async function setKBSourcePublished(')
  const body = src.slice(idx, src.indexOf('\nexport async function', idx + 1))

  it('exists and takes (sourceId, orgId, published)', () => {
    expect(idx).toBeGreaterThan(-1)
    expect(body).toMatch(/setKBSourcePublished\(\s*sourceId: number,\s*orgId: number,\s*published: 0 \| 1/)
  })

  it('updates both kb_sources and kb_articles in lockstep', () => {
    expect(body).toContain('.update(kbSources)')
    expect(body).toContain('.update(kbArticles)')
  })

  it('scopes BOTH updates to the org, not just the source id', () => {
    expect(body).toContain('and(eq(kbSources.id, sourceId), eq(kbSources.orgId, orgId))')
    expect(body).toContain('and(eq(kbArticles.sourceId, sourceId), eq(kbArticles.orgId, orgId))')
  })
})

describe('lib/db/queries/kb-sources.ts — createKBSource honours an explicit published', () => {
  const src = read('lib/db/queries/kb-sources.ts')

  it('accepts an optional published and writes it only when defined', () => {
    const idx = src.indexOf('export async function createKBSource(')
    const body = src.slice(idx, src.indexOf('\nexport ', idx + 1))
    expect(body).toMatch(/published\?: 0 \| 1/)
    expect(body).toContain('...(input.published !== undefined && { published: input.published })')
  })

  it('toSource maps the published column through to the API shape', () => {
    expect(src).toContain('published: row.published as 0 | 1')
  })
})

describe('lib/db/queries/kb.ts — createArticleFromSource defaults to published for every other importer', () => {
  const src = read('lib/db/queries/kb.ts')
  const idx = src.indexOf('export async function createArticleFromSource(')
  const body = src.slice(idx, src.indexOf('\nexport async function', idx + 1))

  it('the input type has an optional published', () => {
    expect(body).toMatch(/published\?: 0 \| 1/)
  })

  it('writes published only when the caller explicitly passed it', () => {
    expect(body).toContain('...(input.published !== undefined && { published: input.published })')
  })
})
