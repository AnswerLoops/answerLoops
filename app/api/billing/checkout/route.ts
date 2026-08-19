import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { stripeConfigured } from '@/lib/billing/plans'
import { createCheckoutSession } from '@/lib/billing/checkout'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Self-hosted deployments aren't metered and have no billing to check out
  // into — the UI already hides this path, this is the API-level backstop.
  if (!stripeConfigured()) {
    return NextResponse.json({ error: 'Billing is not available on this deployment' }, { status: 400 })
  }

  const orgId = session.orgId ?? DEFAULT_ORG_ID
  const { planId } = (await req.json()) as { planId: string }

  const result = await createCheckoutSession(
    orgId,
    planId,
    session.user.email ?? '',
    session.user.name ?? '',
  )

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ url: result.url })
}
