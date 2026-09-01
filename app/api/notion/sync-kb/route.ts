import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'
import { syncNotionToKB } from '@/lib/notion/kb-sync'
import { logger } from '@/lib/logger'

const MOD = 'api/notion/sync-kb'

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = (session as { orgId?: number }).orgId ?? DEFAULT_ORG_ID

  try {
    const { synced, truncated } = await syncNotionToKB(orgId)
    return NextResponse.json({ synced, truncated })
  } catch (err) {
    logger.error('notion kb sync failed', { module: MOD, orgId, error: err })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
