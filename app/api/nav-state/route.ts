import { NextResponse } from 'next/server'
import { resolveNavState } from '@/lib/marketing/nav-state'

// Backs the marketing header CTA (components/marketing/nav-cta.tsx). The
// marketing pages are static so they never read the session at render time;
// this route is the one place that still does, called once per page load from
// the client after hydration. Anonymous callers get { state: 'anonymous' }
// (see PUBLIC_PATHS in auth.ts — without that entry the session middleware
// would 401 a logged-out visitor before this handler runs).
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const state = await resolveNavState()
  return NextResponse.json(
    { state },
    // Per-visitor and cheap to recompute — must never be cached at the edge or
    // in the browser, or one visitor's CTA leaks to the next.
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
