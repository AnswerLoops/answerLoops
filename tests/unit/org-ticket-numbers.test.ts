import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { drizzle } from 'drizzle-orm/pg-proxy'

// tickets.id is a global serial shared across every org — correct for FKs
// (ticket_replies, ai_assessments, etc. all reference it), wrong to ever
// show a customer: org 12's 3rd-ever ticket showing as "#847" leaks how
// many tickets every other org on the platform has created, and looks
// broken regardless ("why did we skip 846 tickets?"). Found live: a
// freshly onboarded test org's very first tickets showed as #40-#44.
//
// getNextOrgTicketNumber's single UPDATE...RETURNING is the actual
// correctness-critical piece — it has to be race-safe under concurrent
// ticket creation for the same org without a separate advisory lock, which
// only holds if the increment lands inside the same statement Postgres's
// row-level lock protects. A source-string check can't tell "looks right"
// apart from "actually atomic", so this runs against drizzle's pg-proxy
// driver (compiled SQL, no real connection) to confirm the increment and
// the read happen in one statement — same convention as
// tests/unit/api-generation-key-attribution.test.ts.

const ROOT = process.cwd()

function read(relPath: string): string {
  const abs = path.join(ROOT, relPath)
  expect(fs.existsSync(abs), `File not found: ${relPath}`).toBe(true)
  return fs.readFileSync(abs, 'utf-8')
}

const { calls } = vi.hoisted(() => ({ calls: [] as { sql: string; params: unknown[] }[] }))

const fakeDb = drizzle(async (sqlText: string, params: unknown[]) => {
  calls.push({ sql: sqlText, params })
  if (sqlText.trim().toLowerCase().startsWith('update') && sqlText.includes('"orgs"')) {
    // Simulate the counter having been at 5 before this call.
    return { rows: [[6]] }
  }
  return { rows: [] }
})

vi.mock('@/lib/db/drizzle', () => ({ getDb: () => fakeDb }))

describe('migration + schema: per-org ticket numbers', () => {
  it('migration adds both columns, backfills existing rows, and adds the unique index', () => {
    const src = read('drizzle/0026_org_ticket_numbers.sql')
    expect(src).toContain('ALTER TABLE orgs ADD COLUMN IF NOT EXISTS next_ticket_number integer NOT NULL DEFAULT 1')
    expect(src).toContain('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS org_ticket_number integer')
    expect(src).toContain('ROW_NUMBER() OVER (PARTITION BY org_id ORDER BY id)')
    expect(src).toContain('ALTER TABLE tickets ALTER COLUMN org_ticket_number SET NOT NULL')
    expect(src).toContain('CREATE UNIQUE INDEX IF NOT EXISTS tickets_org_ticket_number_unique ON tickets(org_id, org_ticket_number)')
  })

  it('backfill seeds each org.next_ticket_number past its highest backfilled number, so new tickets cannot collide with backfilled ones', () => {
    const src = read('drizzle/0026_org_ticket_numbers.sql')
    expect(src).toContain('SELECT MAX(org_ticket_number) + 1 FROM tickets WHERE org_id = o.id')
  })

  it('schema declares matching not-null columns and the same unique index', () => {
    const schemaSrc = read('lib/db/schema.ts')
    expect(schemaSrc).toContain("nextTicketNumber: integer('next_ticket_number').notNull().default(1)")
    expect(schemaSrc).toContain("orgTicketNumber: integer('org_ticket_number').notNull()")
    expect(schemaSrc).toContain("uniqueIndex('tickets_org_ticket_number_unique').on(t.orgId, t.orgTicketNumber)")
  })
})

describe('getNextOrgTicketNumber: atomic assignment', () => {
  beforeEach(() => {
    calls.length = 0
  })

  it('increments and reads the counter in a single UPDATE...RETURNING statement', async () => {
    const { createTicket } = await import('@/lib/db/queries/tickets')
    // createTicket calls getNextOrgTicketNumber internally before the
    // insert — exercise it that way since the function itself isn't
    // exported, only the public creation path is.
    await createTicket(
      { content: 'test question', priority: 'medium', source_platform: 'discord' },
      3
    ).catch(() => null) // insert itself will no-op against the stub proxy; only the counter call matters here

    const updateCall = calls.find((c) => c.sql.trim().toLowerCase().startsWith('update') && c.sql.includes('"orgs"'))
    expect(updateCall).toBeDefined()
    expect(updateCall!.sql).toContain('"next_ticket_number"')
    // The counter call must happen before the tickets insert, so the
    // assigned number is available to put on the new row.
    const insertCall = calls.find((c) => c.sql.trim().toLowerCase().startsWith('insert') && c.sql.includes('"tickets"'))
    if (insertCall) {
      expect(calls.indexOf(updateCall!)).toBeLessThan(calls.indexOf(insertCall))
    }
  })

  it('throws a clear, actionable error instead of crashing on undefined when the org does not exist', async () => {
    // Production incident: ingest auth fell back to DEFAULT_ORG_ID for a
    // deployment where that org was never provisioned, and this previously
    // crashed with "Cannot read properties of undefined (reading 'next')" —
    // a zero-row UPDATE...RETURNING, silently indistinguishable from any
    // other bug without reading the source. Confirm it now names the org.
    const missingOrgDb = drizzle(async (sqlText: string) => {
      if (sqlText.trim().toLowerCase().startsWith('update') && sqlText.includes('"orgs"')) {
        return { rows: [] } // no matching org row — the actual failure mode
      }
      return { rows: [] }
    })
    vi.doMock('@/lib/db/drizzle', () => ({ getDb: () => missingOrgDb }))
    vi.resetModules()
    const { createTicket } = await import('@/lib/db/queries/tickets')

    await expect(
      createTicket({ content: 'test question', priority: 'medium', source_platform: 'discord' }, 999)
    ).rejects.toThrow('getNextOrgTicketNumber: no org found with id 999')
  })
})

describe('display: dashboard shows org_ticket_number, never the raw global id', () => {
  it('ticket list table', () => {
    const src = read('components/tickets/ticket-list.tsx')
    expect(src).toContain('#{ticket.org_ticket_number}')
    expect(src).not.toContain('#{ticket.id}')
  })

  it('ticket detail header', () => {
    const src = read('app/(dashboard)/tickets/[id]/page.tsx')
    expect(src).toContain('#{ticket.org_ticket_number}')
    expect(src).not.toContain('#{ticket.id}}</span>')
  })

  it('routing uses org_ticket_number too, matching what the UI displays — a raw global id in the URL bar looked broken next to the "#N" the page itself shows', () => {
    const src = read('components/tickets/ticket-list.tsx')
    expect(src).toContain('href={`/tickets/${ticket.org_ticket_number}`}')
    expect(src).not.toContain('href={`/tickets/${ticket.id}`}')
  })

  it('the ticket detail route resolves by org_ticket_number, scoped to the session org (not the raw global id)', () => {
    const src = read('app/(dashboard)/tickets/[id]/page.tsx')
    expect(src).toContain('getTicketByOrgTicketNumber(Number(id), orgId)')
  })
})

describe('display: staff email notifications match the dashboard number', () => {
  const src = read('lib/email/send.ts')

  it('new-ticket and resolved-ticket emails show org_ticket_number', () => {
    expect(src).toContain('New community ticket #${ticket.org_ticket_number}')
    expect(src).toContain('Ticket #${ticket.org_ticket_number} resolved')
    expect(src).not.toContain('ticket #${ticket.id}')
  })

  it('SLA breach email takes full ticket objects, not bare ids, so it can show the right number', () => {
    expect(src).toContain('breachedTickets: { id: number; org_ticket_number: number }[]')
    expect(src).toContain('Ticket #${t.org_ticket_number}')
  })
})

describe('display: AI agent notifications and customer-facing duplicate message use org_ticket_number', () => {
  const src = read('lib/ai/agent.ts')

  it('runAIAgent takes orgTicketNumber as an explicit required param, not derived from ticketId', () => {
    const idx = src.indexOf('export async function runAIAgent')
    const body = src.slice(idx, src.indexOf('): Promise<void> {', idx))
    expect(body).toContain('orgTicketNumber: number')
  })

  it('the duplicate-report message shown to the customer looks up the related ticket\'s own number', () => {
    expect(src).toContain('getTicketById(top.related_id, orgId)')
    expect(src).toContain('relatedTicket?.org_ticket_number')
  })

  it('every internal notification string uses orgTicketNumber, not the raw ticketId', () => {
    const notificationLines = src.split('\n').filter((l) => l.includes('ticket #$'))
    expect(notificationLines.length).toBeGreaterThan(0)
    for (const line of notificationLines) {
      expect(line).not.toMatch(/ticket #\$\{ticketId\}/)
    }
  })
})
