import { eq, desc, gt, sql } from 'drizzle-orm'
import { getDb } from '../drizzle'
import { faqSnapshots, tickets } from '../schema'
import type { FAQSnapshot } from '@/types'

function toFAQ(row: typeof faqSnapshots.$inferSelect): FAQSnapshot {
  return {
    id: row.id,
    week_start: row.weekStart,
    week_end: row.weekEnd,
    content: row.content,
    ticket_count: row.ticketCount,
    generated_at: row.generatedAt,
  }
}

export async function getLatestFAQ(orgId: number): Promise<FAQSnapshot | null> {
  const [row] = await getDb()
    .select()
    .from(faqSnapshots)
    .where(eq(faqSnapshots.orgId, orgId))
    .orderBy(desc(faqSnapshots.generatedAt))
    .limit(1)
  return row ? toFAQ(row) : null
}

export async function insertFAQSnapshot(
  weekStart: string,
  weekEnd: string,
  content: string,
  ticketCount: number,
  orgId: number
): Promise<FAQSnapshot> {
  const [row] = await getDb()
    .insert(faqSnapshots)
    .values({ orgId, weekStart, weekEnd, content, ticketCount })
    .returning()
  return toFAQ(row)
}

export async function getResolvedTicketsThisWeek(orgId: number): Promise<Array<{
  id: number
  content: string
  category: string | null
  ai_summary: string | null
  resolution_notes: string | null
}>> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const rows = await getDb()
    .select({
      id: tickets.id,
      content: tickets.content,
      category: tickets.category,
      ai_summary: tickets.aiSummary,
      resolution_notes: tickets.resolutionNotes,
    })
    .from(tickets)
    .where(
      sql`${tickets.status} IN ('resolved', 'closed') AND ${tickets.resolvedAt} > ${weekAgo} AND ${tickets.orgId} = ${orgId}`
    )
  return rows
}
