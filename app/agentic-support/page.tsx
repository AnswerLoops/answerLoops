import type { Metadata } from 'next'
import Link from 'next/link'
import { Footer, Nav } from '@/components/marketing/chrome'
import { resolveNavState } from '@/lib/marketing/nav-state'
import { PageSchema } from '@/components/marketing/page-schema'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'What Is an Agentic Support Platform? — AnswerLoops',
  description:
    'AnswerLoops is an open-source, self-hostable agentic support platform for developer communities. Resolve repeat questions across Discord, Slack, GitHub, email, Telegram, Google Chat, and web chat.',
  alternates: { canonical: '/agentic-support' },
  openGraph: {
    title: 'What Is an Agentic Support Platform? — AnswerLoops',
    description:
      'An open-source, self-hostable support agent that resolves repeat questions across every community channel while keeping your team in control.',
    url: '/agentic-support',
  },
  twitter: {
    title: 'Agentic Support for Developer Communities — AnswerLoops',
    description:
      'Open-source, self-hostable agentic support across Discord, Slack, GitHub, email, Telegram, Google Chat, and web chat.',
  },
}

const CHANNELS = ['Discord', 'Slack', 'Google Chat', 'GitHub', 'Telegram', 'Email', 'Website chat']

const CAPABILITIES = [
  {
    title: 'Answers grounded in your knowledge',
    body: 'AnswerLoops searches your documentation, knowledge base, and resolved tickets before drafting a response, so the agent works from what your team already knows.',
  },
  {
    title: 'Confidence-gated automation',
    body: 'High-confidence answers can post automatically. Uncertain questions go to a human with an editable draft, keeping your team in control of edge cases.',
  },
  {
    title: 'One support brain across every channel',
    body: 'Bring community questions into one consistent workflow instead of maintaining a separate bot, inbox, and knowledge source for each platform.',
  },
  {
    title: 'Agent-first access',
    body: 'MCP and REST API access lets compatible agents search your knowledge base, read FAQs, create tickets, and generate grounded answers through the same pipeline.',
  },
  {
    title: 'Open source and self-hostable',
    body: 'Run the platform on your own infrastructure with the source available for inspection and control, or use the hosted service when you want a managed deployment.',
  },
]

export default async function AgenticSupportPage() {
  const navState = await resolveNavState()

  return (
    <div className="min-h-screen bg-[#f5f8fd]">
      <PageSchema name="What is an agentic support platform?" description="Agentic support for developer communities across community channels." path="/agentic-support" breadcrumbs={[{ name: 'Product', path: '/' }]} />
      <Nav state={navState} />

      <main>
        <section className="relative isolate overflow-hidden bg-[#030611] py-24 sm:py-32">
          <div className="landing-grid pointer-events-none absolute inset-0 opacity-55" />
          <div className="pointer-events-none absolute left-1/2 top-[-20rem] h-[44rem] w-[72rem] -translate-x-1/2 rounded-[50%] bg-blue-600/25 blur-[140px]" />
          <div className="relative mx-auto max-w-5xl px-5 text-center sm:px-8">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-blue-300">Agentic support infrastructure</p>
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-white sm:text-7xl">
              What is an agentic support platform?
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-pretty text-base leading-relaxed text-slate-200/75 sm:text-xl">
              AnswerLoops is an agentic support platform for developer communities. It resolves repeat questions across the channels where your users already ask for help, while your team stays in control of the answers that matter most.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/login" className="w-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110 sm:w-auto">
                Start your 14-day trial
              </Link>
              <Link href="/pricing" className="w-full rounded-full border border-white/20 px-6 py-3 text-center text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white sm:w-auto">
                See pricing
              </Link>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200/80 bg-white py-10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 px-5 sm:px-8">
            <span className="mr-2 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-slate-500">One agent across</span>
            {CHANNELS.map((channel) => (
              <span key={channel} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">{channel}</span>
            ))}
          </div>
        </section>

        <section className="bg-white py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="max-w-2xl">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-blue-600">Built for the agent era</p>
              <h2 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl">The support loop gets smarter every time it runs.</h2>
              <p className="mt-5 text-base leading-relaxed text-slate-600">A question becomes a ticket, a grounded answer, and eventually reusable knowledge. AnswerLoops turns the conversations your team keeps repeating into an improving support system.</p>
            </div>
            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map((capability) => (
                <article key={capability.title} className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-6">
                  <h3 className="text-lg font-semibold tracking-[-0.025em] text-slate-950">{capability.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{capability.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#eef4fb] py-24 sm:py-32">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-blue-600">Open by design</p>
              <h2 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl">Use the hosted service or run it yourself.</h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">AnswerLoops is available as a managed cloud service and as an open-source, self-hostable platform. Bring your own model provider, keep operational control, and connect agents through MCP or the REST API.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/pricing" className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">Compare plans</Link>
                <Link href="/docs/quickstart-self-host" className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400">Read the self-hosting guide</Link>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_20px_70px_rgba(30,64,175,0.08)]">
              <p className="text-sm font-semibold text-slate-950">The short version</p>
              <ul className="mt-5 space-y-4 text-sm leading-relaxed text-slate-600">
                <li>✓ AI answers repeat questions automatically</li>
                <li>✓ Humans review the questions that need judgment</li>
                <li>✓ Resolved answers strengthen the knowledge base</li>
                <li>✓ Your agents can use the same support pipeline</li>
                <li>✓ Open source and self-hostable when you need it</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-[#030611] py-24 text-center sm:py-32">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <h2 className="text-balance text-4xl font-semibold tracking-[-0.05em] text-white sm:text-6xl">Make the next repeat question the last one.</h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-300/70">Start with the channels your community already uses and let AnswerLoops build the support system from the questions you actually receive.</p>
            <Link href="/login" className="mt-9 inline-flex rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110">Start your 14-day trial</Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
