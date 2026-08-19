import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { removeRepo } from '@/lib/db/queries/github'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = session.orgId ?? DEFAULT_ORG_ID

  const { id } = await ctx.params
  await removeRepo(Number(id), orgId)
  return Response.json({ ok: true })
}
