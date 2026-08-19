import Link from 'next/link'
import { Nav, Footer, GITHUB_URL } from '@/components/marketing/chrome'

export interface ComparisonRow {
  feature: string
  us: string
  them: string
}

export interface ComparisonPageProps {
  loggedIn: boolean
  competitor: string
  competitorSummary: string
  intro: string
  rows: ComparisonRow[]
  bestFor: { us: string; them: string }
}

export function ComparisonPage({ loggedIn, competitor, competitorSummary, intro, rows, bestFor }: ComparisonPageProps) {
  return (
    <div className="min-h-screen bg-white">
      <Nav loggedIn={loggedIn} />

      <section className="bg-ink-950 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <span className="inline-block rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/60 mb-6">
            Comparison
          </span>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            AnswerLoops vs {competitor}
          </h1>
          <p className="mt-5 text-lg text-white/60 max-w-2xl mx-auto">{intro}</p>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            <strong className="text-gray-900">{competitor}</strong> — {competitorSummary}
          </p>

          <div className="mt-10 overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3.5 text-left font-semibold text-gray-900">Feature</th>
                  <th className="px-5 py-3.5 text-left font-semibold text-brand-600">AnswerLoops</th>
                  <th className="px-5 py-3.5 text-left font-semibold text-gray-500">{competitor}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.feature} className="border-b border-gray-100 last:border-0">
                    <td className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap">{row.feature}</td>
                    <td className="px-5 py-4 text-gray-600">{row.us}</td>
                    <td className="px-5 py-4 text-gray-500">{row.them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-brand-100 bg-brand-50/30 p-6">
              <div className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">AnswerLoops is a better fit if</div>
              <p className="text-sm text-gray-600 leading-relaxed">{bestFor.us}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{competitor} is a better fit if</div>
              <p className="text-sm text-gray-600 leading-relaxed">{bestFor.them}</p>
            </div>
          </div>

          <div className="mt-14 rounded-2xl border-2 border-gray-200 bg-gray-50 p-8 text-center">
            <h2 className="text-xl font-bold text-gray-900">Try AnswerLoops free</h2>
            <p className="mt-2 text-sm text-gray-500">Self-host for free (AGPL-3.0), or start a 14-day trial on a hosted plan.</p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Clone on GitHub
              </Link>
              <Link href="/#pricing" className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:from-brand-500 hover:to-brand-400 transition-colors">
                See hosted plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
