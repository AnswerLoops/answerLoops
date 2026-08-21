import { describe, it, expect, vi, beforeEach } from 'vitest'
import { drizzle } from 'drizzle-orm/pg-proxy'

/**
 * `getOrgOwner` (lib/db/queries/members.ts) — the lookup that turns an org id
 * into a person to address.
 *
 * It exists because the Stripe webhook is the new sender of the welcome email
 * and the webhook knows an org id and nothing else. The only other address
 * available at that point is whatever Stripe collected at checkout, which is
 * not necessarily the account that signed up — someone can pay with a work
 * card under a billing address they will never sign in with. Getting this
 * query wrong sends the one welcome a customer ever receives to an inbox they
 * do not read, and there is no second chance: the send is gated on the org's
 * first subscription and never fires again.
 *
 * Two failure modes are quiet enough to ship unnoticed and are pinned below.
 * Dropping either half of the WHERE returns a plausible row that is simply the
 * wrong person — org-only hands back an ordinary member of the right
 * workspace, role-only hands back some other workspace's owner. Dropping the
 * ORDER BY / LIMIT makes an org with shared ownership return whichever row
 * Postgres felt like emitting first, so the same org can resolve to different
 * people on different days.
 *
 * Driven against a fake pg-proxy driver, the pattern used by
 * tests/unit/org-access-revocation.test.ts: the decision and the emitted SQL
 * are both observable without a database.
 */

const { calls, result } = vi.hoisted(() => ({
  calls: [] as { sql: string; params: unknown[] }[],
  result: { rows: [] as unknown[][] },
}))

const fakeDb = drizzle(async (sql: string, params: unknown[]) => {
  calls.push({ sql, params })
  return { rows: result.rows }
})

vi.mock('@/lib/db/drizzle', () => ({ getDb: () => fakeDb }))

const subject = async () => (await import('@/lib/db/queries/members')).getOrgOwner

// Column order matches the select in getOrgOwner: email, then name. pg-proxy
// hands back positional rows.
const ownerRow = (email: string | null, name: string | null) => [email, name]

beforeEach(() => {
  calls.length = 0
  result.rows = []
})

describe('getOrgOwner: who it resolves to', () => {
  it('returns the owner’s email and name', async () => {
    const getOrgOwner = await subject()
    result.rows = [ownerRow('ada@example.com', 'Ada Lovelace')]

    expect(await getOrgOwner(42)).toEqual({ email: 'ada@example.com', name: 'Ada Lovelace' })
  })

  it('returns null when the org has no owner row', async () => {
    // The caller treats null as "fall back to the address Stripe collected", so
    // this has to be a clean null rather than undefined or a partial object —
    // `owner?.email ?? session.customer_details?.email` only reaches the
    // fallback if there is nothing truthy on the left.
    const getOrgOwner = await subject()
    result.rows = []

    expect(await getOrgOwner(42)).toBeNull()
  })

  it('returns a row whose name is null rather than refusing it', async () => {
    // OAuth providers do not all supply a display name. A nameless owner is a
    // valid owner; the email template already greets without one.
    const getOrgOwner = await subject()
    result.rows = [ownerRow('ada@example.com', null)]

    expect(await getOrgOwner(42)).toEqual({ email: 'ada@example.com', name: null })
  })

  it('takes the first row when ownership is shared', async () => {
    // Paired with the ORDER BY below, "first" means the founding owner — the
    // person who started the trial being welcomed. Pinned separately from the
    // SQL so a refactor that keeps the ordering but starts returning the whole
    // array (or the last element) is caught here.
    const getOrgOwner = await subject()
    result.rows = [ownerRow('founder@example.com', 'Ada'), ownerRow('cofounder@example.com', 'Grace')]

    expect(await getOrgOwner(42)).toEqual({ email: 'founder@example.com', name: 'Ada' })
  })
})

describe('getOrgOwner: the query itself', () => {
  it('scopes on both the org and the owner role, not one of them', async () => {
    const getOrgOwner = await subject()
    result.rows = [ownerRow('ada@example.com', 'Ada')]

    await getOrgOwner(42)

    expect(calls).toHaveLength(1)
    const sql = calls[0].sql.toLowerCase()
    // Either predicate alone silently returns the wrong person: org-only picks
    // up an ordinary member, role-only picks up another workspace's owner.
    expect(sql, 'the org predicate is missing').toContain('"memberships"."org_id" =')
    expect(sql, 'the role predicate is missing').toContain('"memberships"."role" =')
    expect(sql, 'the two predicates must both apply, not either').toMatch(
      /"memberships"\."org_id" = \$\d+ and "memberships"\."role" = \$\d+|"memberships"\."role" = \$\d+ and "memberships"\."org_id" = \$\d+/,
    )
    expect(calls[0].params).toEqual(expect.arrayContaining([42, 'owner']))
  })

  it('resolves the address through the users table rather than trusting membership alone', async () => {
    const getOrgOwner = await subject()
    result.rows = [ownerRow('ada@example.com', 'Ada')]

    await getOrgOwner(42)

    const sql = calls[0].sql.toLowerCase()
    // An inner join, not a left join: a membership with no user row has no
    // address and must not surface as an owner with a null email, which the
    // caller would happily hand to the mail provider.
    expect(sql).toContain('inner join "users"')
    expect(sql).toContain('"users"."email"')
    expect(sql).toContain('"users"."name"')
  })

  it('orders by join date and takes one row, so a shared-ownership org is deterministic', async () => {
    const getOrgOwner = await subject()
    result.rows = [ownerRow('founder@example.com', 'Ada')]

    await getOrgOwner(42)

    const sql = calls[0].sql.toLowerCase()
    // Without the ORDER BY, an org with two owners resolves to whichever row
    // the planner emits first — stable in testing, not stable in production,
    // and the failure is a welcome email addressed to the wrong founder.
    expect(sql, 'unordered multi-owner lookup is nondeterministic').toContain(
      'order by "memberships"."created_at"',
    )
    expect(sql, 'the query must not stream every member back').toMatch(/limit \$?\d+/)
    expect(calls[0].params).toEqual(expect.arrayContaining([1]))
  })

  it('issues exactly one round trip', async () => {
    // It runs inside the webhook's try/catch on the checkout path, where every
    // extra query is latency Stripe is timing against a retry.
    const getOrgOwner = await subject()
    result.rows = [ownerRow('ada@example.com', 'Ada')]

    await getOrgOwner(42)

    expect(calls).toHaveLength(1)
  })
})
