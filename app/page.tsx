import Link from 'next/link'
import type { Metadata } from 'next'
import { ORDERED_PLANS } from '@/lib/billing/plans'
import { AnimatedChat } from '@/components/animated-chat'
import { Nav, Footer, GithubIcon, GITHUB_URL } from '@/components/marketing/chrome'
import { resolveNavState } from '@/lib/marketing/nav-state'

export const metadata: Metadata = {
  title: 'AnswerLoops — Agentic support for developer communities',
  description:
    'Agentic AI support for developer communities: resolve repeat questions across Discord, Slack, Google Chat, GitHub, Telegram, email, and website chat. Open source, self-hosted, and MCP/API-ready.',
  alternates: { canonical: '/' },
}

export const dynamic = 'force-dynamic'

function ArrowIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  )
}

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3 9.8 9.8 3 12l6.8 2.2L12 21l2.2-6.8L21 12l-6.8-2.2L12 3Z" />
    </svg>
  )
}

function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div className={`mb-5 flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] ${light ? 'text-blue-300' : 'text-blue-600'}`}>
      <span className={`h-px w-6 ${light ? 'bg-blue-400/70' : 'bg-blue-500'}`} />
      {children}
    </div>
  )
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#030611]">
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute left-1/2 top-[-18rem] h-[44rem] w-[72rem] -translate-x-1/2 rounded-[50%] bg-blue-600/25 blur-[140px]" />
      <div className="pointer-events-none absolute -left-48 top-[34rem] h-[34rem] w-[34rem] rounded-full bg-indigo-700/15 blur-[120px]" />
      <div className="pointer-events-none absolute -right-52 top-[20rem] h-[38rem] w-[38rem] rounded-full bg-cyan-500/10 blur-[130px]" />

      <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-20 sm:px-8 sm:pb-28 sm:pt-28">
        <div className="mx-auto max-w-4xl text-center">
          <div className="landing-hero-rise inline-flex items-center gap-2 rounded-full border border-blue-300/15 bg-blue-400/[0.07] px-3.5 py-1.5 text-[0.6875rem] font-medium text-blue-100 shadow-[inset_0_1px_rgba(255,255,255,0.05)]">
            <span className="text-cyan-300"><SparkIcon /></span>
            Built for support teams entering the agent era
          </div>

          <h1 className="landing-hero-rise [animation-delay:80ms] mt-7 text-balance text-[2.8rem] font-semibold leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl md:text-[5rem]">
            Support runs itself.
            <span className="mt-2 block bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
              Your team stays in control.
            </span>
          </h1>

          <p className="landing-hero-rise [animation-delay:160ms] mx-auto mt-7 max-w-2xl text-pretty text-base leading-relaxed text-slate-300/70 sm:text-lg">
            AnswerLoops resolves repeat developer questions across Discord, Slack, Google Chat, GitHub, email, and your website—grounded in your knowledge, checked by a second model, and escalated when confidence is low.
          </p>

          <div className="landing-hero-rise [animation-delay:240ms] mx-auto mt-9 max-w-xl">
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              {/* One action in the fold, and it goes straight to auth. The
                  self-host link that used to sit beside this competed with it
                  at the moment of decision and sent the clicks it won out of
                  the funnel; self-hosting is still offered on the FAQ and
                  comparison pages, just not here. Sending this to /pricing
                  first asked for a plan decision before anyone was invested —
                  a small decision, since the trial is free and the plan can be
                  switched on the checkout screen, but one more thing to do
                  before signing up. */}
              <Link href="/login" className="w-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110 sm:w-auto">
                Start your 14-day trial
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[0.6875rem] font-medium text-white/55">
              <span className="flex items-center gap-1.5"><CheckIcon className="h-3 w-3 text-emerald-400" /> 14-day hosted trial</span>
              <span className="flex items-center gap-1.5"><CheckIcon className="h-3 w-3 text-emerald-400" /> Open-source core</span>
              <span className="flex items-center gap-1.5"><CheckIcon className="h-3 w-3 text-emerald-400" /> Bring your own model</span>
            </div>
          </div>
        </div>

        <div className="landing-hero-rise [animation-delay:320ms] relative mx-auto mt-16 max-w-6xl sm:mt-20">
          <div className="pointer-events-none absolute -inset-x-20 -bottom-24 h-56 bg-blue-600/20 blur-[100px]" />
          <div className="relative rounded-[2rem] border border-white/8 bg-white/[0.025] p-2 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] sm:p-3">
            <AnimatedChat />
          </div>
          <div className="pointer-events-none absolute inset-x-16 -bottom-px h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent shadow-[0_0_28px_rgba(103,232,249,0.65)]" />
        </div>
      </div>
    </section>
  )
}

const CHANNELS = ['Discord', 'Slack', 'Google Chat', 'GitHub', 'Telegram', 'Email', 'Web widget']

function ChannelRail() {
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[#070b15]">
      <div className="pointer-events-none absolute left-1/2 top-0 h-24 w-[42rem] -translate-x-1/2 bg-blue-500/10 blur-[70px]" />
      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-5 px-5 py-8 sm:px-8 lg:flex-row lg:justify-between">
        <p className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-white/55">One brain. Every support channel.</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {CHANNELS.map((channel, index) => (
            <div key={channel} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[0.6875rem] font-medium text-white/75 shadow-[inset_0_1px_rgba(255,255,255,0.035)]">
              <span className={`h-1.5 w-1.5 rounded-full shadow-[0_0_10px_currentColor] ${index % 3 === 0 ? 'bg-indigo-400' : index % 3 === 1 ? 'bg-blue-400' : 'bg-cyan-300'}`} />
              {channel}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Outcomes() {
  const stats = [
    {
      eyebrow: 'Quality gate',
      value: '2-pass',
      label: 'Every answer is drafted, then independently reviewed.',
      accent: 'from-indigo-400 to-blue-400',
    },
    {
      eyebrow: 'One knowledge layer',
      value: '7 channels',
      label: 'Discord, Slack, Google Chat, GitHub, Telegram, email, and web.',
      accent: 'from-blue-400 to-cyan-300',
    },
    {
      eyebrow: 'Model freedom',
      value: '5+ providers',
      label: 'Use the best model for the job—or bring your own endpoint.',
      accent: 'from-cyan-300 to-emerald-300',
    },
    {
      eyebrow: 'Continuous coverage',
      value: 'Always on',
      label: 'Triage continues after your support team signs off.',
      accent: 'from-violet-400 to-blue-400',
    },
  ]

  return (
    <section className="relative overflow-hidden bg-[#f6f8fc] py-24 sm:py-32">
      <div className="pointer-events-none absolute right-[-14rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-blue-200/50 blur-[120px]" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div className="landing-reveal">
            <SectionLabel>Built for the questions that repeat</SectionLabel>
            <h2 className="max-w-xl text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-5xl">
              Turn support noise into a compounding knowledge loop.
            </h2>
          </div>
          <div className="landing-reveal [animation-delay:100ms] lg:pb-1">
            <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Most support tools make the inbox faster. AnswerLoops makes fewer questions reach the inbox at all. Every resolved conversation improves the next answer, while confidence gates keep your team in charge of the edge cases.
            </p>
            <Link href="/#how-it-works" className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
              See the loop in action
              <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        <div className="landing-reveal relative mt-16 overflow-hidden rounded-[2rem] border border-white/10 bg-[#07101f] p-2 shadow-[0_32px_90px_rgba(15,23,42,0.18)] sm:p-3">
          <div className="landing-grid pointer-events-none absolute inset-0 opacity-30" />
          <div className="pointer-events-none absolute -right-24 -top-40 h-96 w-96 rounded-full bg-blue-500/25 blur-[110px]" />
          <div className="relative flex flex-col gap-3 border-b border-white/8 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">The AnswerLoops operating system</p>
              <p className="mt-1 text-sm font-medium text-white">Coverage, quality, and control—working as one loop.</p>
            </div>
            <div className="flex items-center gap-2 text-[0.625rem] text-white/45">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />
              Built into every answer
            </div>
          </div>

          <div className="relative grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat, index) => (
              <article
                key={stat.eyebrow}
                className="group relative min-h-48 overflow-hidden rounded-[1.4rem] border border-white/[0.07] bg-white/[0.035] p-6 transition duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.055] sm:min-h-52"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className={`absolute inset-x-6 top-0 h-px bg-gradient-to-r ${stat.accent} opacity-80`} />
                <div className="flex items-center gap-2 text-[0.5625rem] font-semibold uppercase tracking-[0.17em] text-white/35">
                  <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-br ${stat.accent}`} />
                  {stat.eyebrow}
                </div>
                <div className="mt-8 text-[2rem] font-semibold leading-none tracking-[-0.045em] text-white sm:text-[2.25rem]">{stat.value}</div>
                <p className="mt-4 max-w-[15rem] text-xs leading-relaxed text-slate-300/55">{stat.label}</p>
                <span className="absolute bottom-5 right-5 font-mono text-[0.5625rem] text-white/15">0{index + 1}</span>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

const LOOP_STEPS = [
  {
    n: '01',
    title: 'Listen everywhere',
    body: 'Questions arrive from Discord, Slack, Google Chat, GitHub, Telegram, email, or your embedded widget. The channel changes; the workflow does not.',
    accent: 'from-indigo-500 to-blue-500',
  },
  {
    n: '02',
    title: 'Ground every answer',
    body: 'AnswerLoops classifies intent and retrieves the most relevant docs, URLs, PDFs, and previously resolved tickets before drafting.',
    accent: 'from-blue-500 to-cyan-400',
  },
  {
    n: '03',
    title: 'Review before posting',
    body: 'A separate reviewer model grades completeness and confidence. Strong answers publish in seconds; uncertain ones become editable drafts.',
    accent: 'from-cyan-400 to-emerald-400',
  },
  {
    n: '04',
    title: 'Learn from the outcome',
    body: 'Feedback removes weak answers and human resolutions flow back into the knowledge base, so deflection improves without a retraining ritual.',
    accent: 'from-emerald-400 to-blue-500',
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-[#050914] py-24 text-white sm:py-32">
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="pointer-events-none absolute left-[-12rem] top-1/3 h-[30rem] w-[30rem] rounded-full bg-blue-700/15 blur-[120px]" />
      <div className="relative mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
        <div className="landing-reveal lg:sticky lg:top-28 lg:self-start">
          <SectionLabel light>The confidence-gated loop</SectionLabel>
          <h2 className="max-w-md text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-5xl">
            Autonomous when it can be. Human when it should be.
          </h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-slate-300/60 sm:text-base">
            The safeguard is part of the pipeline, not a setting someone remembers to turn on later.
          </p>
          <div className="mt-9 inline-flex items-center gap-3 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-4 py-2 text-xs text-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Reviewer model always on
          </div>
        </div>

        <div className="relative">
          <div className="absolute bottom-10 left-[27px] top-10 w-px bg-gradient-to-b from-blue-500/50 via-cyan-400/30 to-transparent sm:left-[35px]" />
          {LOOP_STEPS.map((item, index) => (
            <article key={item.n} className="landing-reveal relative grid grid-cols-[56px_1fr] gap-4 border-b border-white/8 py-9 first:pt-0 last:border-b-0 sm:grid-cols-[72px_1fr] sm:gap-6 sm:py-12">
              <div className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br ${item.accent} p-px sm:h-[70px] sm:w-[70px]`}>
                <div className="flex h-full w-full items-center justify-center rounded-[calc(1rem-1px)] bg-[#080d19] text-xs font-semibold text-white/70 sm:text-sm">{item.n}</div>
              </div>
              <div className="pt-1 sm:pt-2">
                <div className="mb-3 flex items-center gap-3">
                  <h3 className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">{item.title}</h3>
                  {index === 2 && <span className="hidden rounded-full bg-blue-500/15 px-2 py-1 text-[0.5625rem] font-medium text-blue-200 sm:inline">THE SAFETY LAYER</span>}
                </div>
                <p className="max-w-xl text-sm leading-relaxed text-slate-300/55 sm:text-base">{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProductPreview() {
  return (
    <div className="relative h-full min-h-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="flex h-10 items-center gap-2 border-b border-slate-100 px-4">
        <span className="h-2 w-2 rounded-full bg-slate-200" />
        <span className="h-2 w-2 rounded-full bg-slate-200" />
        <span className="h-2 w-2 rounded-full bg-slate-200" />
        <span className="ml-3 text-[0.5625rem] font-medium text-slate-400">AnswerLoops / Analytics</span>
      </div>
      <div className="grid grid-cols-3 gap-2.5 p-4">
        {[
          ['73%', 'Deflection rate', '+8.4%'],
          ['186h', 'Time saved', '+22h'],
          ['94%', 'Answer quality', '+3.1%'],
        ].map(([value, label, delta]) => (
          <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-base font-semibold text-slate-900 sm:text-lg">{value}</div>
            <div className="mt-1 text-[0.5rem] text-slate-400 sm:text-[0.5625rem]">{label}</div>
            <div className="mt-2 text-[0.5rem] font-medium text-emerald-600">{delta}</div>
          </div>
        ))}
      </div>
      <div className="mx-4 rounded-xl border border-slate-100 p-4">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[0.5625rem] font-medium text-slate-500">Resolved conversations</span>
          <span className="text-[0.5rem] text-slate-300">Last 30 days</span>
        </div>
        <div className="flex h-24 items-end gap-1.5">
          {[28, 44, 38, 58, 52, 72, 63, 82, 70, 92, 84, 100].map((height, index) => (
            <span
              key={index}
              className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-600 to-cyan-300"
              style={{ height: `${height}%`, opacity: 0.38 + index * 0.045 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function Features() {
  const compactFeatures = [
    {
      title: 'Your model, your economics',
      body: 'OpenAI, Anthropic, Google, Groq, Mistral, Ollama, or any OpenAI-compatible endpoint. No hidden AI markup.',
      color: 'bg-indigo-500',
    },
    {
      title: 'Escalations arrive ready',
      body: 'Low-confidence questions reach your team with full context, cited sources, and a draft ready to edit.',
      color: 'bg-blue-500',
    },
    {
      title: 'One source of truth',
      body: 'The same living knowledge base powers community channels, your website widget, and MCP-compatible agents.',
      color: 'bg-cyan-500',
    },
  ]

  return (
    <section id="features" className="relative overflow-hidden bg-[#eef3fb] py-24 sm:py-32">
      <div className="pointer-events-none absolute left-[-10rem] top-0 h-[30rem] w-[30rem] rounded-full bg-indigo-200/45 blur-[120px]" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="landing-reveal max-w-2xl">
          <SectionLabel>Product, not a pile of integrations</SectionLabel>
          <h2 className="text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-5xl">
            Everything the loop needs to keep getting better.
          </h2>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <article className="landing-reveal group min-h-[500px] overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(30,64,175,0.07)] sm:p-9">
            <div className="flex h-full flex-col">
              <div className="max-w-md">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-lg shadow-blue-500/20">
                  <SparkIcon />
                </div>
                <h3 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">Prove the impact, not just the activity.</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">Track deflection, answer quality, hours saved, and the topics generating the most support load.</p>
              </div>
              <div className="mt-9 flex-1 transition-transform duration-500 group-hover:-translate-y-1">
                <ProductPreview />
              </div>
            </div>
          </article>

          <article className="landing-reveal [animation-delay:100ms] group relative min-h-[500px] overflow-hidden rounded-[2rem] border border-blue-400/10 bg-[#071126] p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] sm:p-9">
            <div className="pointer-events-none absolute -right-28 top-10 h-72 w-72 rounded-full bg-blue-500/25 blur-[90px]" />
            <div className="relative flex h-full flex-col">
              <div className="max-w-md">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-cyan-300">
                  <CheckIcon />
                </div>
                <h3 className="text-2xl font-semibold tracking-[-0.035em]">Quality control is built into the answer.</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300/60">Every draft includes its evidence. Every answer passes through an independent confidence review.</p>
              </div>

              <div className="mt-10 space-y-3">
                {[
                  ['Grounding coverage', '100%', 'w-full'],
                  ['Answer completeness', '98%', 'w-[98%]'],
                  ['Reviewer confidence', '96%', 'w-[96%]'],
                ].map(([label, value, width], index) => (
                  <div key={label} className="rounded-xl border border-white/8 bg-white/[0.035] p-4">
                    <div className="mb-3 flex justify-between text-[0.625rem]">
                      <span className="text-white/45">{label}</span>
                      <span className={index === 2 ? 'font-medium text-emerald-300' : 'text-white/70'}>{value}</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-white/8">
                      <div className={`h-full ${width} rounded-full bg-gradient-to-r from-blue-500 to-cyan-300`} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-7 text-[0.625rem] text-white/30">Auto-post threshold: 90% · configurable by category</div>
            </div>
          </article>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {compactFeatures.map((feature, index) => (
            <article key={feature.title} className="landing-reveal rounded-[1.5rem] border border-slate-200/80 bg-white/75 p-7 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_45px_rgba(30,64,175,0.08)]" style={{ animationDelay: `${index * 80}ms` }}>
              <span className={`mb-8 block h-2 w-2 rounded-full ${feature.color} shadow-[0_0_15px_currentColor]`} />
              <h3 className="text-lg font-semibold tracking-[-0.025em] text-slate-900">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Ownership() {
  const enterprise = ['SSO and SAML', 'Audit logs', 'Custom retention', 'DPA / BAA', 'SLA-backed uptime', 'White-label widget']

  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="landing-reveal relative overflow-hidden rounded-[2rem] bg-[#07101f] text-white shadow-[0_36px_100px_rgba(15,23,42,0.22)]">
          <div className="landing-grid pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative grid overflow-hidden lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative border-b border-white/8 p-7 sm:p-12 lg:border-b-0 lg:border-r">
              <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-500/25 blur-[100px]" />
              <div className="relative">
                <SectionLabel light>Open source by default</SectionLabel>
                <h2 className="max-w-lg text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl">Own the experience. Own the stack.</h2>
                <p className="mt-5 max-w-lg text-sm leading-relaxed text-slate-200/85 sm:text-base">
                  Run AnswerLoops on your infrastructure when data residency and operational control matter. Or use the hosted service and let us handle the plumbing.
                </p>
                <div className="mt-8 overflow-hidden rounded-xl border border-white/15 bg-black/25 shadow-[inset_0_1px_rgba(255,255,255,0.04)]">
                  <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5" aria-hidden="true">
                    <span className="h-2 w-2 rounded-full bg-white/25" />
                    <span className="h-2 w-2 rounded-full bg-white/25" />
                    <span className="h-2 w-2 rounded-full bg-white/25" />
                  </div>
                  <div className="overflow-x-auto px-4 py-4 font-mono text-[0.6875rem] text-cyan-100 sm:text-xs">
                    <span className="mr-3 text-white/50">$</span>docker compose -f docker-compose.prod.yml up --build -d
                  </div>
                </div>
                <Link href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="group mt-7 inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <GithubIcon />
                  Explore the source
                  <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            <div className="relative p-7 sm:p-12">
              <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-[90px]" />
              <div className="relative inline-flex rounded-full border border-blue-300/25 bg-blue-400/[0.12] px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-blue-100">Enterprise ready</div>
              <h3 className="relative mt-6 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">Control without compromise.</h3>
              <p className="relative mt-3 text-sm leading-relaxed text-slate-200/80">Security and governance for regulated teams, without losing the speed of an AI-native workflow.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {enterprise.map((item) => (
                  <div key={item} className="relative flex items-center gap-2.5 text-xs font-medium text-slate-200/85">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-200">
                      <CheckIcon className="h-3 w-3" />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
              <Link href="/pricing" className="relative mt-9 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.11] px-5 py-2.5 text-xs font-semibold text-white shadow-[inset_0_1px_rgba(255,255,255,0.06)] transition hover:bg-white/15">
                Explore plans <ArrowIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const FAQ_ITEMS = [
  {
    q: 'What is AnswerLoops?',
    a: 'AnswerLoops is an AI support platform for developer communities. It watches Discord, Slack, Google Chat, GitHub Issues and Discussions, Telegram, email, and your website widget, answers repeat questions from your knowledge base, and routes uncertain questions to a human with a draft ready to edit.',
  },
  {
    q: 'How does it decide when to auto-answer?',
    a: 'Every draft goes through a second AI pass that grades grounding, completeness, and confidence. Only answers above your configurable threshold post automatically. Everything else enters the human queue with its sources and draft attached.',
  },
  {
    q: 'Can I use my own AI provider?',
    a: 'Yes. Configure OpenAI, Anthropic, Google Gemini, Groq, Mistral, Ollama, or any OpenAI-compatible endpoint. You pay the provider directly, with no platform markup on model usage.',
  },
  {
    q: 'Can I self-host AnswerLoops?',
    a: 'Yes. The core platform is open source and ships with a production Docker Compose setup. Self-hosting keeps community data on your infrastructure, while the hosted plans remove the operational work.',
  },
  {
    q: 'Does it work with coding agents?',
    a: 'Yes. The built-in MCP server lets compatible agents search the same knowledge base, read tickets, open new ones, and generate grounded support answers.',
  },
  {
    q: 'What if I don’t have a knowledge base yet?',
    a: 'You don’t need one to start. Connect wherever your community already asks questions — email, Discord, Slack, Google Chat, GitHub, Telegram, your site widget — and every incoming question becomes a ticket. Answer it once, and that answer becomes a KB article. No docs to write upfront: the knowledge base builds itself out of the real questions your community actually asks, and it gets sharper with every reply.',
  },
] as const

function FAQ() {
  return (
    <section id="faq" className="relative overflow-hidden bg-[#f4f7fb] py-24 sm:py-32">
      <div className="pointer-events-none absolute -left-52 top-20 h-[34rem] w-[34rem] rounded-full bg-blue-200/45 blur-[130px]" />
      <div className="pointer-events-none absolute -right-52 bottom-0 h-[30rem] w-[30rem] rounded-full bg-cyan-100/60 blur-[120px]" />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
        <div className="landing-reveal lg:sticky lg:top-28 lg:self-start">
          <SectionLabel>Questions, answered</SectionLabel>
          <h2 className="text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl">The useful details.</h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">Everything you need to know before putting AnswerLoops in front of your community.</p>
          <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/75 px-3 py-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.13em] text-blue-700 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            6 answers · 2 minute read
          </div>
        </div>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, index) => (
            <details
              key={item.q}
              className="landing-reveal group overflow-hidden rounded-2xl border border-slate-200/90 bg-white/80 shadow-[0_10px_35px_rgba(30,64,175,0.045)] backdrop-blur-sm transition hover:border-blue-200 hover:bg-white open:border-blue-200 open:bg-white open:shadow-[0_18px_50px_rgba(30,64,175,0.08)]"
              open={index === 0}
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-5 text-sm font-semibold text-slate-950 marker:content-none sm:px-6 sm:text-base">
                <span className="font-mono text-[0.625rem] font-semibold text-blue-500/75">0{index + 1}</span>
                <span className="flex-1">{item.q}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg font-light text-slate-500 transition group-open:rotate-45 group-open:border-blue-200 group-open:bg-blue-50 group-open:text-blue-600">+</span>
              </summary>
              <div className="mx-5 border-t border-slate-100 sm:mx-6">
                <p className="max-w-2xl py-5 pl-7 pr-4 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="relative overflow-hidden bg-[#030611]">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[54rem] -translate-x-1/2 rounded-[50%] bg-blue-600/25 blur-[120px]" />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-35" />
      <div className="relative mx-auto max-w-5xl px-5 py-24 text-center sm:px-8 sm:py-32">
        <div className="landing-reveal mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-cyan-300 shadow-[0_0_40px_rgba(59,130,246,0.18)]">
          <SparkIcon />
        </div>
        <h2 className="landing-reveal mt-7 text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-6xl">Make the next repeat question the last one.</h2>
        <p className="landing-reveal mx-auto mt-5 max-w-xl text-sm leading-relaxed text-slate-300/60 sm:text-base">Connect a channel, point AnswerLoops at what your team already knows, and let it handle the questions you have answered a hundred times.</p>
        <div className="landing-reveal mx-auto mt-9 max-w-xl">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login" className="w-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110 sm:w-auto">
              Start your 14-day trial
            </Link>
          </div>
          <p className="mt-3 text-[0.625rem] text-white/25">A card is required to start the trial. Nothing is charged for 14 days.</p>
        </div>
      </div>
    </section>
  )
}

function StructuredData() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AnswerLoops',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'AI community support platform that auto-answers repeat Discord, Slack, Google Chat, GitHub, Telegram, and email questions from your knowledge base, escalating only the hard ones to a human.',
    url: 'https://answerloops.com',
    offers: [
      {
        '@type': 'Offer',
        name: 'Self-hosted',
        price: '0',
        priceCurrency: 'USD',
        description: 'Open source. Full source code, runs on your own infrastructure.',
      },
      ...ORDERED_PLANS.map((plan) => ({
        '@type': 'Offer',
        name: plan.name,
        price: (plan.priceMonthly / 100).toString(),
        priceCurrency: 'USD',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: (plan.priceMonthly / 100).toString(),
          priceCurrency: 'USD',
          billingDuration: 'P1M',
        },
        description: plan.deflectionsPerMonth === null
          ? 'Unlimited deflections/mo, 14-day free trial'
          : `${plan.deflectionsPerMonth.toLocaleString()} deflections/mo, 14-day free trial`,
      })),
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  )
}

export default async function LandingPage() {
  const navState = await resolveNavState()
  return (
    <div className="min-h-screen bg-white">
      <StructuredData />
      <Nav state={navState} />
      <main>
        <Hero />
        <ChannelRail />
        <Outcomes />
        <HowItWorks />
        <Features />
        <Ownership />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
