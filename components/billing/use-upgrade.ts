'use client'

import { useState, useTransition } from 'react'

/** Shared checkout-redirect flow — used by the billing page's plan cards and every locked-feature upgrade CTA. */
export function useUpgrade() {
  const [pending, startUpgrade] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function upgrade(planId: string) {
    startUpgrade(async () => {
      setError(null)
      const r = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const { url, error: err } = await r.json() as { url?: string; error?: string }
      if (err) { setError(err); return }
      if (url) window.location.href = url
    })
  }

  return { upgrade, pending, error }
}
