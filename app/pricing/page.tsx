import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ORDERED_PLANS, TRIAL_DAYS } from '@/lib/billing/plans'
import { Nav, Footer } from '@/components/marketing/chrome'
import { PricingToggle } from '@/components/marketing/pricing-toggle'
import { PricingComparisonTable } from '@/components/marketing/pricing-comparison-table'
import { resolveNavState } from '@/lib/marketing/nav-state'
import { GITHUB_URL } from '@/lib/site'
import { ORGANIZATION_ID } from '@/lib/site-identity'
import { PageSchema } from '@/components/marketing/page-schema'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pricing — AnswerLoops',
  description: 'AnswerLoops pricing for agentic developer-community support. Self-host the open-source platform for free, or choose a hosted plan with a 14-day trial and MCP/API access.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing — AnswerLoops',
    description: 'Self-host AnswerLoops for free or choose a hosted plan for agentic support across Discord, Slack, GitHub, email, and web chat.',
    url: '/pricing',
  },
  twitter: {
    title: 'Pricing — AnswerLoops',
    description: 'Self-host AnswerLoops for free or choose a hosted plan for agentic support across every community channel.',
  },
}

function PricingStructuredData() {
  const softwareJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AnswerLoops',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: 'https://answerloops.com/pricing',
    provider: { '@id': ORGANIZATION_ID },
    description: 'Agentic AI support for developer communities across Discord, Slack, Google Chat, GitHub, Telegram, email, and website chat.',
    offers: [
      {
        '@type': 'Offer',
        name: 'Self-hosted',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        description: 'Open-source platform running on your own infrastructure.',
      },
      ...ORDERED_PLANS.map((plan) => ({
        '@type': 'Offer',
        name: plan.name,
        price: (plan.priceMonthly / 100).toString(),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: (plan.priceMonthly / 100).toString(),
          priceCurrency: 'USD',
          billingDuration: 'P1M',
        },
        description: plan.deflectionsPerMonth === null
          ? 'Unlimited deflections per month with a 14-day hosted trial.'
          : `${plan.deflectionsPerMonth.toLocaleString()} deflections per month with a 14-day hosted trial.`,
      })),
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: PRICING_FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  )
}

const PRICING_FAQ = [
  {
    q: 'What counts as a deflection?',
    a: 'A deflection is one question the AI answered automatically with high enough confidence that no human needed to step in. Questions routed to a human for review — even if the AI drafted a suggested reply — don\'t count.',
  },
  {
    q: 'Can I switch plans?',
    a: 'Yes, any time from Settings → Billing. Upgrades apply immediately; downgrades take effect at the end of your current billing period so you keep what you already paid for.',
  },
  {
    q: 'What happens if I go over my deflection limit?',
    a: 'You\'ll see a warning banner in the dashboard once you cross 80% of your monthly limit. If you hit the limit, AI auto-answering pauses and new questions route to your human queue instead — nothing breaks, and no surprise charges hit your card.',
  },
  {
    q: 'Do you offer a free trial?',
    a: 'Every hosted plan starts with a 14-day free trial, card required at signup. Cancel any time before the trial ends and you won\'t be charged.',
  },
  {
    q: 'Is there a free, self-hosted option?',
    a: 'Yes. The core platform is open source — clone the repo and run docker compose up on your own infrastructure, with your data never leaving your servers. License details are on GitHub.',
  },
  {
    q: 'Do I need to provide my own AI provider key?',
    a: 'Yes, on every hosted plan. You bring your own key for OpenAI, Anthropic, Google Gemini, Groq, Mistral, or any OpenAI-compatible endpoint (including local models via Ollama). There\'s no platform AI markup — you pay your provider directly, and switching providers never means switching plans.',
  },
] as const

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ resume?: string; checkout?: string }>
}) {
  // Two ways to arrive here mid-flow, and landing on a plain pricing page with
  // no explanation in either case reads as the product losing your progress.
  const { resume, checkout } = await searchParams
  const navState = await resolveNavState()

  // Kept as a guard, not as the main path. getCallbackUrl() chooses the
  // post-OAuth destination before authentication has happened, so it has no
  // way to tell a subscriber from a new visitor and once sent both here.
  // /pricing is in PUBLIC_PATHS, so `authorized()` returns before the access
  // gate runs and nothing forwarded the subscriber onward — they sat on the
  // pricing page being told to buy what they already had.
  //
  // Sign-in now goes to /checkout instead, which sends a subscriber straight
  // to the dashboard. But ?resume=1 outlives that change: it survives in
  // bookmarks, shared links, and anywhere else the old URL was captured, and
  // this page still cannot rely on the gate to rescue it.
  if (resume === '1' && navState === 'active') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-[#f5f8fd]">
      <PageSchema name="AnswerLoops pricing" description="AnswerLoops pricing for agentic developer-community support." path="/pricing" breadcrumbs={[{ name: 'Product', path: '/agentic-support' }]} />
      <PricingStructuredData />
      <Nav state={navState} />

      <section className="relative isolate overflow-hidden bg-[#030611] pb-48 pt-20 sm:pb-56 sm:pt-28">
        <div className="landing-grid pointer-events-none absolute inset-0 opacity-55" />
        <div className="pointer-events-none absolute left-1/2 top-[-22rem] h-[48rem] w-[76rem] -translate-x-1/2 rounded-[50%] bg-blue-600/25 blur-[140px]" />
        <div className="pointer-events-none absolute -right-52 top-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/[0.08] px-3.5 py-1.5 text-[0.6875rem] font-medium text-blue-100">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.8)]" />
            Pricing without the seat tax
          </div>
          <h1 className="mt-7 text-balance text-[2.8rem] font-semibold leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl md:text-[4.7rem]">
            Pay for resolved questions.
            <span className="mt-2 block bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
              Not occupied seats.
            </span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-pretty text-base leading-relaxed text-slate-200/75 sm:text-lg">
            Every hosted plan includes the complete support loop. Choose the answer volume you need, bring your own model provider, and upgrade only when automation is already creating value. Built agent-first — every plan ships with an MCP server and REST API so Claude, Cursor, or your own agents can search your KB and open tickets directly, not just human staff.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[0.6875rem] font-medium text-white/55">
            {['14-day hosted trial', 'No per-seat fees', 'No AI usage markup', 'MCP + Agent API included'].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400/12 text-[0.5625rem] text-emerald-300">✓</span>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Anchor target for the header CTA (PLANS_HREF). scroll-mt clears the
          sticky header so the cards are not hidden underneath it. */}
      <section id="plans" className="relative scroll-mt-20 pb-24 sm:pb-32">
        <div className="relative mx-auto -mt-32 max-w-7xl px-5 sm:-mt-40 sm:px-8">
          {checkout === 'failed' && (
            <div className="mx-auto mb-6 max-w-2xl rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-center">
              <p className="text-sm font-medium text-red-900">We couldn&apos;t start checkout.</p>
              <p className="mt-1 text-xs text-red-700">
                Nothing was charged. Try again below — if it keeps failing, email us and we&apos;ll sort it out.
              </p>
            </div>
          )}

          {/* Also gated on having no plan, not just on the resume flag. The
              redirect above catches the sign-in path, but any other route to
              ?resume=1 with an active subscription would otherwise render
              "pick a plan" directly beneath a header offering the dashboard —
              two contradictory answers to the same question. */}
          {resume === '1' && checkout !== 'failed' && navState === 'no-plan' && (
            <div className="mx-auto mb-6 max-w-2xl rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-center">
              <p className="text-sm font-medium text-blue-900">You&apos;re signed in — pick a plan to finish setting up.</p>
              <p className="mt-1 text-xs text-blue-700">
                Your workspace is ready and waiting. Starting a trial takes a card, but nothing is charged for {TRIAL_DAYS} days.
              </p>
            </div>
          )}

          <div className="rounded-[2.25rem] border border-slate-200/80 bg-white/95 p-4 shadow-[0_30px_100px_rgba(15,23,42,0.16)] backdrop-blur-xl sm:p-7">
            <PricingToggle plans={ORDERED_PLANS} />
          </div>

          <p className="mx-auto mt-7 max-w-3xl text-center text-xs leading-relaxed text-slate-500">
            Hosted plans include Discord, Slack, Google Chat, GitHub, Telegram, email ingest, the AI agent, knowledge base, analytics, and the embeddable widget. Card required at signup; cancel before the trial ends and you won&apos;t be charged.
          </p>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-12 grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <div className="mb-5 flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-blue-600">
                <span className="h-px w-6 bg-blue-500" />
                Full comparison
              </div>
              <h2 className="text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl">Choose for the next stage—not the next hire.</h2>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-slate-600 lg:justify-self-end">
              Every tier includes the complete answer pipeline. Higher plans increase automation volume and add the operational insight your team needs as support scales.
            </p>
          </div>
          <PricingComparisonTable />
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#f4f7fb] py-24 sm:py-32">
        <div className="pointer-events-none absolute -left-52 top-0 h-[32rem] w-[32rem] rounded-full bg-blue-200/45 blur-[130px]" />
        <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-12 max-w-2xl">
            <div className="mb-5 flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-blue-600">
              <span className="h-px w-6 bg-blue-500" />
              Pricing questions
            </div>
            <h2 className="text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl">No surprise math.</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">The details that matter before you put a support workflow into production.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {PRICING_FAQ.map((item, index) => (
              <article key={item.q} className="rounded-2xl border border-slate-200/90 bg-white/85 p-6 shadow-[0_12px_35px_rgba(30,64,175,0.045)] backdrop-blur-sm">
                <div className="mb-5 flex items-center justify-between">
                  <span className="font-mono text-[0.625rem] font-semibold text-blue-500/75">0{index + 1}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500/50" />
                </div>
                <h3 className="text-base font-semibold tracking-[-0.02em] text-slate-950">{item.q}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Checkout works from the plan cards above, so this closing section
          offers the same live actions rather than an email signup — a
          "waitlist" CTA here would be asking someone who could already
          start a trial to wait for one instead. */}
      <section className="relative overflow-hidden bg-[#030611]">
        <div className="landing-grid pointer-events-none absolute inset-0 opacity-35" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[52rem] -translate-x-1/2 rounded-[50%] bg-blue-600/25 blur-[120px]" />
        <div className="relative mx-auto max-w-5xl px-5 py-24 text-center sm:px-8 sm:py-32">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.07] text-lg text-cyan-300">↗</div>
          <h2 className="mt-7 text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-6xl">Start with the questions you already answer twice.</h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-slate-200/70 sm:text-base">Start a hosted trial in a couple of minutes, or take the source and run AnswerLoops on your own infrastructure. Both are the same product.</p>
          <div className="mx-auto mt-9 max-w-xl">
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="#plans" className="w-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110 sm:w-auto">
                Start your 14-day trial
              </Link>
              <Link href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="w-full rounded-full border border-white/15 px-6 py-3 text-center text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white sm:w-auto">
                Self-host it free
              </Link>
            </div>
            <p className="mt-3 text-[0.625rem] text-white/25">A card is required to start the trial. Nothing is charged for 14 days.</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
