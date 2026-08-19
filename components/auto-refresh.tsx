'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Periodically re-fetches the current route's Server Components so DB-backed
 * pages (dashboard, tickets, notification count) reflect tickets ingested by
 * the Discord bot without a manual refresh. router.refresh() preserves scroll
 * position and client state. Polling pauses while the tab is hidden.
 */
export function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined

    function start() {
      stop()
      timer = setInterval(() => router.refresh(), intervalMs)
    }

    function stop() {
      if (timer) clearInterval(timer)
      timer = undefined
    }

    function onVisibility() {
      if (document.hidden) {
        stop()
      } else {
        router.refresh() // catch up immediately on return
        start()
      }
    }

    start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [router, intervalMs])

  return null
}
