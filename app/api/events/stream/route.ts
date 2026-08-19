import { auth } from '@/auth'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'
import { getDirectDatabaseUrl } from '@/lib/db/direct-url'
import postgres from 'postgres'

export const dynamic = 'force-dynamic'

// Railway / Vercel kill connections after 60s — client reconnects automatically.
const KEEPALIVE_MS = 25_000

export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const orgId = (session as { orgId?: number }).orgId ?? DEFAULT_ORG_ID

  const url = getDirectDatabaseUrl()
  if (!url) return new Response('DATABASE_URL not set', { status: 503 })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: string) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`))
        } catch {
          // client disconnected
        }
      }

      // Dedicated single connection required for LISTEN (same pattern as bot)
      const listener = postgres(url, { max: 1 })

      const keepalive = setInterval(() => send('ping', '{}'), KEEPALIVE_MS)

      const cleanup = () => {
        clearInterval(keepalive)
        listener.end().catch(() => null)
      }

      try {
        await listener.listen('member_joined', (payload) => {
          console.log(`[sse] member_joined payload=${payload} orgId=${orgId}`)
          if (Number(payload) === orgId) {
            send('member_joined', JSON.stringify({ orgId }))
          }
        })
        console.log(`[sse] listening for org ${orgId}`)
        send('connected', '{}')
      } catch (err) {
        console.error('[sse] listen failed', err)
        cleanup()
        controller.close()
        return
      }

      // Hold open until client disconnects
      return () => cleanup()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disable nginx/Railway proxy buffering so events reach the client immediately
      'X-Accel-Buffering': 'no',
    },
  })
}
