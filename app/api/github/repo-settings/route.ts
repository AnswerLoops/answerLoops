import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'
import { updateRepoSettings } from '@/lib/db/queries/github'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = (session as { orgId?: number }).orgId ?? DEFAULT_ORG_ID

  const body = await req.json() as { repoId?: number; monitoredEvents?: string; kbEnabled?: number; autoDeflectEnabled?: number }
  if (!body.repoId) return NextResponse.json({ error: 'Missing repoId' }, { status: 400 })

  const validEvents = ['issues', 'discussions', 'both', 'none']
  if (body.monitoredEvents && !validEvents.includes(body.monitoredEvents)) {
    return NextResponse.json({ error: 'Invalid monitoredEvents' }, { status: 400 })
  }

  await updateRepoSettings(body.repoId, orgId, {
    ...(body.monitoredEvents !== undefined && { monitoredEvents: body.monitoredEvents }),
    ...(body.kbEnabled !== undefined && { kbEnabled: body.kbEnabled }),
    ...(body.autoDeflectEnabled !== undefined && { autoDeflectEnabled: body.autoDeflectEnabled }),
  })

  return NextResponse.json({ ok: true })
}
