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

  it('tells a soft-cap plan the overage rate rather than warning of an interruption', () => {
    const idx = src.indexOf('function LimitWarningBanner(')
    const body = src.slice(idx, src.indexOf('\nfunction UsageBar(', idx))
    // Pro keeps answering past its quota, so "avoid interruption" copy would
    // be wrong for it — the banner branches on the plan's overage rate.
    expect(body).toContain('overageRatePer100Cents !== null')
    expect(body).toMatch(/\$5 per 100/)
  })
})

describe('app/(dashboard)/billing/page.tsx — over-limit usage bar', () => {
  const src = read('app/(dashboard)/billing/page.tsx')

  it('shows a hard-cap plan the "upgrade to resume" stop and a soft-cap plan the overage note', () => {
    const idx = src.indexOf('function UsageBar(')
    const body = src.slice(idx, src.indexOf('\nfunction PlanCard(', idx))
    expect(body).toContain('Limit reached — upgrade to resume') // hard cap
    expect(body).toContain('over your plan') // soft cap
    expect(body).toContain('overageUnits')
  })
})
