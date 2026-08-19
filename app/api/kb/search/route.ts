import { auth } from '@/auth'
import { embedText } from '@/lib/ai/embed'
import { searchArticles, textSearchArticles } from '@/lib/db/queries/kb'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await auth()
  const orgId = session?.orgId ?? DEFAULT_ORG_ID

  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim()
  if (!q) return Response.json([])

  try {
    const vector = await embedText(q, orgId)
    return Response.json({ results: await searchArticles(vector, 10, orgId), degraded: false })
  } catch (err) {
    logger.warn('vector search unavailable, falling back to text search', { module: 'api/kb/search', error: err })
    try {
      const results = await textSearchArticles(q, 10, orgId)
      return Response.json({ results, degraded: true })
    } catch (textErr) {
      logger.error('text search also failed', { module: 'api/kb/search', error: textErr })
      return Response.json({ error: 'Search failed' }, { status: 500 })
    }
  }
}
