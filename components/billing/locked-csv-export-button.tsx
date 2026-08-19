'use client'

import { useUpgrade } from './use-upgrade'

/** Standard+ gate for the tickets/leads CSV export buttons — same visual slot as the real link, but triggers checkout instead of downloading. */
export function LockedCsvExportButton({ className }: { className: string }) {
  const { upgrade, pending } = useUpgrade()

  return (
    <button
      type="button"
      onClick={() => upgrade('standard')}
      disabled={pending}
      title="CSV export is available on Standard and above"
      className={`${className} opacity-60 disabled:opacity-40`}
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
      {pending ? 'Redirecting…' : 'Export CSV'}
    </button>
  )
}
