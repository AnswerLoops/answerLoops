import { Agent } from '@mastra/core/agent'
import type { MastraModelConfig } from '@mastra/core/llm'
import { chatModel, DEFAULT_CHAT_MODEL } from '@/lib/ai/models'

interface TicketSummary {
  id: number
  content: string
  category: string | null
  ai_summary: string | null
  resolution_notes: string | null
}

function groupByCategory(tickets: TicketSummary[]) {
  const groups: Record<string, TicketSummary[]> = {}
  for (const t of tickets) {
    const key = t.category ?? 'general_question'
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  }
  return groups
}

function formatForPrompt(tickets: TicketSummary[]): string {
  const groups = groupByCategory(tickets)
  return Object.entries(groups)
    .map(([category, items]) => {
      const label = category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      const lines = items.map((t, i) =>
        `  ${i + 1}. Q: ${t.ai_summary ?? t.content.slice(0, 120)}\n     Resolution: ${t.resolution_notes ?? 'resolved by team'}`
      )
      return `## ${label}\n${lines.join('\n')}`
    })
    .join('\n\n')
}

export async function generateFAQ(tickets: TicketSummary[], orgId?: number): Promise<string> {
  if (tickets.length === 0) {
    return '# FAQ\n\nNo resolved tickets this week.'
  }

  const context = formatForPrompt(tickets)

  // Agent instantiated per-call — see lib/ai/agent.ts for why (model is
  // resolved per-org, so no single instance is valid across orgs).
  const faqAgent = new Agent({
    id: 'faq-generator-agent',
    name: 'faq-generator-agent',
    instructions: 'You are a technical writer creating a community FAQ from resolved support tickets.',
    model: (await chatModel(DEFAULT_CHAT_MODEL, orgId)) as MastraModelConfig,
  })

  const { text } = await faqAgent.generate(
    `Below are resolved tickets from this week, grouped by category. Write a clean, structured FAQ with:
- A markdown header for each category
- Clear, concise Q&A pairs
- Actionable answers that help future users self-serve
- No ticket numbers or internal references

Resolved tickets this week:
${context}`,
    { modelSettings: { maxOutputTokens: 3000 } }
  )

  return text
}
