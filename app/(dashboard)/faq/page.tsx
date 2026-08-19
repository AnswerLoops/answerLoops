'use client'

import { useState } from 'react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import type { FAQSnapshot } from '@/types'

export default function FAQPage() {
  const [faq, setFaq] = useState<FAQSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch('/api/faq')
      .then((r) => r.json())
      .then((data) => {
        setFaq(data.content ? data : null)
        setLoading(false)
      })
  }, [])

  async function regenerate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/faq/generate', { method: 'POST' })
      if (res.ok) {
        const refreshed = await fetch('/api/faq').then((r) => r.json())
        setFaq(refreshed.content ? refreshed : null)
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="dashboard-page max-w-5xl space-y-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-blue-600">
            <span className="h-px w-6 bg-blue-500" />
            Published answers
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">FAQ</h1>
          {faq && (
            <p className="mt-1 text-sm text-slate-500">
              Generated {new Date(faq.generated_at).toLocaleDateString()} · {faq.ticket_count} tickets
            </p>
          )}
        </div>
        <Button onClick={regenerate} disabled={generating} variant="secondary" size="sm">
          {generating ? 'Generating…' : 'Regenerate FAQ'}
        </Button>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && !faq && (
        <div className="bg-white rounded-lg border border-gray-200 px-6 py-12 text-center">
          <p className="text-sm text-gray-500 mb-3">No FAQ generated yet.</p>
          <Button onClick={regenerate} disabled={generating} size="sm">
            {generating ? 'Generating…' : 'Generate from this week\'s tickets'}
          </Button>
        </div>
      )}

      {faq?.content && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 prose prose-sm max-w-none sm:p-8">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">{faq.content}</pre>
        </div>
      )}
    </div>
  )
}
