import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// Roadmap "Pricing page (Managed SaaS)" item — upgrade trigger: an in-app
// banner once an org crosses 80% of its monthly deflection limit, distinct
// from the existing over-limit (100%+) messaging in UsageBar.
//
// Source-file structural assertion — the billing page fetches live org data
// client-side; same convention as other dashboard-route tests in this repo.

const ROOT = process.cwd()

function read(relPath: string): string {
  const absPath = path.join(ROOT, relPath)
  expect(fs.existsSync(absPath), `File not found: ${relPath}`).toBe(true)
  return fs.readFileSync(absPath, 'utf-8')
}

describe('app/(dashboard)/billing/page.tsx — approaching-limit banner', () => {
  const src = read('app/(dashboard)/billing/page.tsx')

  it('fires the banner in the 80–100% band, not at or past 100% (that is the over-limit case)', () => {
    expect(src).toContain('usagePct >= 80 && usagePct < 100')
  })

  it('never shows the banner for a canceled subscription or an unlimited plan', () => {
    const idx = src.indexOf('const approachingLimit =')
    const line = src.slice(idx, src.indexOf('\n', idx))
    expect(line).toContain('!isCanceled')
    expect(line).toContain("data?.limit !== null")
  })

  it('offers an upgrade CTA to the next tier up, not a generic link', () => {
    expect(src).toContain('const NEXT_TIER: Record<string, string | null> = {')
    expect(src).toMatch(/standard: 'pro'/)
    expect(src).toMatch(/pro: 'enterprise'/)
    expect(src).toMatch(/enterprise: null/)
  })

  it('reuses the existing upgrade() checkout flow instead of a separate code path', () => {
    const idx = src.indexOf('function LimitWarningBanner(')
    const body = src.slice(idx, src.indexOf('\nfunction UsageBar(', idx))
    expect(body).toContain('onUpgrade(nextPlan)')
  })
})
