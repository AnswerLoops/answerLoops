import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'
import { deleteArticle } from '@/lib/db/queries/kb'

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = session.orgId ?? DEFAULT_ORG_ID
  const { id } = await ctx.params
  const articleId = Number(id)
  if (!Number.isInteger(articleId)) return Response.json({ error: 'Invalid ID' }, { status: 400 })
  await deleteArticle(articleId, orgId)
  return new Response(null, { status: 204 })
}
