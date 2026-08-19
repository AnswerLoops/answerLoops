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

  it('every plan CTA links to the waitlist, not a live checkout — the product is pre-launch', () => {
    render(<PricingToggle plans={ORDERED_PLANS} />)
    const ctas = screen.getAllByRole('link', { name: 'Join the waitlist' })
    expect(ctas.length).toBe(ORDERED_PLANS.length)
    for (const cta of ctas) {
      expect(cta).toHaveAttribute('href', '#waitlist')
    }
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
