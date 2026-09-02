import type { Metadata } from 'next'
import { ComparisonPage } from '@/components/marketing/comparison-page'

export const metadata: Metadata = {
  title: 'AnswerLoops vs Plain — open-source alternative for community support',
  description:
    'How AnswerLoops compares to Plain: community channels beyond Slack and email (Discord, forums, GitHub), AI-first confidence-gated auto-answer, self-hosting under AGPL-3.0, and bring-your-own-LLM.',
  alternates: { canonical: '/vs/plain' },
}

const ROWS = [
  { feature: 'Channels', us: 'Discord, Slack, Discourse and Circle forums, GitHub Issues/Discussions, Telegram, email, and a website widget — one pipeline', them: 'Slack, email, Microsoft Teams, and a chat widget' },
  { feature: 'Design center', us: 'A confidence-gated AI answer is the default first response; humans handle the long tail', them: 'A clean, API-first support workspace for human agents, with AI answers as a feature' },
  { feature: 'Self-hosting', us: 'AGPL-3.0, docker compose up, tenant data stays on your infrastructure', them: 'Hosted SaaS only' },
  { feature: 'Bring your own LLM', us: 'OpenAI, Anthropic, Google, Groq, Mistral, Ollama, or any OpenAI-compatible endpoint — your key, your cost', them: 'Platform-hosted models' },
  { feature: 'Knowledge base', us: 'Auto-promotes resolved tickets, plus crawled docs, file upload, a synced GitHub repo, and a Notion workspace', them: 'Answers drawn from connected help-centre and docs content' },
  { feature: 'Pricing model', us: 'Deflection-volume tiers; self-host is free forever', them: 'Per-seat pricing' },
  { feature: 'Agent-first access', us: 'MCP server (JSON-RPC) plus a REST API expose the same knowledge and workflows to agents', them: 'A well-regarded GraphQL/REST API for building on top of the workspace' },
]

export default function VsPlainPage() {
  return (
    <ComparisonPage
      competitor="Plain"
      competitorSummary="a clean, API-first support platform aimed at developer-focused companies, centred on Slack, email and a chat widget."
      intro="Plain is a polished, API-first support workspace built for developer-facing companies working Slack and email. AnswerLoops is built around the AI answer itself: it watches a wider set of community channels — a Discord server, a Discourse forum, GitHub Issues — answers the repeat questions when it is confident, and can be self-hosted with your own model provider."
      rows={ROWS}
      bestFor={{
        us: 'your community asks for help across Discord, a forum and GitHub as well as Slack, you want AI auto-answer to be the core of the workflow rather than a feature, or you need to self-host and control your own AI cost.',
        them: 'your support runs on Slack and email, you want a beautifully built commercial workspace with a first-class API, and human agents handling tickets is the primary model.',
      }}
      faq={[
        {
          question: 'Is there an open-source alternative to Plain?',
          answer:
            'Yes. AnswerLoops is AGPL-3.0 licensed and self-hostable with docker compose, so your data stays on your own servers. Plain is a hosted, closed-source SaaS product.',
        },
        {
          question: 'What does AnswerLoops do that Plain does not?',
          answer:
            'AnswerLoops ingests a wider set of community channels — Discord, Discourse and Circle forums, GitHub Issues and Discussions, Telegram — not just Slack and email, and a confidence-gated AI answer is the default first response rather than an assist feature for human agents. It also runs on your own LLM key and can be self-hosted.',
        },
        {
          question: 'Can I bring my own LLM?',
          answer:
            'Yes. Each workspace configures its own key for OpenAI, Anthropic, Google Gemini, Groq, Mistral, or any OpenAI-compatible endpoint, including local models via Ollama. Plain uses platform-hosted models.',
        },
        {
          question: 'When is Plain the better choice?',
          answer:
            'If your support runs on Slack and email, you want a polished commercial workspace with an excellent API, and human agents working tickets is your primary model, Plain is a strong fit.',
        },
      ]}
    />
  )
}
