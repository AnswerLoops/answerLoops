// Shared, component-free constants for the marketing header CTA, split out so
// the server `Nav` shell (chrome.tsx) and the client `NavCta` island
// (nav-cta.tsx) can both import them without a server/client import cycle.

export type NavState = 'anonymous' | 'no-plan' | 'active'

export function navState(loggedIn: boolean, hasAccess: boolean): NavState {
  if (!loggedIn) return 'anonymous'
  return hasAccess ? 'active' : 'no-plan'
}

// Returning users land on the sign-in copy rather than "Create your account".
// Google is the only provider, so both modes run the same OAuth flow — what
// differs is what the page claims to be.
export const SIGNIN_HREF = '/login?mode=signin'

// Every "start" action lands here; the plan is chosen after signing in, on the
// same screen that takes the card.
export const START_HREF = '/login'

// A signed-in visitor with no plan is already past auth, so their journey
// resumes one step further along: straight to the combined plan-and-card page.
export const CHECKOUT_HREF = '/checkout'

// NEXT_PUBLIC_APP_URL is inlined at build time — correct here, since this is a
// client-readable value and cloud sets it before the build.
export const DASHBOARD_HREF = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
  : '/dashboard'

export const CTA_CLASS =
  'flex items-center gap-1.5 whitespace-nowrap rounded-full border border-blue-300/20 bg-gradient-to-r from-blue-600 to-cyan-500 px-3 py-2 text-[0.7875rem] font-semibold !text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110 sm:px-4'

export const SECONDARY_CTA_CLASS =
  'hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-white/30 py-2 text-[0.7875rem] font-semibold text-white/80 transition hover:border-white/50 hover:text-white sm:flex sm:px-4'
