// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PricingToggle } from '@/components/marketing/pricing-toggle'
import { ORDERED_PLANS, ANNUAL_DISCOUNT_PCT, annualMonthlyPrice } from '@/lib/billing/plans'

// New standalone /pricing page (Roadmap "Pricing page — Managed SaaS" item).
// The toggle is display-only: there is no separate Stripe annual price yet,
// and every CTA links to the waitlist since the product is pre-launch — the
// toggle only changes the price shown, never triggers a real purchase.

describe('lib/billing/plans.ts — annualMonthlyPrice', () => {
  it('discounts by ANNUAL_DISCOUNT_PCT off the monthly price', () => {
    const plan = ORDERED_PLANS.find((p) => p.id === 'standard')!
    expect(annualMonthlyPrice(plan)).toBe(Math.round(plan.priceMonthly * (1 - ANNUAL_DISCOUNT_PCT / 100)))
  })

  it('is strictly less than the monthly price for every paid plan', () => {
    for (const plan of ORDERED_PLANS) {
      expect(annualMonthlyPrice(plan)).toBeLessThan(plan.priceMonthly)
    }
  })
})

describe('PricingToggle', () => {
  it('defaults to annual billing (anchors on the lower price)', () => {
    render(<PricingToggle plans={ORDERED_PLANS} />)
    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  it('shows the annual (discounted) price by default for every plan', () => {
    render(<PricingToggle plans={ORDERED_PLANS} />)
    for (const plan of ORDERED_PLANS) {
      const expected = `$${(annualMonthlyPrice(plan) / 100).toFixed(0)}`
      expect(screen.getAllByText(expected).length).toBeGreaterThan(0)
    }
  })

  it('switches to full monthly pricing when toggled off', async () => {
    const user = userEvent.setup()
    render(<PricingToggle plans={ORDERED_PLANS} />)
    await user.click(screen.getByRole('switch'))
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    const standard = ORDERED_PLANS.find((p) => p.id === 'standard')!
    expect(screen.getAllByText(`$${(standard.priceMonthly / 100).toFixed(0)}`).length).toBeGreaterThan(0)
    // Annual-only "billed annually" note disappears once monthly is selected
    expect(screen.queryByText(/billed annually/)).not.toBeInTheDocument()
  })

  // This previously asserted every CTA pointed at the waitlist, on the grounds
  // that the product was pre-launch. That was a deliberate product decision and
  // it has been deliberately reversed: a visitor now picks a plan and starts a
  // trial, because a card up front is the commitment signal the funnel depends
  // on. The coverage is kept rather than dropped — it just pins the new
  // behaviour, including that each CTA carries its own plan.
  it('every plan CTA starts a trial for that specific plan', () => {
    render(<PricingToggle plans={ORDERED_PLANS} />)
    const ctas = screen.getAllByRole('link', { name: /start .* free trial/i })
    expect(ctas.length).toBe(ORDERED_PLANS.length)

    const hrefs = ctas.map((c) => c.getAttribute('href'))
    for (const plan of ORDERED_PLANS) {
      expect(
        hrefs,
        `no CTA carries plan "${plan.id}" — a visitor clicking it would lose their choice`,
      ).toContain(`/login?plan=${plan.id}`)
    }
  })

  it('no CTA points at the waitlist any more', () => {
    render(<PricingToggle plans={ORDERED_PLANS} />)
    expect(screen.queryByRole('link', { name: 'Join the waitlist' })).toBeNull()
  })

  it('tells the visitor a card is needed and will not be charged', () => {
    // The two facts that decide whether someone clicks through: yes it wants a
    // card, no it will not charge you yet.
    render(<PricingToggle plans={ORDERED_PLANS} />)
    const notes = screen.getAllByText(/card required.*not charged/i)
    expect(notes.length).toBe(ORDERED_PLANS.length)
  })

  it('marks the Pro plan as most popular', () => {
    render(<PricingToggle plans={ORDERED_PLANS} />)
    expect(screen.getByText('Most popular')).toBeInTheDocument()
  })

  it('puts the "Most popular" badge on the middle tier (id "pro"), not the cheapest one', () => {
    // Regression guard: isHighlight used to check plan.id === 'standard'
    // (the old, pre-rename literal 'pro') would badge the *cheapest* paid
    // tier as most popular — the opposite of the intended upsell. Only
    // asserting the text exists (as the test above does) wouldn't catch
    // that regression; this pins which specific plan card it's on.
    render(<PricingToggle plans={ORDERED_PLANS} />)
    const proPlan = ORDERED_PLANS.find((p) => p.id === 'pro')!
    const badge = screen.getByText('Most popular')
    // The card is the badge's nearest ancestor that also contains the
    // plan's own name heading — walk up until we find it.
    const card = badge.closest('div[class*="rounded-"]')
    expect(card).not.toBeNull()
    expect(card).toHaveTextContent(proPlan.name)

    for (const plan of ORDERED_PLANS) {
      if (plan.id === 'pro') continue
      const otherCard = screen.getByText(plan.name).closest('div[class*="rounded-"]')
      expect(otherCard).not.toBeNull()
      expect(otherCard).not.toHaveTextContent('Most popular')
    }
  })
})
