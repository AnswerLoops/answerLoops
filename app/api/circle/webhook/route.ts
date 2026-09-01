import { NextRequest } from 'next/server'
import { getIntegrationByBotSecret, parseChannelIds } from '@/lib/db/queries/integrations'
import { normalizeCircleContent, fetchCirclePost, fetchCircleComment, type CircleContent } from '@/lib/circle/client'
import { processCommunityMessage } from '@/lib/ingest/pipeline'
import { decryptToken } from '@/lib/crypto/tokens'
import { logger } from '@/lib/logger'

const MOD = 'api/circle/webhook'

// Circle automation Workflow "send webhook" payloads are not contractual.
// We look for the trigger record under any of these keys, and the event kind
// under any of these.
interface CircleWebhookBody {
  event?: string
  type?: string
  trigger?: string
  post?: Record<string, unknown>
  comment?: Record<string, unknown>
  record?: Record<string, unknown>
  data?: Record<string, unknown>
}

function pickRecord(body: CircleWebhookBody): { raw: Record<string, unknown>; kind: 'post' | 'comment' } | null {
  const eventStr = `${body.event ?? ''} ${body.type ?? ''} ${body.trigger ?? ''}`.toLowerCase()
  if (body.comment) return { raw: body.comment, kind: 'comment' }
  if (body.post) return { raw: body.post, kind: 'post' }
  const generic = body.record ?? body.data
  if (generic) {
    const kind = eventStr.includes('comment') || 'post_id' in generic ? 'comment' : 'post'
    return { raw: generic, kind }
  }
  return null
}

export async function POST(req: NextRequest) {
  // 1. Resolve the org from the per-org secret (header, or ?token= fallback for
  //    Workflow actions that can't set custom headers).
  const secret = req.headers.get('x-answerloops-token') ?? req.nextUrl.searchParams.get('token') ?? ''
  if (!secret) {
    logger.warn('Circle webhook without token', { module: MOD })
    return new Response('Unauthorized', { status: 401 })
  }

  const integration = await getIntegrationByBotSecret(secret)
  if (!integration || integration.platform !== 'circle' || integration.enabled !== 1) {
    logger.warn('Circle webhook token did not match a connected org', { module: MOD })
    return new Response('Unauthorized', { status: 401 })
  }

  let body: CircleWebhookBody
  try {
    body = (await req.json()) as CircleWebhookBody
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const picked = pickRecord(body)
  if (!picked) {
    logger.info('Circle webhook with no recognizable record', { module: MOD, orgId: integration.org_id })
    return Response.json({ ok: true })
  }

  let content: CircleContent | null = normalizeCircleContent(picked.raw, picked.kind)
  if (!content || content.id === '') return Response.json({ ok: true })

  // 2. Enrich a thin payload from the Admin API when the body is missing.
  if (!content.body && integration.bot_token) {
    const token = decryptToken(integration.bot_token)
    if (token) {
      const full = picked.kind === 'comment'
        ? await fetchCircleComment(token, content.id)
        : await fetchCirclePost(token, content.id)
      if (full) content = normalizeCircleContent(full, picked.kind) ?? content
    }
  }

  // 3. Filters — all acknowledged with 200 so Circle does not retry.
  if (!content.body || content.body.length < 10) return Response.json({ ok: true })
  if (!content.authorId || content.authorId === '0') return Response.json({ ok: true })

  const watched = parseChannelIds(integration)
  if (watched.length > 0 && !watched.includes(content.spaceId)) return Response.json({ ok: true })

  const communityUrl = integration.team_id ? integration.team_id.replace(/\/+$/, '') : null
  const sourceUrl = content.url ?? (communityUrl ? `${communityUrl}/posts/${content.postId}` : null)

  logger.info('Circle content received', {
    module: MOD,
    orgId: integration.org_id,
    kind: picked.kind,
    id: content.id,
    spaceId: content.spaceId,
  })

  await processCommunityMessage(
    {
      messageId: `circle-${picked.kind}-${content.id}`,
      content: content.body,
      authorId: content.authorId,
      authorName: content.authorName,
      channelId: content.spaceId || content.postId,
      threadId: content.postId,
      platform: 'circle',
      sourceUrl: sourceUrl ?? undefined,
    },
    integration.org_id
  )

  return Response.json({ ok: true })
}
