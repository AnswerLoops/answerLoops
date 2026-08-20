'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js'
import {
  ANNUAL_DISCOUNT_PCT,
  annualMonthlyPrice,
  annualTotalPrice,
  TRIAL_DAYS,
  type BillingInterval,
  type Plan,
} from '@/lib/billing/plans'

/**
 * The checkout page's interactive half.
 *
 * Stripe's form renders in an iframe here rather than on checkout.stripe.com,
 * which is what lets the plan picker, the feature list and the FAQ sit around
 * it in our own layout. Stripe still owns everything inside that frame — card
 * fields, 3D Secure, wallet buttons, the promotion-code input — so switching to
 * this did not mean re-implementing any of it.
 *
 * A Checkout Session's line items are fixed once created, so changing plan or
 * interval cannot mutate the current session: each switch fetches a new client
 * secret, and the `key` on the provider forces a genuine remount rather than a
 * re-render against a stale one.
 */

/**
 * The publishable key is safe in client code by design — it can only create
 * payment attempts, never read or move money. Read once at module scope so a
 * missing one surfaces as a clear disabled state rather than a null deref
 * inside Stripe's loader.
 */
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = publishableKey ? loadStripe(publishableKey) : null

const money = (cents: number) => `$${(cents / 100).toFixed(0)}`

interface Props {
  plans: Plan[]
  initialPlanId: string
  initialInterval: BillingInterval
}

export function EmbeddedCheckoutPanel({ plans, initialPlanId, initialInterval }: Props) {
  const [planId, setPlanId] = useState(initialPlanId)
  const [interval, setInterval] = useState<BillingInterval>(initialInterval)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const plan = useMemo(() => plans.find((p) => p.id === planId) ?? plans[0], [plans, planId])
  const annual = interval === 'annual'

  useEffect(() => {
    // Abandoned when the selection changes again mid-flight: without this, two
    // rapid switches can resolve out of order and mount the session for the
    // plan that was deselected — which is the one thing on this page that must
    // never be wrong, since it decides what the card is charged for.
    let cancelled = false

    setClientSecret(null)
    setError(null)

    fetch('/api/billing/checkout/embedded', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, interval }),
    })
      .then((r) => r.json() as Promise<{ clientSecret?: string; error?: string }>)
      .then((data) => {
        if (cancelled) return
        if (data.error) {
          setError(data.error)
          return
        }
        if (data.clientSecret) setClientSecret(data.clientSecret)
      })
      .catch(() => {
        if (!cancelled) setError('Could not reach checkout. Check your connection and try again.')
      })

    return () => {
      cancelled = true
    }
  }, [planId, interval])

  const fetchClientSecret = useCallback(async () => clientSecret ?? '', [clientSecret])

  if (!stripePromise) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        Checkout is unavailable: this deployment has no Stripe publishable key configured.
      </div>
    )
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
      {/* Payment — Stripe's iframe, our surroundings */}
      <div className="order-2 lg:order-1">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Payment</h2>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-sm font-medium text-red-900">{error}</p>
            <p className="mt-1 text-xs text-red-700">
              Nothing has been charged. Try selecting the plan again, or contact us if it keeps failing.
            </p>
          </div>
        ) : clientSecret ? (
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <EmbeddedCheckoutProvider
              // Remount on every new secret. Stripe reads the secret once at
              // mount, so reusing the component across a plan switch would keep
              // showing the previous plan's session.
              key={clientSecret}
              stripe={stripePromise}
              options={{ fetchClientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        ) : (
          <div
            className="mt-5 h-[28rem] animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
            aria-label="Loading payment form"
          />
        )}

        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Secure payments processed by Stripe. Your card details never touch our servers.
        </p>
      </div>

      {/* Plan selection and reassurance */}
      <div className="order-1 lg:order-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Choose a plan
          </h2>
          <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setInterval('monthly')}
              aria-pressed={!annual}
              className={`rounded-full px-3 py-1.5 transition-colors ${!annual ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval('annual')}
              aria-pressed={annual}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${annual ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Annual
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[0.625rem] text-emerald-700">
                −{ANNUAL_DISCOUNT_PCT}%
              </span>
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {plans.map((p) => {
            const selected = p.id === plan.id
            const price = annual ? annualMonthlyPrice(p) : p.priceMonthly
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlanId(p.id)}
                aria-pressed={selected}
                className={`rounded-2xl border p-5 text-left transition ${
                  selected
                    ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-semibold text-slate-950">{p.name}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-semibold tracking-tight text-slate-950">
                    {money(price)}
                  </span>
                  <span className="text-xs text-slate-500">/mo</span>
                </div>
                {annual && (
                  <div className="mt-1 text-[0.6875rem] text-slate-500">
                    billed annually · {money(annualTotalPrice(p))}/yr
                  </div>
                )}
                <div className="mt-3 text-xs text-slate-600">
                  {p.deflectionsPerMonth === null
                    ? 'Unlimited deflections'
                    : `${p.deflectionsPerMonth.toLocaleString()} deflections/mo`}
                </div>
              </button>
            )
          })}
        </div>

        <ul className="mt-7 space-y-2.5 text-sm text-slate-700">
          {[
            `${TRIAL_DAYS}-day free trial — pay nothing today`,
            'Cancel any time from Settings, no email required',
            'Bring your own AI provider key — no usage markup',
            'MCP server and REST API included on every plan',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[0.5625rem] text-emerald-700">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-8 space-y-2">
          {[
            {
              q: 'Am I going to be charged today?',
              a: `No. The first ${TRIAL_DAYS} days are free. Your card is authorised now and charged only when the trial ends, and cancelling before then costs nothing.`,
            },
            {
              q: 'Can I change plan later?',
              a: 'Yes, from Settings → Billing. Upgrades apply immediately; downgrades take effect at the end of the period you already paid for.',
            },
            {
              q: 'What counts as a deflection?',
              a: 'One question the AI answered automatically with enough confidence that no human stepped in. Questions routed to a person never count, even when the AI drafted the reply.',
            },
            {
              q: 'How do I cancel?',
              a: 'Settings → Billing → Cancel. It takes one click and you do not have to talk to anyone.',
            },
          ].map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-slate-200 bg-white px-4 py-3 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-slate-900">
                {item.q}
                <span className="text-lg font-light text-slate-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
