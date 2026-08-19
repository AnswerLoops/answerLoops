import { describe, it, expect, beforeEach, vi } from 'vitest'

// Issue #184: bug tickets are never KB-deflectable — runAIAgent skips the
// confidence grader for them entirely, so they never earn an ai_assessments
// row. Before this fix, getDeflectionStats/getDeflectionTrend still counted
// every bug ticket in the "total tickets" denominator, so an org that
// correctly declined to auto-answer a wave of bug reports would see its
// deflection rate drop for doing the right thing. This test runs the real
// query builders (via drizzle's pg-proxy driver, no live Postgres needed) and
// asserts the emitted SQL excludes category = 'bug' from every sub-query that
// feeds the denominator or numerator.

type Call = { sql: string; params: unknown[] }
const { calls } = vi.hoisted(() => ({ calls: [] as Call[] }))

vi.mock('@/lib/db/drizzle', async () => {
  const { drizzle } = await import('drizzle-orm/pg-proxy')
  const db = drizzle(async (sqlText: string, params: unknown[]) => {
    calls.push({ sql: sqlText, params })
    return { rows: [{ n: 0 }] }
  })
  return { getDb: () => db }
})

beforeEach(() => {
  calls.length = 0
})

async function analytics() {
  return import('@/lib/db/queries/analytics')
}

describe('getDeflectionStats excludes bug tickets from every sub-query', () => {
  it('excludes bug tickets from the total-tickets denominator', async () => {
    const { getDeflectionStats } = await analytics()
    await getDeflectionStats(42)

    const totalQuery = calls.find((c) => c.sql.includes('FROM tickets') && !c.sql.includes('JOIN'))
    expect(totalQuery).toBeDefined()
    expect(totalQuery!.sql).toMatch(/category\s*!=\s*'bug'/)
  })

  it('excludes bug tickets from the answered sub-query', async () => {
    const { getDeflectionStats } = await analytics()
    await getDeflectionStats(42)

    const answeredQuery = calls.find(
      (c) => c.sql.includes('ai_assessments') && !c.sql.includes('auto_deflected')
    )
    expect(answeredQuery).toBeDefined()
    expect(answeredQuery!.sql).toMatch(/category\s*!=\s*'bug'/)
  })

  it('excludes bug tickets from the deflected sub-query', async () => {
    const { getDeflectionStats } = await analytics()
    await getDeflectionStats(42)

    const deflectedQuery = calls.find((c) => c.sql.includes('auto_deflected'))
    expect(deflectedQuery).toBeDefined()
    expect(deflectedQuery!.sql).toMatch(/category\s*!=\s*'bug'/)
  })

  it('does not exclude feature_request — only bug is out of scope for this fix', async () => {
    const { getDeflectionStats } = await analytics()
    await getDeflectionStats(42)

    for (const c of calls) {
      expect(c.sql).not.toContain("feature_request")
    }
  })
})

describe('getDeflectionTrend excludes bug tickets from its daily counts', () => {
  it('filters category != bug in the trend query', async () => {
    const { getDeflectionTrend } = await analytics()
    await getDeflectionTrend(14, 42)

    const trendQuery = calls.find((c) => c.sql.includes('LEFT(a.created_at'))
    expect(trendQuery).toBeDefined()
    expect(trendQuery!.sql).toMatch(/category\s*!=\s*'bug'/)
  })
})
