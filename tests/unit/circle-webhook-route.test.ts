import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// Infra tests for the new Circle.so ingest-only channel API route. Source-file
// assertions only — Next.js route modules cannot be imported in vitest
// (matches tests/unit/discourse-webhook-route.test.ts). These lock in the
// security-critical shape of the inbound webhook: it resolves the org from a
// per-org secret (header OR ?token= fallback), rejects anything that is not an
// enabled Circle integration BEFORE touching the pipeline, only ever hands off
// with platform 'circle', keeps the spam/space filters, and — because Circle
// is ingest-only — never imports or calls a Circle *send* function (there is
// none in lib/circle/client.ts either).

const ROOT = process.cwd()

function readSrc(relPath: string): string {
  const absPath = path.join(ROOT, relPath)
  expect(fs.existsSync(absPath), `File not found: ${relPath}`).toBe(true)
  return fs.readFileSync(absPath, 'utf-8')
}

describe('Circle inbound webhook route', () => {
  const src = readSrc('app/api/circle/webhook/route.ts')

  it('exists and exports POST', () => {
    expect(src).toContain('export async function POST')
  })

  it('reads the per-org secret from the x-answerloops-token header AND a ?token= query param', () => {
    expect(src.toLowerCase()).toContain('x-answerloops-token')
    expect(src).toMatch(/searchParams\.get\(['"]token['"]\)/)
  })

  it('resolves the org via getIntegrationByBotSecret and asserts platform+enabled before processing', () => {
    expect(src).toContain('getIntegrationByBotSecret')
    const gateIdx = src.indexOf("integration.platform !== 'circle'")
    const enabledIdx = src.indexOf('integration.enabled !== 1')
    const processIdx = src.indexOf('processCommunityMessage(')
    expect(gateIdx).toBeGreaterThan(-1)
    expect(enabledIdx).toBeGreaterThan(-1)
    // The 401 gate must come before the pipeline hand-off.
    expect(gateIdx).toBeLessThan(processIdx)
    expect(enabledIdx).toBeLessThan(processIdx)
  })

  it('rejects a missing/mismatched token with 401', () => {
    expect(src).toContain("status: 401")
  })

  it('hands off to the shared ingest pipeline only with platform circle', () => {
    expect(src).toContain('processCommunityMessage')
    expect(src).toContain("platform: 'circle'")
    // no other platform string is passed from this route
    expect(src).not.toMatch(/platform: '(?!circle')[a-z_]+'/)
  })

  it('keeps the watched-space, min-length and author filters', () => {
    expect(src).toContain('parseChannelIds')
    expect(src).toContain('content.spaceId')
    expect(src).toMatch(/content\.body\.length < 10/)
    expect(src).toMatch(/content\.authorId/)
    expect(src).toMatch(/=== '0'/)
  })

  it('enrichment fallback references decryptToken + fetchCirclePost/fetchCircleComment', () => {
    expect(src).toContain('decryptToken')
    expect(src).toContain('fetchCirclePost')
    expect(src).toContain('fetchCircleComment')
  })

  it('never imports a Circle send/post function (Circle is ingest-only)', () => {
    expect(src).not.toMatch(/import[^\n]*from '@\/lib\/circle\/send'/)
    expect(src).not.toMatch(/sendToCircle|postToCircle|createCirclePost|postCircle/)
  })
})

describe('lib/circle/client.ts has no write path', () => {
  const src = readSrc('lib/circle/client.ts')

  it('exports no write/post-creating function', () => {
    const exportedNames = [...src.matchAll(/export (?:async )?function (\w+)/g)].map((m) => m[1])
    for (const name of exportedNames) {
      expect(name).not.toMatch(/^(send|post|create|reply|update|delete)/i)
    }
  })

  it('only ever issues GET requests via circleFetch (no method: POST/PUT/...)', () => {
    expect(src).not.toMatch(/method:\s*['"](POST|PUT|PATCH|DELETE)['"]/)
  })
})
