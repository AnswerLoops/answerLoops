import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'
import { addRepo } from '@/lib/db/queries/github'
import { listInstallationRepos } from '@/lib/github/app'
import { logger } from '@/lib/logger'

const MOD = 'api/github/connect-installation'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = (session as { orgId?: number }).orgId ?? DEFAULT_ORG_ID

  const { installationId } = await req.json() as { installationId?: number }
  if (!installationId || isNaN(installationId)) {
    return NextResponse.json({ error: 'Invalid installation ID' }, { status: 400 })
  }

  try {
    const repos = await listInstallationRepos(installationId)
    for (const { owner, repo, isPrivate } of repos) {
      await addRepo(installationId, owner, repo, isPrivate, orgId)
    }
    logger.info('github installation connected manually', { module: MOD, installationId, repoCount: repos.length })
    return NextResponse.json({ connected: repos.length })
  } catch (err) {
    logger.error('manual installation connect failed', { module: MOD, error: err })
    return NextResponse.json({ error: 'Could not connect installation — check GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY' }, { status: 500 })
  }
}
