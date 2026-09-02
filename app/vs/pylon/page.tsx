import type { Metadata } from 'next'
import { ComparisonPage } from '@/components/marketing/comparison-page'

export const metadata: Metadata = {
  title: 'AnswerLoops vs Pylon — open-source alternative for community support',
  description:
    'How AnswerLoops compares to Pylon: public community channels (Discord, forums, GitHub) alongside shared Slack, AI-first confidence-gated auto-answer, self-hosting under AGPL-3.0, and bring-your-own-LLM.',
  alternates: { canonical: '/vs/pylon' },
}

const ROWS = [
  { feature: 'Primary surface', us: 'Public and private community channels — Discord, Slack, Discourse and Circle forums, GitHub, Telegram, email, and a website widget', them: 'B2B customer support in shared Slack and Microsoft Teams channels, plus email' },
  { feature: 'Design center', us: 'A confidence-gated AI answer is the default first response', them: 'A human-operated support platform with AI assist features layered in' },
  { feature: 'Self-hosting', us: 'AGPL-3.0, docker compose up, tenant data stays on your infrastructure', them: 'Hosted SaaS only' },
  { feature: 'Bring your own LLM', us: 'OpenAI, Anthropic, Google, Groq, Mistral, Ollama, or any OpenAI-compatible endpoint — your key, your cost', them: 'Platform-hosted models' },
  { feature: 'Pricing model', us: 'Deflection-volume tiers; self-host is free forever', them: 'Per-seat pricing typical of a commercial support platform' },
  { feature: 'Knowledge base', us: 'Auto-promotes resolved tickets, plus crawled docs, file upload, a synced GitHub repo, and a Notion workspace; 👍/👎 feedback prunes weak answers', them: 'Knowledge base with AI article suggestions' },
  { feature: 'Agent-first access', us: 'MCP server (JSON-RPC) plus a REST API expose the same knowledge and workflows to agents', them: 'REST API for integrations' },
]

export default function VsPylonPage() {
  return (
    <ComparisonPage
      competitor="Pylon"
      competitorSummary="a modern B2B support platform for companies that support customers in shared Slack and Teams channels, with account views, ticketing and AI-assist features."
      intro="Pylon is built for B2B SaaS teams doing customer support in shared Slack Connect channels, with a polished commercial product and CRM-style account context. AnswerLoops is built for teams whose support also happens in public — a Discord server, a Discourse forum, GitHub Issues — where a confidence-gated AI answer handles the repeat questions and self-hosting keeps the data and the model choice yours."
      rows={ROWS}
      bestFor={{
        us: 'your support spans public community channels (Discord, a forum, GitHub) as well as customer Slack, you want AI auto-answer as the core of the workflow, or you need to self-host and choose your own model provider.',
        them: 'nearly all of your support happens in shared Slack or Teams channels with named B2B customers, and you want a polished commercial platform with account-level context and a dedicated success team behind it.',
      }}
      faq={[
        {
          question: 'Is there an open-source alternative to Pylon?',
          answer:
            'Yes. AnswerLoops is AGPL-3.0 licensed and self-hostable with docker compose, so your tickets and knowledge never leave your servers. Pylon is a hosted, closed-source SaaS product.',
        },
        {
          question: 'Does AnswerLoops work for public communities, not just customer Slack?',
          answer:
            'Yes. AnswerLoops treats a public Discord server, a Discourse or Circle forum, GitHub Issues and Discussions, Telegram, email and a website widget as first-class sources, alongside shared Slack. Pylon is centred on B2B support in shared Slack and Teams channels.',
        },
        {
          question: 'Can I bring my own LLM?',
          answer:
            'Yes. Each workspace uses its own key for OpenAI, Anthropic, Google Gemini, Groq, Mistral, or any OpenAI-compatible endpoint, including local models via Ollama. Pylon uses platform-hosted models.',
        },
        {
          question: 'When is Pylon the better choice?',
          answer:
            'If almost all of your support happens in shared Slack or Teams channels with named B2B customers and you want a polished commercial platform with account-level context, Pylon is purpose-built for that.',
        },
      ]}
    />
  )
}
