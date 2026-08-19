import { eq, and, desc, sql, inArray } from 'drizzle-orm'
import { getDb } from '../drizzle'
import { kbSources, kbArticles } from '../schema'
import type { KBSource } from '@/types'

function toSource(row: typeof kbSources.$inferSelect): KBSource {
  return {
    id: row.id,
    org_id: row.orgId,
    filename: row.filename,
    file_type: row.fileType,
    size_bytes: row.sizeBytes,
    chunk_count: row.chunkCount,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }
}

export async function createKBSource(input: {
  orgId: number
  filename: string
  fileType: string
  sizeBytes: number
}): Promise<KBSource> {
  const [row] = await getDb()
    .insert(kbSources)
    .values({
      orgId: input.orgId,
      filename: input.filename,
      fileType: input.fileType,
      sizeBytes: input.sizeBytes,
      chunkCount: 0,
    })
    .returning()
  return toSource(row)
}

export async function updateKBSourceChunkCount(id: number, chunkCount: number): Promise<void> {
  await getDb()
    .update(kbSources)
    .set({ chunkCount, updatedAt: new Date().toISOString() })
    .where(eq(kbSources.id, id))
}

export async function getKBSourceByFilename(orgId: number, filename: string): Promise<KBSource | null> {
  const [row] = await getDb()
    .select()
    .from(kbSources)
    .where(and(eq(kbSources.orgId, orgId), eq(kbSources.filename, filename)))
    .limit(1)
  return row ? toSource(row) : null
}

/**
 * Which of `filenames` already exist as sources for this org, as a Set for
 * O(1) membership checks.
 *
 * Batched deliberately: site imports now discover far more URLs than they
 * scrape in one run, so the dedup pass grew from ~25 candidates to several
 * hundred. Calling getKBSourceByFilename in a loop over that list would mean
 * one round trip per discovered page — slowest on exactly the large sites
 * this discovery limit exists to serve.
 *
 * Returns an empty Set for an empty input rather than issuing a query with an
 * empty IN list, which Postgres accepts but which is pure waste.
 */
export async function getExistingSourceFilenames(
  orgId: number,
  filenames: string[]
): Promise<Set<string>> {
  if (filenames.length === 0) return new Set()

  const rows = await getDb()
    .select({ filename: kbSources.filename })
    .from(kbSources)
    .where(and(eq(kbSources.orgId, orgId), inArray(kbSources.filename, filenames)))

  return new Set(rows.map((r) => r.filename))
}

export async function getOrCreateKBSource(input: {
  orgId: number
  filename: string
  fileType: string
}): Promise<KBSource> {
  const existing = await getKBSourceByFilename(input.orgId, input.filename)
  if (existing) return existing
  return createKBSource({ ...input, sizeBytes: 0 })
}

export async function listKBSources(orgId: number): Promise<KBSource[]> {
  const rows = await getDb()
    .select()
    .from(kbSources)
    .where(eq(kbSources.orgId, orgId))
    .orderBy(desc(kbSources.createdAt))
  return rows.map(toSource)
}

export async function deleteKBSource(id: number, orgId: number): Promise<void> {
  // Articles with source_id FK ON DELETE CASCADE are removed automatically
  await getDb()
    .delete(kbSources)
    .where(and(eq(kbSources.id, id), eq(kbSources.orgId, orgId)))
}
