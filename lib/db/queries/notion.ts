import { eq } from 'drizzle-orm'
import { getDb } from '../drizzle'
import { notionConnections } from '../schema'
import type { NotionConnection } from '@/types'

/** Public projection — never includes the access token. */
function toConnection(row: typeof notionConnections.$inferSelect): NotionConnection {
  return {
    id: row.id,
    org_id: row.orgId,
    workspace_name: row.workspaceName ?? null,
    kb_source_id: row.kbSourceId ?? null,
    kb_last_synced: row.kbLastSynced ?? null,
    kb_chunk_count: row.kbChunkCount,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }
}

/**
 * The raw row, including the still-encrypted `access_token`. Callers that
 * return data to the client must map through `getNotionConnection` /
 * `toConnection` instead (or strip the token themselves).
 */
export async function getNotionConnectionRow(
  orgId: number
): Promise<typeof notionConnections.$inferSelect | null> {
  const [row] = await getDb()
    .select()
    .from(notionConnections)
    .where(eq(notionConnections.orgId, orgId))
    .limit(1)
  return row ?? null
}

export async function getNotionConnection(orgId: number): Promise<NotionConnection | null> {
  const row = await getNotionConnectionRow(orgId)
  return row ? toConnection(row) : null
}

/** Upsert on org_id. `accessToken` must already be encrypted by the caller. */
export async function saveNotionConnection(input: {
  orgId: number
  accessToken: string
  workspaceName: string | null
}): Promise<NotionConnection> {
  const db = getDb()
  const ts = new Date().toISOString()
  const existing = await getNotionConnectionRow(input.orgId)

  if (existing) {
    const [row] = await db
      .update(notionConnections)
      .set({
        accessToken: input.accessToken,
        workspaceName: input.workspaceName,
        updatedAt: ts,
      })
      .where(eq(notionConnections.orgId, input.orgId))
      .returning()
    return toConnection(row)
  }

  const [row] = await db
    .insert(notionConnections)
    .values({
      orgId: input.orgId,
      accessToken: input.accessToken,
      workspaceName: input.workspaceName,
    })
    .returning()
  return toConnection(row)
}

export async function deleteNotionConnection(orgId: number): Promise<void> {
  await getDb().delete(notionConnections).where(eq(notionConnections.orgId, orgId))
}

export async function updateNotionKbState(
  orgId: number,
  state: { kbLastSynced?: string; kbChunkCount?: number; kbSourceId?: number | null }
): Promise<void> {
  await getDb()
    .update(notionConnections)
    .set({
      ...(state.kbLastSynced !== undefined && { kbLastSynced: state.kbLastSynced }),
      ...(state.kbChunkCount !== undefined && { kbChunkCount: state.kbChunkCount }),
      ...(state.kbSourceId !== undefined && { kbSourceId: state.kbSourceId }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(notionConnections.orgId, orgId))
}
