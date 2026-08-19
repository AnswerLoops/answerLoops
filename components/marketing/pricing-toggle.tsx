'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ANNUAL_DISCOUNT_PCT, annualMonthlyPrice, TRIAL_DAYS, type Plan } from '@/lib/billing/plans'

function CheckIcon({ inverted = false }: { inverted?: boolean }) {
  return (
    <svg className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${inverted ? 'text-cyan-300' : 'text-blue-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const PLAN_FEATURES: Record<string, string[]> = {
  standard: [
    '500 questions answered automatically every month',
    'One bot everywhere your community already is — Discord, Slack, GitHub, Telegram, Email, and web chat',
    'Self-improving knowledge base, trained from your docs, URLs, and GitHub repos',
    'Built for AI agents too — MCP server and REST API so Claude, Cursor, or your own agents can search your KB and open tickets directly',
    'Capture leads straight from the widget, no extra tool',
    'Answers in whatever language your customer asks in',
    'Your brand only — no "Powered by" footer',
    'Export every ticket and lead to CSV, any time',
    'Email support',
  ],
  pro: [
    '2,000 questions answered automatically every month',
    'Everything in Standard',
    'Know exactly how happy your community is, automatically, after every answer',
    'Hard questions never sit unseen — auto-routed to the right person on your team',
    'Test a model or confidence-threshold change against real history before it ever reaches a customer',
    'See exactly what your docs are missing, ranked by how often people actually ask',
    'Priority support',
  ],
  enterprise: [
    'Unlimited automated answers',
    'Everything in Pro',
    'Run on your own model, including a private fine-tune',
    'SLA-backed response times with automatic breach alerts, not a promise on a call',
    'Keep every ticket and conversation forever — no retention window to manage',
    'We migrate you off Zendesk, Intercom, or Confluence ourselves — white-glove, not self-serve',
    '6x higher MCP and Agent API rate limits for high-volume agent workloads',
    'Custom invoicing and a dedicated point of contact',
  ],
}

const PLAN_DESCRIPTIONS: Record<string, string> = {
  standard: 'For small teams ready to remove repeat support from the daily queue.',
  pro: 'For growing communities that need deeper insight and escalation control.',
  enterprise: 'For high-volume or regulated teams with custom operational requirements.',
}

export function PricingToggle({ plans }: { plans: Plan[] }) {
  // Defaults to monthly because monthly is what checkout charges. Annual is a
  // real offer, but it is arranged by hand rather than sold self-serve, so
  // anchoring the page on it would put a price in front of every visitor that
  // the Start-trial button does not honour.
  const [annual, setAnnual] = useState(false)

  return (
    <>
      <div className="flex flex-col items-center justify-between gap-5 px-2 pb-5 sm:flex-row sm:px-3">
        <div>
          <div className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-blue-600">Hosted plans</div>
          <p className="mt-1 text-sm font-medium text-slate-900">The complete support loop, managed for you.</p>
        </div>
        <div className="flex items-center rounded-full border border-slate-200 bg-slate-100/80 p-1 shadow-[inset_0_1px_rgba(15,23,42,0.03)]">
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${!annual ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>Monthly</span>
          <button
            type="button"
            role="switch"
            aria-checked={annual}
            aria-label="Use annual billing"
            onClick={() => setAnnual((v) => !v)}
            className={`relative mx-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${annual ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${annual ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${annual ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>
            Annual
          </span>
          <span className="ml-1 mr-1 rounded-full bg-emerald-100 px-2 py-1 text-[0.5625rem] font-bold uppercase tracking-[0.08em] text-emerald-700">Save {ANNUAL_DISCOUNT_PCT}%</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const isHighlight = plan.id === 'pro'
          const ctaClass = `relative mt-8 block w-full rounded-full py-3 text-center text-xs font-semibold transition ${
            isHighlight
              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/20 hover:brightness-110'
              : 'border border-slate-200 bg-slate-50 text-slate-800 hover:border-blue-200 hover:bg-blue-50'
          }`
          const displayPrice = annual ? annualMonthlyPrice(plan) : plan.priceMonthly
          const features = PLAN_FEATURES[plan.id] ?? []
          return (
            <div
              key={plan.id}
              className={`relative flex min-h-[540px] flex-col overflow-hidden rounded-[1.75rem] border p-7 transition duration-300 hover:-translate-y-1 ${
                isHighlight
                  ? 'border-blue-400/20 bg-[#07101f] text-white shadow-[0_26px_65px_rgba(15,23,42,0.22)]'
                  : 'border-slate-200/90 bg-white text-slate-950 shadow-[0_16px_45px_rgba(30,64,175,0.055)] hover:shadow-[0_22px_60px_rgba(30,64,175,0.1)]'
              }`}
            >
              {isHighlight && (
                <>
                  <div className="landing-grid pointer-events-none absolute inset-0 opacity-30" />
                  <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/25 blur-[90px]" />
                </>
              )}
              {isHighlight && (
                <div className="relative mb-7">
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[0.5625rem] font-bold uppercase tracking-[0.13em] text-cyan-200">
                    Most popular
                  </span>
                </div>
              )}
              {!isHighlight && <div className="relative mb-7 text-[0.5625rem] font-bold uppercase tracking-[0.13em] text-slate-400">Hosted</div>}
              <div className={`relative text-lg font-semibold ${isHighlight ? 'text-white' : 'text-slate-950'}`}>{plan.name}</div>
              <p className={`relative mt-2 min-h-16 text-xs leading-relaxed ${isHighlight ? 'text-slate-200/65' : 'text-slate-500'}`}>
                {PLAN_DESCRIPTIONS[plan.id]}
              </p>
              <div className="relative mt-5 flex items-end gap-1">
                <span className={`text-5xl font-semibold tracking-[-0.05em] ${isHighlight ? 'text-white' : 'text-slate-950'}`}>${(displayPrice / 100).toFixed(0)}</span>
                <span className={`mb-1.5 text-sm ${isHighlight ? 'text-white/50' : 'text-slate-500'}`}>/mo</span>
              </div>
              {annual && (
                <div className={`relative mt-1 text-[0.625rem] ${isHighlight ? 'text-white/45' : 'text-slate-400'}`}>billed annually · ${((displayPrice * 12) / 100).toFixed(0)}/yr</div>
              )}
              <div className={`relative mt-2 text-xs font-semibold ${isHighlight ? 'text-emerald-300' : 'text-emerald-700'}`}>14-day free trial</div>
              <div className={`relative mt-4 border-t pt-4 text-xs font-medium ${isHighlight ? 'border-white/10 text-blue-100' : 'border-slate-100 text-blue-700'}`}>
                {plan.deflectionsPerMonth === null
                  ? 'Unlimited deflections'
                  : `${plan.deflectionsPerMonth.toLocaleString()} deflections/mo`}
              </div>

              <ul className="relative mt-6 flex-1 space-y-2.5">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckIcon inverted={isHighlight} />
                    <span className={`text-xs leading-relaxed ${isHighlight ? 'text-slate-200/75' : 'text-slate-600'}`}>{f}</span>
                  </li>
                ))}
              </ul>

              {/* Monthly carries the chosen plan through sign-in so checkout opens
                  on the plan that was actually clicked; /start-trial reads it
                  after OAuth and redirects straight to Stripe.

                  Annual deliberately does not. Stripe holds one price per plan
                  and it is the monthly one, so a Start-trial button under the
                  annual figures would charge the monthly rate — a different
                  number from either the per-month or the yearly total shown
                  directly above it. Until annual prices exist in Stripe, the
                  honest control is one that starts a conversation rather than a
                  subscription. */}
              {annual ? (
                <a
                  href={`mailto:hello@answerloops.com?subject=${encodeURIComponent(`Annual billing — ${plan.name}`)}`}
                  className={ctaClass}
                >
                  Talk to us about annual billing
                </a>
              ) : (
                <Link href={`/login?plan=${plan.id}`} className={ctaClass}>
                  Start {TRIAL_DAYS}-day free trial
                </Link>
              )}
              <p className={`mt-2 text-center text-[0.625rem] ${isHighlight ? 'text-slate-300/60' : 'text-slate-500'}`}>
                {annual
                  ? 'Annual plans are invoiced directly — we set them up with you.'
                  : `Card required. Not charged for ${TRIAL_DAYS} days.`}
              </p>
            </div>
          )
        })}
      </div>
    </>
  )
}
