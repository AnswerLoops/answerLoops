import { type NextRequest, NextResponse } from 'next/server'
import { addRepo } from '@/lib/db/queries/github'
import { listInstallationRepos } from '@/lib/github/app'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'
import { logger } from '@/lib/logger'

const MOD = 'api/github/callback'
const STATE_MAX_AGE_MS = 10 * 60 * 1000

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const installationId = Number(searchParams.get('installation_id'))
  const stateRaw = searchParams.get('state') ?? ''

  let orgId = DEFAULT_ORG_ID
  try {
    const decoded = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'))
    if (Date.now() - decoded.ts > STATE_MAX_AGE_MS) {
      return NextResponse.redirect(new URL('/settings?tab=github&github_error=expired', req.nextUrl))
    }
    orgId = Number(decoded.orgId) || DEFAULT_ORG_ID
  } catch {
    logger.warn('invalid github callback state', { module: MOD })
  }

  const baseUrl = process.env.AUTH_URL ?? req.nextUrl.origin

  if (!installationId) {
    return NextResponse.redirect(new URL('/settings?tab=github&github_error=missing_installation', baseUrl))
  }

  try {
    const repos = await listInstallationRepos(installationId)
    for (const { owner, repo, isPrivate } of repos) {
      await addRepo(installationId, owner, repo, isPrivate, orgId)
    }
    logger.info('github installation connected', { module: MOD, installationId, repoCount: repos.length, orgId })
  } catch (err) {
    const cause = err instanceof Error ? { message: err.message, cause: (err as NodeJS.ErrnoException).cause } : err
    logger.error('github installation failed', { module: MOD, error: cause })
    return NextResponse.redirect(new URL('/settings?tab=github&github_error=installation_failed', baseUrl))
  }

  return NextResponse.redirect(new URL('/settings?tab=github&github_connected=1', baseUrl))
}
