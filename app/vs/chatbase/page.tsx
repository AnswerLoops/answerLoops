import type { Metadata } from 'next'
import { ComparisonPage } from '@/components/marketing/comparison-page'

export const metadata: Metadata = {
  title: 'AnswerLoops vs Chatbase — AI support platform comparison',
  description: 'How AnswerLoops compares to Chatbase for community and website support: confidence-gated auto-answer, Discord/Slack/GitHub ingest, self-hosting, and bring-your-own-LLM.',
  alternates: { canonical: '/vs/chatbase' },
}

const ROWS = [
  { feature: 'Primary surface', us: 'Discord, Slack, Discourse, Circle, GitHub, Telegram, email, and a website widget — one pipeline', them: 'Website chat widget, primarily' },
  { feature: 'Confidence gating', us: 'A second AI pass grades every answer before it posts; low-confidence answers route to a human with a draft', them: 'Configurable confidence thresholds on the chat widget' },
  { feature: 'Bring your own LLM', us: 'OpenAI, Anthropic, Google, Groq, Mistral, or any OpenAI-compatible endpoint — your key, your cost', them: 'Platform-hosted models' },
  { feature: 'Self-hosting', us: 'AGPL-3.0, docker compose up, your data never leaves your servers', them: 'Hosted SaaS only' },
  { feature: 'Community ticket triage', us: 'Every question becomes a classified, prioritized ticket with SLA tracking', them: 'Chat-first, no ticket/SLA layer' },
  { feature: 'Agent-first API access', us: 'MCP server — Claude Code, Cursor, and other agents call the same pipeline directly', them: 'REST API for chat integration' },
  { feature: 'Knowledge base source', us: 'Auto-promotes resolved tickets, plus doc/URL ingest', them: 'Manual doc/URL/file upload' },
]

export default function VsChatbasePage() {
  return (
    <ComparisonPage
      competitor="Chatbase"
      competitorSummary="a widely-used tool for adding an AI chat widget to a website, trained on your uploaded docs and URLs."
      intro="Chatbase is built around one surface: a chatbot on your website. AnswerLoops is built around the ticket — Discord, Slack, Discourse, Circle, GitHub, email, and your website all feed the same confidence-gated triage pipeline, with resolved answers feeding back into a self-improving knowledge base."
      rows={ROWS}
      bestFor={{
        us: 'your support questions come in across Discord, Slack, or GitHub as much as (or more than) your website, you want a ticket/SLA layer around every question, or you need to self-host and control your own AI costs.',
        them: 'your only support surface is a website chat widget and you want the fastest path to embedding one.',
      }}
      faq={[
        {
          question: 'Is there an open-source alternative to Chatbase?',
          answer:
            'Yes. AnswerLoops is AGPL-3.0 licensed and self-hostable with docker compose, so your data never leaves your servers. Chatbase is hosted SaaS only.',
        },
        {
          question: 'What does AnswerLoops do that a website chatbot does not?',
          answer:
            'AnswerLoops answers questions where communities actually ask them — Discord, Slack, Discourse and Circle forums, GitHub, Telegram, and email — not just a website widget. Every question becomes a classified, prioritized ticket with SLA tracking, and a second AI pass grades each answer before it posts automatically.',
        },
        {
          question: 'Can I bring my own LLM?',
          answer:
            'Yes. AnswerLoops lets each workspace use its own key for OpenAI, Anthropic, Google Gemini, Groq, Mistral, or any OpenAI-compatible endpoint, so you control model choice and cost. Chatbase uses platform-hosted models.',
        },
        {
          question: 'When is Chatbase the better choice?',
          answer:
            'If your only support surface is a website chat widget and you want the fastest path to embedding one, Chatbase is purpose-built for that.',
        },
      ]}
    />
  )
}
