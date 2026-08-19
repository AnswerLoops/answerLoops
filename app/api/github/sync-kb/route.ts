import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'
import { getRepoById } from '@/lib/db/queries/github'
import { syncRepoToKB, syncDiscussionsToKB } from '@/lib/github/kb-sync'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = (session as { orgId?: number }).orgId ?? DEFAULT_ORG_ID

  const repoId = Number(req.nextUrl.searchParams.get('repo_id'))
  if (!repoId) return NextResponse.json({ error: 'Missing repo_id' }, { status: 400 })

  const repo = await getRepoById(repoId, orgId)
  if (!repo) return NextResponse.json({ error: 'Repo not found' }, { status: 404 })

  // Sequential: both paths read-modify-write the repo's kbChunkCount, so
  // running them concurrently would race and drop one side's count.
  const docsSynced = await syncRepoToKB(repo.id, repo.owner, repo.repo, repo.installation_id, orgId)
  const discussionsSynced = await syncDiscussionsToKB(repo.id, repo.owner, repo.repo, repo.installation_id, orgId)
  return NextResponse.json({ synced: docsSynced + discussionsSynced, docsSynced, discussionsSynced })
}
