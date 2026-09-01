import { chunkMarkdown } from '@/lib/ingest/url'
import { embedText, EMBEDDING_MODEL } from '@/lib/ai/embed'
import { MOCK_EXTERNALS } from '@/lib/mock-mode'
import { logger } from '@/lib/logger'
import { decryptToken } from '@/lib/crypto/tokens'
import { getNotionConnectionRow, updateNotionKbState } from '@/lib/db/queries/notion'
import {
  createKBSource,
  getKBSourceByFilename,
  deleteKBSource,
  updateKBSourceChunkCount,
  setKBSourcePublished,
} from '@/lib/db/queries/kb-sources'
import { createArticleFromSource, countArticles } from '@/lib/db/queries/kb'
import {
  notionSearchAll,
  notionBlockChildren,
  queryDatabaseRows,
  getNotionPageTitle,
} from '@/lib/notion/client'
import { blocksToMarkdown } from '@/lib/notion/blocks-to-markdown'

const MOD = 'notion/kb-sync'
const MAX_ARTICLES_PER_ORG = 2000

/** The stable dedup key for the single per-workspace kb_sources row. */
export const NOTION_SOURCE_FILENAME = 'notion:workspace'

export interface NotionSyncResult {
  synced: number
  truncated: boolean
}

/**
 * Pull every page and database the connected Notion integration can see into
 * the KB. Delete-and-recreate, exactly like `syncRepoToKB`: one kb_sources row
 * for the whole workspace, wiped and rebuilt on each manual sync. Chunks land
 * `published: 0` — Notion is the one source that imports hidden until the
 * customer publishes it — but a prior publish choice is restored afterwards.
 */
export async function syncNotionToKB(orgId: number): Promise<NotionSyncResult> {
  const conn = await getNotionConnectionRow(orgId)
  if (!conn) throw new Error('Notion is not connected')

  // Preserve the customer's publish choice across the delete-and-recreate.
  const existing = await getKBSourceByFilename(orgId, NOTION_SOURCE_FILENAME)
  const wasPublished = existing?.published === 1
  if (existing) await deleteKBSource(existing.id, orgId)

  const budget = Math.max(0, MAX_ARTICLES_PER_ORG - (await countArticles(orgId)))
  if (budget === 0) {
    logger.warn('kb full — skipping notion sync', { module: MOD, orgId })
    await updateNotionKbState(orgId, { kbLastSynced: new Date().toISOString(), kbChunkCount: 0, kbSourceId: null })
    return { synced: 0, truncated: true }
  }

  const source = await createKBSource({
    orgId,
    filename: NOTION_SOURCE_FILENAME,
    fileType: 'notion',
    sizeBytes: 0,
    published: 0,
  })

  let created = 0

  const writeChunks = async (markdown: string, title: string): Promise<void> => {
    if (!markdown.trim()) return
    for (const chunk of chunkMarkdown(markdown, title)) {
      if (created >= budget) break
      try {
        const embedding = await embedText(`${chunk.question}\n\n${chunk.answer}`, orgId)
        await createArticleFromSource(
          {
            question: chunk.question,
            answer: chunk.answer,
            embedding,
            model: EMBEDDING_MODEL,
            sourceId: source.id,
            published: 0,
          },
          orgId
        )
        created++
      } catch (err) {
        logger.warn('notion chunk embed failed', { module: MOD, orgId, title, error: err })
      }
    }
  }

  if (MOCK_EXTERNALS) {
    await writeChunks('# Mock Notion Page\n\nThis is a mock Notion page body used in tests and local mock mode.', 'Mock Notion Page')
  } else {
    const token = decryptToken(conn.accessToken)
    if (!token) throw new Error('Notion token could not be decrypted — reconnect the workspace')

    const { pages, databases } = await notionSearchAll(token)

    // Build a de-duped work list: standalone pages + every row of every database.
    const seen = new Set<string>()
    const work: { id: string; title: string }[] = []
    for (const page of pages) {
      if (seen.has(page.id)) continue
      seen.add(page.id)
      work.push({ id: page.id, title: getNotionPageTitle(page) })
    }
    for (const db of databases) {
      try {
        for (const row of await queryDatabaseRows(token, db.id)) {
          if (seen.has(row.id)) continue
          seen.add(row.id)
          work.push({ id: row.id, title: getNotionPageTitle(row) })
        }
      } catch (err) {
        logger.warn('notion database query failed', { module: MOD, orgId, databaseId: db.id, error: err })
      }
    }

    for (const item of work) {
      if (created >= budget) break
      try {
        const blocks = await notionBlockChildren(token, item.id)
        const markdown = await blocksToMarkdown(blocks, (blockId) => notionBlockChildren(token, blockId))
        await writeChunks(markdown, item.title)
      } catch (err) {
        logger.warn('notion page fetch failed', { module: MOD, orgId, pageId: item.id, error: err })
      }
    }
  }

  await updateKBSourceChunkCount(source.id, created)
  await updateNotionKbState(orgId, {
    kbLastSynced: new Date().toISOString(),
    kbChunkCount: created,
    kbSourceId: source.id,
  })
  if (wasPublished) await setKBSourcePublished(source.id, orgId, 1)

  logger.info('notion kb sync done', { module: MOD, orgId, created })
  return { synced: created, truncated: created >= budget }
}
