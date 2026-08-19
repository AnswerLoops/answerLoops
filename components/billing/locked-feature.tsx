'use client'

import { useUpgrade } from './use-upgrade'
import { PLANS, type PlanId } from '@/lib/billing/plans'

export function LockedFeature({
  requiredPlan,
  featureLabel,
}: {
  requiredPlan: PlanId
  featureLabel: string
}) {
  const { upgrade, pending } = useUpgrade()
  const planName = PLANS[requiredPlan].name

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
        <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{featureLabel} is available on {planName} and above</h3>
      <p className="max-w-sm text-xs text-gray-500">Upgrade your plan to unlock this — your current usage and data are unaffected.</p>
      <button
        onClick={() => upgrade(requiredPlan)}
        disabled={pending}
        className="mt-1 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? 'Redirecting…' : `Upgrade to ${planName} →`}
      </button>
    </div>
  )
}

export function LockBadge() {
  return (
    <svg className="h-3 w-3 text-white/35" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  )
}
