import { eq } from 'drizzle-orm'
import { getDb } from '../drizzle'
import { aiAssessments } from '../schema'
import type { AIAssessment } from '@/types'

type Writer = Pick<ReturnType<typeof getDb>, 'insert'>

function toAssessment(row: typeof aiAssessments.$inferSelect): AIAssessment {
  return {
    ticket_id: row.ticketId,
    confidence: row.confidence,
    answered_fully: row.answeredFully as 0 | 1,
    auto_deflected: row.autoDeflected as 0 | 1,
    reasoning: row.reasoning,
    model: row.model,
    created_at: row.createdAt,
  }
}

export async function saveAssessment(
  input: {
    ticketId: number
    confidence: number
    answeredFully: boolean
    autoDeflected: boolean
    reasoning: string
    model: string
  },
  db: Writer = getDb()
): Promise<void> {
  await db
    .insert(aiAssessments)
    .values({
      ticketId: input.ticketId,
      confidence: input.confidence,
      answeredFully: input.answeredFully ? 1 : 0,
      autoDeflected: input.autoDeflected ? 1 : 0,
      reasoning: input.reasoning,
      model: input.model,
    })
    .onConflictDoUpdate({
      target: aiAssessments.ticketId,
      set: {
        confidence: input.confidence,
        answeredFully: input.answeredFully ? 1 : 0,
        autoDeflected: input.autoDeflected ? 1 : 0,
        reasoning: input.reasoning,
        model: input.model,
      },
    })
}

export async function getAssessment(ticketId: number): Promise<AIAssessment | null> {
  const [row] = await getDb()
    .select()
    .from(aiAssessments)
    .where(eq(aiAssessments.ticketId, ticketId))
    .limit(1)
  return row ? toAssessment(row) : null
}
