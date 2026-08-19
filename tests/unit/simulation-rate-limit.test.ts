import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// Known Issues item 50 (Roadmap): the simulation endpoint had the correct
// orgHasFeature('simulation') gate, but count (up to 100) drives up to 100
// generateText + assessAnswer pairs per request with no rate/cost limit —
// unmetered LLM spend for a Pro-tier org that just calls it repeatedly.
// Also carried stale "Scale plan" copy from the plan-id rename. Source-shape
// assertions, matching this repo's convention (see tests/unit/agent-api.test.ts).

const ROOT = process.cwd()

function readSrc(relPath: string): string {
  const absPath = path.join(ROOT, relPath)
  expect(fs.existsSync(absPath), `File not found: ${relPath}`).toBe(true)
  return fs.readFileSync(absPath, 'utf-8')
}

const src = () => readSrc('app/api/simulation/run/route.ts')

describe('app/api/simulation/run/route.ts — rate limit', () => {
  it('imports orgRateLimitPerMinute and rateLimitShared', () => {
    const s = src()
    expect(s).toContain("import { orgHasFeature, orgRateLimitPerMinute } from '@/lib/billing/entitlements-server'")
    expect(s).toContain("import { rateLimitShared } from '@/lib/ratelimit'")
  })

  it('rate-limits after the feature gate but before any DB query or model work', () => {
    const s = src()
    const featureGateIdx = s.indexOf("orgHasFeature(orgId, 'simulation')")
    const rateLimitIdx = s.indexOf('const rateLimit = await rateLimitShared(`simulation:')
    const dbQueryIdx = s.indexOf('.from(tickets)')
    expect(featureGateIdx).toBeGreaterThan(-1)
    expect(rateLimitIdx).toBeGreaterThan(featureGateIdx)
    expect(rateLimitIdx).toBeLessThan(dbQueryIdx)

    const rateLimitBlock = s.slice(rateLimitIdx, rateLimitIdx + 260)
    expect(rateLimitBlock).toContain('429')
  })

  it('uses the plan-scaled ceiling via orgRateLimitPerMinute, not a hardcoded number', () => {
    const s = src()
    expect(s).toContain('const orgRateLimitMax = await orgRateLimitPerMinute(orgId)')
    expect(s).toMatch(/rateLimitShared\(`simulation:\$\{orgId\}`,\s*orgRateLimitMax,\s*RATE_LIMIT_WINDOW_MS\)/)
  })

  it('no longer references the stale pre-rename "Scale plan" copy', () => {
    const s = src()
    expect(s).not.toContain('Scale plan')
    expect(s).toContain('Pro plan')
  })
})
