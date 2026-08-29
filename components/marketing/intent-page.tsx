import Link from 'next/link'
import { Footer, Nav } from '@/components/marketing/chrome'
import type { NavState } from '@/components/marketing/chrome'
import { PageSchema, type PageSchemaProps } from '@/components/marketing/page-schema'

export interface IntentPageProps {
  navState: NavState
  eyebrow: string
  title: string
  intro: string
  audience: string
  highlights: Array<{ title: string; body: string }>
  workflow: Array<{ step: string; title: string; body: string }>
  comparison: Array<{ question: string; answer: string }>
  docs: Array<{ label: string; href: string }>
  schema: PageSchemaProps
}

export function IntentPage({ navState, eyebrow, title, intro, audience, highlights, workflow, comparison, docs, schema }: IntentPageProps) {
  return (
    <div className="min-h-screen bg-[#f5f8fd]">
      <PageSchema {...schema} />
      <Nav state={navState} />

      <main>
        <section className="relative isolate overflow-hidden bg-[#030611] py-24 sm:py-32">
          <div className="landing-grid pointer-events-none absolute inset-0 opacity-55" />
          <div className="pointer-events-none absolute left-1/2 top-[-20rem] h-[44rem] w-[72rem] -translate-x-1/2 rounded-[50%] bg-blue-600/25 blur-[140px]" />
          <div className="relative mx-auto max-w-4xl px-5 sm:px-8">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-blue-300">{eyebrow}</p>
            <h1 className="mt-6 max-w-4xl text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-white sm:text-7xl">{title}</h1>
            <p className="mt-7 max-w-3xl text-pretty text-base leading-relaxed text-slate-200/75 sm:text-xl">{intro}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110">Start your 14-day trial</Link>
              <Link href="/pricing" className="rounded-full border border-white/20 px-6 py-3 text-center text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white">See pricing</Link>
            </div>
          </div>
        </section>

        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-7">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-blue-700">Who it is for</p>
                <p className="mt-4 text-lg leading-relaxed text-slate-800">{audience}</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {highlights.map((highlight) => (
                  <article key={highlight.title} className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-6">
                    <h2 className="text-lg font-semibold tracking-[-0.025em] text-slate-950">{highlight.title}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{highlight.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#eef4fb] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-blue-600">How the support loop works</p>
            <h2 className="mt-5 max-w-2xl text-balance text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl">A question becomes a better answer next time.</h2>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {workflow.map((item) => (
                <article key={item.step} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <span className="text-sm font-semibold text-blue-600">{item.step}</span>
                  <h3 className="mt-4 text-xl font-semibold tracking-[-0.025em] text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-blue-600">AnswerLoops at a glance</p>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr><th className="px-5 py-4 font-semibold text-slate-950">Question</th><th className="px-5 py-4 font-semibold text-blue-700">Answer</th></tr>
                </thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row.question} className="border-b border-slate-100 last:border-0">
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900">{row.question}</td>
                      <td className="px-5 py-4 leading-relaxed text-slate-600">{row.answer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {docs.map((doc) => <Link key={doc.href} href={doc.href} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:text-blue-700">{doc.label} →</Link>)}
            </div>
          </div>
        </section>

        <section className="bg-[#030611] py-20 text-center sm:py-24">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <h2 className="text-balance text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">Turn repeat questions into reusable support.</h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-300/70">Start with one community or knowledge source, then expand when the workflow is working.</p>
            <Link href="/login" className="mt-9 inline-flex rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110">Start your 14-day trial</Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
