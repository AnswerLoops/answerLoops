import Link from 'next/link'
import type { Ticket } from '@/types'
import { PriorityBadge } from '@/components/ui/badge'
import { parseAttachmentLines } from '@/lib/slack/attachment-lines'

function rowSummary(ticket: Ticket): string {
  const { text, attachments } = parseAttachmentLines(ticket.content)
  return text.slice(0, 80) || `Shared ${attachments.length} attachment${attachments.length === 1 ? '' : 's'}`
}

export function SLABreachList({ tickets }: { tickets: Ticket[] }) {
  if (tickets.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-500">
        No SLA breaches — you&apos;re all caught up!
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-red-200">
      <div className="px-4 py-3 border-b border-red-200 bg-red-50 rounded-t-lg">
        <h3 className="text-sm font-semibold text-red-800">SLA Breaches ({tickets.length})</h3>
      </div>
      <ul className="divide-y divide-gray-100">
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            <Link href={`/tickets/${ticket.org_ticket_number}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              <PriorityBadge priority={ticket.priority} />
              <span className="flex-1 text-sm text-gray-800 truncate">
                {ticket.ai_summary ?? rowSummary(ticket)}
              </span>
              <span className="text-xs text-gray-400 shrink-0">
                {ticket.source_author_name ?? 'Unknown'}
              </span>
              <span className="text-xs font-medium text-red-600 shrink-0">Breached</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
