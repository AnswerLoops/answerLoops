'use client'

import { useEffect } from 'react'

export function PushSubscribe() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    async function subscribe() {
      try {
        const keyRes = await fetch('/api/push/vapid-key')
        const { publicKey } = await keyRes.json() as { publicKey: string }
        if (!publicKey) return

        const reg = await navigator.serviceWorker.register('/sw.js')
        const existing = await reg.pushManager.getSubscription()
        if (existing) return

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey,
        })

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        })
      } catch {
        // Push setup failure is non-critical — don't surface to user
      }
    }

    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') subscribe()
    })
  }, [])

  return null
}
