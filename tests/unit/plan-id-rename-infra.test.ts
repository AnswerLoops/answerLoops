import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Infrastructure coverage for the PlanId rename:
//   drizzle/0021_rename_plan_ids.sql
//   app/api/billing/webhook/route.ts (checkout.session.completed metadata trust)
//
// Old id 'pro' (displayed "Standard") -> new id 'standard'.
// Old id 'scale' (displayed "Pro") -> new id 'pro'.
//
// The application-level rename itself (lib/billing/plans.ts, entitlements,
// UI) is covered by its own unit/component tests. This file is only about
// the two things that are genuinely infra-shaped: does the data migration
// apply the swap in the correct order, and does the webhook stop trusting
// a plan id that arrived in Stripe metadata verbatim.

const ROOT = process.cwd()
const DRIZZLE_DIR = path.join(ROOT, 'drizzle')
const MIGRATION = '0021_rename_plan_ids.sql'

function readFileAt(relPath: string): string {
  const abs = path.join(ROOT, relPath)
  expect(fs.existsSync(abs), `File not found: ${relPath}`).toBe(true)
  return fs.readFileSync(abs, 'utf-8')
}

const readMigration = () => readFileAt(path.join('drizzle', MIGRATION))
const migrationSql = () => readMigration().replace(/--[^\n]*/g, '')

// ---------------------------------------------------------------------------
// Migration file — statement order is the one thing that can silently
// corrupt data here (see the SQL file's own comment for why).
// ---------------------------------------------------------------------------

describe(`drizzle/${MIGRATION}`, () => {
  it('exists and is non-empty', () => {
    expect(readMigration().trim().length).toBeGreaterThan(0)
    expect(migrationSql().trim().length).toBeGreaterThan(0)
  })

  it('touches only subscriptions.plan_id, and nothing else', () => {
    const tables = [...migrationSql().matchAll(/UPDATE\s+([a-z_]+)/gi)].map((m) => m[1])
    expect(tables).toEqual(['subscriptions', 'subscriptions'])
    expect(migrationSql()).not.toMatch(/\b(DROP|CREATE TABLE|TRUNCATE|DELETE|ALTER TABLE)\b/i)
  })

  it("renames 'pro' -> 'standard' strictly before 'scale' -> 'pro'", () => {
    // The whole point of this file: if these two statements ran in the
    // opposite order (or as one WHERE-IN update without the swap being
    // sequenced), the second statement's WHERE plan_id = 'scale' would fire
    // against a database that already contains new 'pro' rows produced by
    // a wrongly-ordered first pass, and there would be no way to tell an
    // originally-'scale' row apart from an originally-'pro' row once both
    // become 'pro' — the rename would silently collapse two tiers into one.
    const sql = migrationSql()
    const firstIdx = sql.indexOf("plan_id = 'standard'")
    const secondIdx = sql.indexOf("plan_id = 'pro' WHERE plan_id = 'scale'")
    expect(firstIdx).toBeGreaterThan(-1)
    expect(secondIdx).toBeGreaterThan(-1)
    expect(firstIdx).toBeLessThan(secondIdx)
  })

  // migrationSql() strips '-- comment' lines, which would also eat the
  // '--> statement-breakpoint' marker itself — so splitting on the marker
  // has to happen against the raw file, before comment-stripping, and only
  // strip comments per-chunk afterward.
  const rawStatements = () =>
    readMigration()
      .split('--> statement-breakpoint')
      .map((s) => s.replace(/--[^\n]*/g, '').trim())
      .filter(Boolean)

  it('the first statement sources only from the old \'pro\' id, not from anything already renamed', () => {
    expect(rawStatements()[0]).toMatch(/UPDATE\s+subscriptions\s+SET\s+plan_id\s*=\s*'standard'\s+WHERE\s+plan_id\s*=\s*'pro'/i)
  })

  it('the second statement sources only from the old \'scale\' id', () => {
    expect(rawStatements()[1]).toMatch(/UPDATE\s+subscriptions\s+SET\s+plan_id\s*=\s*'pro'\s+WHERE\s+plan_id\s*=\s*'scale'/i)
  })

  it('is naturally idempotent — a WHERE-scoped UPDATE re-run against already-migrated rows is a no-op', () => {
    // Unlike the ADD COLUMN IF NOT EXISTS pattern elsewhere in this repo,
    // a data UPDATE doesn't need an explicit guard: once no row matches
    // plan_id = 'pro' (old) or plan_id = 'scale', replaying the file finds
    // zero rows and changes nothing. Asserting the statements are plain
    // UPDATE ... WHERE, not something order-sensitive across replays.
    const statements = rawStatements()
    expect(statements.length).toBe(2)
    for (const stmt of statements) {
      expect(stmt).toMatch(/^UPDATE\s+subscriptions\s+SET\s+plan_id\s*=\s*'[a-z]+'\s+WHERE\s+plan_id\s*=\s*'[a-z]+';?$/i)
    }
  })
})

describe('lib/db/migrate.ts picks the migration up', () => {
  it('is discovered by the runner glob and sorts after every earlier migration', () => {
    const files = fs
      .readdirSync(DRIZZLE_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort()
    expect(files).toContain(MIGRATION)
    const idx = files.indexOf(MIGRATION)
    expect(files.slice(0, idx).every((f) => f < MIGRATION)).toBe(true)
  })

  it('has a unique numeric prefix, so ordering is deterministic', () => {
    const prefix = MIGRATION.slice(0, 4)
    const clashes = fs
      .readdirSync(DRIZZLE_DIR)
      .filter((f) => f.endsWith('.sql') && f.startsWith(prefix))
    expect(clashes).toEqual([MIGRATION])
  })

  it('is hand-written, so it must not be registered in the drizzle journal', () => {
    const journal = JSON.parse(
      fs.readFileSync(path.join(DRIZZLE_DIR, 'meta', '_journal.json'), 'utf-8')
    ) as { entries: { tag: string }[] }
    expect(journal.entries.map((e) => e.tag)).not.toContain(MIGRATION.replace('.sql', ''))
  })
})

// ---------------------------------------------------------------------------
// Webhook: checkout.session.completed must not trust a stale/foreign plan id
// ---------------------------------------------------------------------------

describe('app/api/billing/webhook/route.ts — plan id normalization', () => {
  const src = () => readFileAt('app/api/billing/webhook/route.ts')

  it('routes the checkout session metadata plan_id through getPlan() instead of trusting it verbatim', () => {
    // Regression this guards against: a checkout session started on code
    // before this rename, completing (webhook delivered) after it ships,
    // would otherwise persist a since-renamed id string straight into the
    // DB with no validation. There is no free tier to fall back to, and
    // (per item 65) no paid-tier fallback either — an unrecognized id is
    // refused outright (500, so Stripe retries) rather than defaulted to
    // any real plan, since a brand-new org has no existing row to fall back
    // to and defaulting would grant access it never purchased.
    const s = src()
    expect(s).toContain("import { priceIdToPlan, getPlan } from '@/lib/billing/plans'")
    expect(s).toContain('const requestedPlan = getPlan(session.metadata?.plan_id)')
    expect(s).toMatch(/if \(!requestedPlan\) \{[\s\S]*?status: 500[\s\S]*?\}/)
    expect(s).not.toContain("const planId = requestedPlan?.id ?? 'standard'")
    expect(s).not.toContain("session.metadata?.plan_id ?? 'hobby'")
  })

  it('subscription.updated prefers the existing row over a hardcoded fallback, and skips rather than fabricates one (item 65)', () => {
    // customer.subscription.updated prefers the existing row's plan over a
    // hardcoded fallback when the price can't be resolved (item 48). When
    // there's no existing row either, item 65 changed this from defaulting
    // to 'standard' (unearned paid access) to skipping the write outright.
    const s = src()
    expect(s).toContain('const planId = plan?.id ?? existingSub!.planId')
    expect(s).not.toMatch(/planId:\s*plan\?\.id\s*\?\?\s*'pro'/)
    expect(s).not.toMatch(/const planId = plan\?\.id \?\? existingSub\?\.planId \?\? 'standard'/)
  })

  it('invoice.payment_failed skips rather than fabricates a standard plan when there is no existing row (item 65)', () => {
    // past_due still counts as active access (hasActiveAccess), so
    // defaulting to 'standard' here for an org with no subscription row on
    // file would grant real paid access nobody ever purchased.
    const s = src()
    const idx = s.indexOf("case 'invoice.payment_failed'")
    const caseBody = s.slice(idx, s.indexOf('default:', idx))
    expect(caseBody).toMatch(/if \(!existingSub\) \{[\s\S]*?break\s*\}/)
    expect(caseBody).toContain('planId: existingSub.planId')
    expect(caseBody).not.toMatch(/planId:\s*existingSub\?\.planId\s*\?\?\s*'standard'/)
  })

  it('subscription.deleted revokes access via status, not a downgrade to a free plan', () => {
    // There is no free tier: cancellation sets status: 'canceled' (which is
    // what actually locks the org out — see hasActiveAccess in
    // lib/billing/plans.ts) and preserves the last real planId purely as a
    // historical record, rather than reassigning to a fallback plan.
    const s = src()
    expect(s).not.toContain("planId: 'hobby'")
    expect(s).toContain("planId: existingSub?.planId ?? 'standard'")
    expect(s).toContain("status: 'canceled'")
  })
})
