import { describe, expect, it, vi, beforeEach } from 'vitest'

const createSession = vi.fn()
const getSubscription = vi.fn()
const getOrCreateCustomer = vi.fn()

vi.mock('@/lib/billing/stripe', () => ({
  getStripe: () => ({ checkout: { sessions: { create: createSession } } }),
  getOrCreateCustomer,
}))
vi.mock('@/lib/db/queries/billing', () => ({ getSubscription }))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
vi.mock('@/lib/db/drizzle', () => {
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'from', 'innerJoin', 'where']) chain[method] = () => chain
  chain.limit = async () => []
  return { getDb: () => chain }
})

beforeEach(() => {
  vi.resetModules()
  createSession.mockReset()
  createSession.mockResolvedValue({ url: 'https://checkout.stripe.test/session' })
  getSubscription.mockResolvedValue(null)
  getOrCreateCustomer.mockReset()
  process.env.STRIPE_PRICE_STANDARD = 'price_standard_test'
})

describe('new checkout customer lifecycle', () => {
  it('does not create a Stripe Customer before hosted checkout completes', async () => {
    const { createCheckoutSession } = await import('@/lib/billing/checkout')

    await createCheckoutSession(42, 'standard', 'owner@example.com', 'Owner')

    expect(getOrCreateCustomer).not.toHaveBeenCalled()
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
      customer_email: 'owner@example.com',
    }))
    expect(createSession.mock.calls[0][0]).not.toHaveProperty('customer')
  })

  it('reuses the stored Stripe Customer for an existing subscriber', async () => {
    getSubscription.mockResolvedValue({ stripeCustomerId: 'cus_existing' })
    const { createCheckoutSession } = await import('@/lib/billing/checkout')

    await createCheckoutSession(42, 'standard', 'owner@example.com', 'Owner')

    expect(getOrCreateCustomer).not.toHaveBeenCalled()
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({ customer: 'cus_existing' }))
    expect(createSession.mock.calls[0][0]).not.toHaveProperty('customer_email')
  })

  it('applies the same lifecycle to embedded checkout', async () => {
    const { createEmbeddedCheckoutSession } = await import('@/lib/billing/checkout')

    createSession.mockResolvedValue({ client_secret: 'cs_test_secret' })
    await createEmbeddedCheckoutSession(42, 'standard', 'owner@example.com', 'Owner')

    expect(getOrCreateCustomer).not.toHaveBeenCalled()
    expect(createSession.mock.calls[0][0]).toHaveProperty('customer_email', 'owner@example.com')
    expect(createSession.mock.calls[0][0]).not.toHaveProperty('customer')
  })
})
