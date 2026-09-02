import Link from 'next/link'
import { Nav, Footer, GITHUB_URL } from '@/components/marketing/chrome'
import { PageSchema } from '@/components/marketing/page-schema'
import { jsonLdHtml } from '@/lib/marketing/json-ld'
import { ORGANIZATION_ID } from '@/lib/site-identity'

export interface ComparisonRow {
  feature: string
  us: string
  them: string
}

export interface ComparisonFaqItem {
  question: string
  answer: string
}

export interface ComparisonPageProps {
  competitor: string
  competitorSummary: string
  intro: string
  rows: ComparisonRow[]
  bestFor: { us: string; them: string }
  /** Question-shaped Q&A rendered on the page and emitted as FAQPage JSON-LD. */
  faq?: ComparisonFaqItem[]
}

export function ComparisonPage({ competitor, competitorSummary, intro, rows, bestFor, faq }: ComparisonPageProps) {
  const slug = competitor.toLowerCase()
  const url = `https://answerloops.com/vs/${slug}`

  // SoftwareApplication + FAQPage give answer engines discrete, liftable
  // structures for exactly the "X vs Y" / "X alternative" prompts these pages
  // target. Built entirely from server-controlled strings, never user input;
  // jsonLdHtml escapes `<` so the payload can't break out of the script tag.
  const comparisonJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${url}#software`,
        name: 'AnswerLoops',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, Docker (self-hosted)',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: 'Self-hosted under AGPL-3.0; hosted plans from $49/mo.',
        },
        publisher: { '@id': ORGANIZATION_ID },
      },
      ...(faq && faq.length > 0
        ? [
            {
              '@type': 'FAQPage',
              '@id': `${url}#faq`,
              mainEntity: faq.map((item) => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: { '@type': 'Answer', text: item.answer },
              })),
            },
          ]
        : []),
    ],
  }

  return (
    <div className="min-h-screen bg-white">
      <PageSchema name={`AnswerLoops vs ${competitor}`} description={intro} path={`/vs/${slug}`} breadcrumbs={[{ name: 'Comparisons', path: '/pricing' }]} />
      {/* nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(comparisonJsonLd) }} />
      <Nav />

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

          {faq && faq.length > 0 && (
            <div className="mt-14">
              <h2 className="text-xl font-bold text-gray-900">Frequently asked questions</h2>
              <dl className="mt-6 divide-y divide-gray-100 border-t border-gray-100">
                {faq.map((item) => (
                  <div key={item.question} className="py-5">
                    <dt className="text-sm font-semibold text-gray-900">{item.question}</dt>
                    <dd className="mt-2 text-sm text-gray-600 leading-relaxed">{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

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
