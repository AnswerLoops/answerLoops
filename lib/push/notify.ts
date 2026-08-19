import webpush from 'web-push'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db/drizzle'
import { pushSubscriptions } from '@/lib/db/schema'
import { MOCK_EXTERNALS } from '@/lib/mock-mode'

function initWebPush() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL ?? 'mailto:admin@example.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
  }
}

interface PushPayload {
  title: string
  body: string
  url?: string
}

export async function sendPushToAll(payload: PushPayload, orgId: number): Promise<void> {
  if (MOCK_EXTERNALS) return
  if (!process.env.VAPID_PUBLIC_KEY) return

  initWebPush()

  const db = getDb()
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.orgId, orgId))

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  )

  // Remove expired subscriptions (410 Gone)
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'rejected') {
      const err = result.reason as { statusCode?: number }
      if (err?.statusCode === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, subs[i].endpoint))
      }
    }
  }
}
