import { eq, asc } from 'drizzle-orm'
import { getDb } from '../drizzle'
import { slaConfigs } from '../schema'
import type { SLAConfig, Priority } from '@/types'

function toSLAConfig(row: typeof slaConfigs.$inferSelect): SLAConfig {
  return {
    id: row.id,
    priority: row.priority as Priority,
    response_hours: row.responseHours,
    resolve_hours: row.resolveHours,
    updated_at: row.updatedAt,
  }
}

export async function getSLAConfig(priority: Priority): Promise<SLAConfig | null> {
  const [row] = await getDb()
    .select()
    .from(slaConfigs)
    .where(eq(slaConfigs.priority, priority))
    .limit(1)
  return row ? toSLAConfig(row) : null
}

export async function updateSLAConfig(priority: Priority, responseHours: number, resolveHours: number): Promise<void> {
  await getDb()
    .update(slaConfigs)
    .set({ responseHours, resolveHours, updatedAt: new Date().toISOString() })
    .where(eq(slaConfigs.priority, priority))
}
