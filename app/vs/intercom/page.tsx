import type { Metadata } from 'next'
import { ComparisonPage } from '@/components/marketing/comparison-page'

export const metadata: Metadata = {
  title: 'AnswerLoops vs Intercom — AI support platform comparison',
  description: 'How AnswerLoops compares to Intercom for community-native support: AI-first confidence-gated auto-answer vs. a human-first helpdesk with AI added on top, self-hosting, and open source.',
  alternates: { canonical: '/vs/intercom' },
}

const ROWS = [
  { feature: 'Design center', us: 'AI-first — confidence-gated auto-answer is the core pipeline, not an add-on', them: 'Human-first helpdesk with an AI layer (Fin) added on top' },
  { feature: 'Community channels', us: 'Discord, Slack, Discourse, Circle, GitHub Issues/Discussions, Telegram, email, website widget', them: 'Primarily email/chat/help center; no native Discord or GitHub ingest' },
  { feature: 'Self-hosting', us: 'AGPL-3.0, docker compose up, full control of your data', them: 'Hosted SaaS only' },
  { feature: 'Bring your own LLM', us: 'OpenAI, Anthropic, Google, Groq, Mistral, or any OpenAI-compatible endpoint', them: 'Intercom-hosted AI (Fin)' },
  { feature: 'Pricing model', us: 'Deflection-volume tiers; self-host is free forever', them: 'Per-seat pricing plus AI resolution add-on fees' },
  { feature: 'Agent-first API access', us: 'MCP server for direct agent tool use (Claude Code, Cursor, custom bots)', them: 'REST API, primarily built for app integrations' },
  { feature: 'Best known for', us: 'Teams whose support lives in a community (Discord, Slack, forums), not a traditional helpdesk', them: 'Enterprise customer support teams with a dedicated support org' },
]

export default function VsIntercomPage() {
  return (
    <ComparisonPage
      competitor="Intercom"
      competitorSummary="a widely-used customer support platform — a human-first helpdesk (inbox, help center, ticketing) with an AI agent (Fin) layered on top."
      intro="Intercom is a mature, enterprise-grade helpdesk built for support teams who work primarily in email and a shared inbox. AnswerLoops is built for teams whose support lives in a community — Discord, Slack, a forum — where the AI answer, not a human inbox, is the default first response."
      rows={ROWS}
      bestFor={{
        us: 'your community lives in Discord, Slack, a forum, or GitHub, you want AI auto-answer to be the primary response path rather than an add-on, or you need to self-host and control your own AI provider and cost.',
        them: 'you run a large enterprise support org with a dedicated team working a shared email/chat inbox and need the full breadth of Intercom\'s helpdesk tooling (seats, workflows, reporting) beyond community-style ingest.',
      }}
      faq={[
        {
          question: 'Is there an open-source alternative to Intercom Fin?',
          answer:
            'Yes. AnswerLoops is licensed under AGPL-3.0 and can be self-hosted with docker compose, so you run the full support pipeline on your own infrastructure with no per-resolution fee. Intercom Fin is hosted SaaS only and charges per AI resolution.',
        },
        {
          question: 'Does AnswerLoops work with Discord and GitHub like Intercom does with email?',
          answer:
            'AnswerLoops treats Discord, Slack, Discourse and Circle forums, GitHub Issues and Discussions, Telegram, email, and a website widget as first-class sources in one pipeline. Intercom is centered on email, chat, and its help center and has no native Discord or GitHub ingest.',
        },
        {
          question: 'Can I use my own LLM instead of a vendor-hosted model?',
          answer:
            'Yes. Each workspace configures its own key for OpenAI, Anthropic, Google Gemini, Groq, Mistral, or any OpenAI-compatible endpoint, including local models via Ollama. Intercom Fin runs on Intercom-hosted models only.',
        },
        {
          question: 'When is Intercom still the better choice?',
          answer:
            'If you run a large enterprise support org with a dedicated team working a shared email inbox and need the full breadth of Intercom\'s helpdesk tooling — seats, workflows, advanced reporting — beyond community-style ingest, Intercom is the more complete helpdesk.',
        },
      ]}
    />
  )
}
