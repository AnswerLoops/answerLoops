'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function DeleteTicketButton({ ticketId }: { ticketId: number }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleDelete() {
    setPending(true)
    await fetch(`/api/tickets/${ticketId}`, { method: 'DELETE' })
    router.push('/tickets')
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600">Delete this ticket?</span>
        <Button size="sm" variant="danger" onClick={handleDelete} disabled={pending}>
          {pending ? 'Deleting…' : 'Yes, delete'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
      Delete
    </Button>
  )
}
