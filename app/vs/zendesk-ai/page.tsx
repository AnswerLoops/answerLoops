import type { Metadata } from 'next'
import { ComparisonPage } from '@/components/marketing/comparison-page'

export const metadata: Metadata = {
  title: 'AnswerLoops vs Zendesk AI — open-source alternative for community support',
  description:
    'How AnswerLoops compares to Zendesk AI: community-native ingest (Discord, Slack, forums, GitHub), AI-first confidence-gated auto-answer instead of an add-on, self-hosting, and bring-your-own-LLM with no per-resolution fee.',
  alternates: { canonical: '/vs/zendesk-ai' },
}

const ROWS = [
  { feature: 'Design center', us: 'AI-first — a confidence-gated auto-answer pipeline is the product', them: 'A mature enterprise help desk; AI (Advanced AI, AI agents) is a paid add-on layer' },
  { feature: 'Community channels', us: 'Discord, Slack, Discourse and Circle forums, GitHub Issues/Discussions, Telegram, email, and a website widget — one pipeline', them: 'Email, web, messaging and voice; no native Discord, forum or GitHub ingest' },
  { feature: 'Pricing model', us: 'Deflection-volume tiers; self-host is free forever under AGPL-3.0', them: 'Per-agent seats plus per-automated-resolution fees for the AI add-ons' },
  { feature: 'Self-hosting', us: 'AGPL-3.0, docker compose up, tenant data stays on your infrastructure', them: 'Hosted SaaS only' },
  { feature: 'Bring your own LLM', us: 'OpenAI, Anthropic, Google, Groq, Mistral, Ollama, or any OpenAI-compatible endpoint — your key, your cost', them: 'Zendesk-hosted models' },
  { feature: 'Confidence gating', us: 'A second AI pass grades every draft against its evidence; below your threshold it routes to a human with the draft attached', them: 'Configurable, but tuning and reporting live behind the Advanced AI tier' },
  { feature: 'Agent-first access', us: 'MCP server (JSON-RPC) plus a REST API expose the same knowledge and workflows to agents', them: 'REST API built for app and workflow integration' },
]

export default function VsZendeskAiPage() {
  return (
    <ComparisonPage
      slug="zendesk-ai"
      competitor="Zendesk AI"
      competitorSummary="the AI layer (Advanced AI, AI agents, generative replies) on top of Zendesk's enterprise help desk — a mature, human-first ticketing and CRM platform."
      intro="Zendesk is built for large support organisations working a shared email and web inbox, with AI added as a premium tier priced per automated resolution. AnswerLoops is built for teams whose support happens in a community — Discord, Slack, a forum, GitHub — where a confidence-gated AI answer, not a human queue, is the default first response, and self-hosting keeps AI cost under your control."
      rows={ROWS}
      bestFor={{
        us: 'your users ask for help in Discord, Slack, a forum or GitHub, you want AI auto-answer to be the primary response path rather than a paid add-on, or you need to self-host and run your own model provider without a per-resolution fee.',
        them: 'you run a large enterprise support organisation with a dedicated team, need the full breadth of Zendesk (voice, workforce management, CRM, deep reporting, compliance certifications), and email and web are your primary support surfaces.',
      }}
      faq={[
        {
          question: 'Is there an open-source alternative to Zendesk AI?',
          answer:
            'Yes. AnswerLoops is AGPL-3.0 licensed and self-hostable with docker compose, so tickets and knowledge stay on your own infrastructure and there is no per-resolution fee. Zendesk and its AI add-ons are hosted SaaS priced per agent seat and per automated resolution.',
        },
        {
          question: 'Does AnswerLoops support Discord and GitHub the way Zendesk supports email?',
          answer:
            'AnswerLoops treats Discord, Slack, Discourse and Circle forums, GitHub Issues and Discussions, Telegram, email, and a website widget as first-class sources in one pipeline. Zendesk centres on email, web, messaging and voice and has no native Discord, forum or GitHub ingest.',
        },
        {
          question: 'Can I use my own LLM instead of vendor-hosted models?',
          answer:
            'Yes. Each workspace configures its own key for OpenAI, Anthropic, Google Gemini, Groq, Mistral, or any OpenAI-compatible endpoint, including local models via Ollama. Zendesk AI runs on Zendesk-hosted models.',
        },
        {
          question: 'When is Zendesk still the better choice?',
          answer:
            'If you run a large enterprise support organisation that needs voice, workforce management, a built-in CRM, advanced reporting and compliance certifications, and your support lives in email and a web help centre, Zendesk is the more complete platform.',
        },
      ]}
    />
  )
}
