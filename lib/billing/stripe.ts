import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-05-27.dahlia' })
  }
  return _stripe
}

/**
 * Cancels a subscription immediately (not at period end) — account deletion
 * revokes access the same second, so billing must stop the same second too,
 * unlike a normal user-initiated cancel-at-period-end. Swallows only "no
 * such subscription" (Stripe's `resource_missing`) so a stale id — a
 * customer who already canceled through the Stripe portal, or whose row
 * predates this feature — never blocks the deletion itself. Canceling an
 * already-canceled subscription is not an error case; Stripe returns the
 * object unchanged. Any other error propagates rather than being silently
 * treated as "already handled".
 */
export async function cancelSubscriptionImmediately(stripeSubscriptionId: string): Promise<void> {
  try {
    await getStripe().subscriptions.cancel(stripeSubscriptionId)
  } catch (err) {
    if ((err as { code?: string })?.code === 'resource_missing') return
    throw err
  }
}

export async function getOrCreateCustomer(orgId: number, email: string, name: string): Promise<string> {
  const stripe = getStripe()
  const existing = await stripe.customers.search({
    query: `metadata['org_id']:'${orgId}'`,
    limit: 1,
  })
  if (existing.data.length > 0) return existing.data[0].id

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { org_id: String(orgId) },
  })
  return customer.id
}
