import type { Metadata } from 'next'
import { auth } from '@/auth'
import { ComparisonPage } from '@/components/marketing/comparison-page'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AnswerLoops vs Intercom — AI support platform comparison',
  description: 'How AnswerLoops compares to Intercom for developer community support: AI-first confidence-gated auto-answer vs. a human-first helpdesk with AI added on top, self-hosting, and open source.',
}

const ROWS = [
  { feature: 'Design center', us: 'AI-first — confidence-gated auto-answer is the core pipeline, not an add-on', them: 'Human-first helpdesk with an AI layer (Fin) added on top' },
  { feature: 'Community channels', us: 'Discord, Slack, GitHub Issues/Discussions, Telegram, email, website widget', them: 'Primarily email/chat/help center; no native Discord or GitHub ingest' },
  { feature: 'Self-hosting', us: 'AGPL-3.0, docker compose up, full control of your data', them: 'Hosted SaaS only' },
  { feature: 'Bring your own LLM', us: 'OpenAI, Anthropic, Google, Groq, Mistral, or any OpenAI-compatible endpoint', them: 'Intercom-hosted AI (Fin)' },
  { feature: 'Pricing model', us: 'Deflection-volume tiers; self-host is free forever', them: 'Per-seat pricing plus AI resolution add-on fees' },
  { feature: 'Agent-first API access', us: 'MCP server for direct agent tool use (Claude Code, Cursor, custom bots)', them: 'REST API, primarily built for app integrations' },
  { feature: 'Best known for', us: 'Developer communities that live in Discord/GitHub, not a traditional helpdesk', them: 'Enterprise customer support teams with a dedicated support org' },
]

export default async function VsIntercomPage() {
  const session = await auth()
  return (
    <ComparisonPage
      loggedIn={!!session?.user}
      competitor="Intercom"
      competitorSummary="a widely-used customer support platform — a human-first helpdesk (inbox, help center, ticketing) with an AI agent (Fin) layered on top."
      intro="Intercom is a mature, enterprise-grade helpdesk built for support teams who work primarily in email and a shared inbox. AnswerLoops is built for developer communities that live in Discord and GitHub, where the AI answer — not a human inbox — is the default first response."
      rows={ROWS}
      bestFor={{
        us: 'your community lives in Discord, Slack, or GitHub, you want AI auto-answer to be the primary response path rather than an add-on, or you need to self-host and control your own AI provider and cost.',
        them: 'you run a large enterprise support org with a dedicated team working a shared email/chat inbox and need the full breadth of Intercom\'s helpdesk tooling (seats, workflows, reporting) beyond community-style ingest.',
      }}
    />
  )
}
