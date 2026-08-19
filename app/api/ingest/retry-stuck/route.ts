import { z } from 'zod'
import { claimStuckTicketForRetry } from '@/lib/db/queries/tickets'
import { runBackgroundEnrichment } from '@/lib/ingest/pipeline'
import { orgHasAIKey } from '@/lib/db/queries/ai-config'
import { reservePlatformKeyTrial } from '@/lib/billing/platform-key-trial'
import { getDeploymentMode } from '@/lib/billing/plans'
import { logger } from '@/lib/logger'
import type { ModelPurpose } from '@/lib/ai/models'

const MOD = 'api/ingest/retry-stuck'

const RetrySchema = z.object({
  ticket_id: z.number(),
  org_id: z.number(),
})

// Called only by the bot process's stuck-ticket sweep (bot/index.ts) — never
// by a webhook or a browser. Authenticated with the platform-wide BOT_SECRET
// rather than a per-integration secret, since a stuck ticket can belong to
// any platform and this is a cross-org maintenance job, not a single
// integration's traffic. See GitHub issue #222.
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!bearerSecret || !process.env.BOT_SECRET || bearerSecret !== process.env.BOT_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = RetrySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { ticket_id, org_id } = parsed.data

  // Atomic claim — if this returns null, either another process already
  // claimed it or the original after() job actually finished in the tiny
  // window since the sweep's discovery read. Either way, nothing to do.
  const ticket = await claimStuckTicketForRetry(ticket_id)
  if (!ticket) return Response.json({ ok: true, claimed: false })

  let aiPurpose: ModelPurpose = 'production'
  if (getDeploymentMode() !== 'self-hosted' && !(await orgHasAIKey(org_id))) {
    const grantedTrial = await reservePlatformKeyTrial(org_id)
    if (grantedTrial) aiPurpose = 'trial'
  }

  logger.warn('retrying stuck pending ticket', { module: MOD, ticketId: ticket_id, orgId: org_id })

  // Awaited directly, not scheduled via after() — this route only answers
  // the sweep's own request, there's no separate caller waiting on a fast
  // ack the way a real webhook delivery needs.
  await runBackgroundEnrichment(ticket, org_id, aiPurpose)

  return Response.json({ ok: true, claimed: true })
}
