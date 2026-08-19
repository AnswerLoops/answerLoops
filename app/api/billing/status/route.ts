import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSubscription } from '@/lib/db/queries/billing'
import { checkDeflectionLimit } from '@/lib/billing/usage'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = session.orgId ?? DEFAULT_ORG_ID
  const [sub, usage] = await Promise.all([
    getSubscription(orgId),
    checkDeflectionLimit(orgId),
  ])

  // 'none' means no subscription row exists yet — not the same as an
  // active plan. There is no free tier, so this must not default to 'active'.
  const status = sub?.status ?? 'none'
  const isTrialing = status === 'trialing'

  return NextResponse.json({
    planId: usage.planId,
    status,
    isTrialing,
    trialEndsAt: sub?.trialEndsAt ?? null,
    used: usage.used,
    limit: usage.limit,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
  })
}
