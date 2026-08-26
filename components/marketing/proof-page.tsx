import Link from 'next/link'
import { Footer, Nav } from '@/components/marketing/chrome'
import type { NavState } from '@/components/marketing/chrome'

export interface ProofPageProps {
  navState: NavState
  eyebrow: string
  title: string
  intro: string
  sections: Array<{ title: string; body: string; details: string[] }>
  docs: Array<{ label: string; href: string }>
}

export function ProofPage({ navState, eyebrow, title, intro, sections, docs }: ProofPageProps) {
  return (
    <div className="min-h-screen bg-[#f5f8fd]"><Nav state={navState} />
      <main>
        <section className="relative isolate overflow-hidden bg-[#030611] py-24 sm:py-32">
          <div className="landing-grid pointer-events-none absolute inset-0 opacity-55" />
          <div className="pointer-events-none absolute left-1/2 top-[-20rem] h-[44rem] w-[72rem] -translate-x-1/2 rounded-[50%] bg-blue-600/25 blur-[140px]" />
          <div className="relative mx-auto max-w-4xl px-5 sm:px-8"><p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-blue-300">{eyebrow}</p><h1 className="mt-6 text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-white sm:text-7xl">{title}</h1><p className="mt-7 max-w-3xl text-pretty text-base leading-relaxed text-slate-200/75 sm:text-xl">{intro}</p></div>
        </section>
        <section className="bg-white py-20 sm:py-28"><div className="mx-auto max-w-6xl px-5 sm:px-8"><div className="grid gap-5 md:grid-cols-2">{sections.map((section, index) => <article key={section.title} className="rounded-3xl border border-slate-200 bg-[#f8fafc] p-7"><span className="text-sm font-semibold text-blue-600">0{index + 1}</span><h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{section.title}</h2><p className="mt-3 text-sm leading-relaxed text-slate-600">{section.body}</p><ul className="mt-6 space-y-3 text-sm leading-relaxed text-slate-700">{section.details.map((detail) => <li key={detail} className="flex gap-3"><span className="text-blue-600">✓</span><span>{detail}</span></li>)}</ul></article>)}</div></div></section>
        <section className="bg-[#eef4fb] py-20 sm:py-24"><div className="mx-auto max-w-4xl px-5 text-center sm:px-8"><h2 className="text-balance text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl">See the implementation details.</h2><p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600">The public pages explain the product model; the documentation covers configuration, deployment, and integration behavior.</p><div className="mt-8 flex flex-wrap justify-center gap-3">{docs.map((doc) => <Link key={doc.href} href={doc.href} className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:text-blue-700">{doc.label} →</Link>)}</div></div></section>
        <section className="bg-[#030611] py-20 text-center sm:py-24"><div className="mx-auto max-w-3xl px-5 sm:px-8"><h2 className="text-balance text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">Build a support system you can inspect.</h2><Link href="/login" className="mt-9 inline-flex rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110">Start your 14-day trial</Link></div></section>
      </main><Footer />
    </div>
  )
}
