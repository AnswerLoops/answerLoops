import Link from 'next/link'
import { LogoMark } from '@/components/logo'
import { MobileDrawer } from '@/components/ui/mobile-drawer'

// Re-exported so the many marketing pages that already import it from here keep
// working, while lib/site.ts stays the single definition.
export { GITHUB_URL } from '@/lib/site'
import { GITHUB_URL } from '@/lib/site'

export const GithubIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.744 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
)

export function NavWordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={30} />
      <span className="text-lg font-semibold tracking-tight">
        <span className="text-white">answer</span>
        <span className="bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent">Loops</span>
      </span>
    </span>
  )
}

// Nav-only sizing: +5% on top of the site-wide +5% (app/globals.css html
// font-size: 105%), so the nav reads ~10% larger than the original baseline
// while the rest of the site stays at the single +5% bump. Kept local to
// Nav rather than added to the shared NavWordmark, which the Footer also
// uses — Footer wasn't asked for and shouldn't inherit this.
// Points marketing-site CTAs at the dedicated app subdomain when one's
// configured (cloud); self-hosted deployments never set this and keep the
// relative link, since there's only ever one domain to begin with.
const CTA_CLASS =
  'flex items-center gap-1.5 whitespace-nowrap rounded-full border border-blue-300/20 bg-gradient-to-r from-blue-600 to-blue-500 px-3 py-2 text-[0.7875rem] font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110 sm:px-4'

// The quieter half of the anonymous pair. A returning user and a new one want
// opposite things from the same header, and one button cannot serve both: a
// lone "Create account" makes the returning user hunt for a way in, while a
// lone "Sign in" hides the trial from everyone else. Two buttons, weighted —
// filled for the action the business wants, outlined for the one a returning
// user is already looking for.
//
// Hidden below sm for the same reason the header nav is: the drawer carries
// both, and three controls do not fit beside the wordmark on a narrow phone.
const SECONDARY_CTA_CLASS =
  'hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-white/30 py-2 text-[0.7875rem] font-semibold text-white/80 transition hover:border-white/50 hover:text-white sm:flex sm:px-4'

// Returning users land on the sign-in copy rather than "Create your account".
// Google is the only provider, so both modes run the same OAuth flow — what
// differs is what the page claims to be, and telling someone with an account
// to create one invites them to wonder whether they are making a second.
const SIGNIN_HREF = '/login?mode=signin'

const DASHBOARD_HREF = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard` : '/dashboard'

// Deep link to the plan cards, not to /pricing itself: a header button whose
// only effect is re-rendering the page the visitor is already on reads as
// broken, and choosing a plan is the action they are actually here for.
export const PLANS_HREF = '/pricing#plans'

// Every "start" action in the marketing site lands here, and /checkout is where
// authenticating leaves you. Choosing a plan is not the commitment it looks
// like — the trial is free and the plan is switchable on that same screen — so
// making it a gate before signing up spends the visitor's attention on the
// cheapest decision they will make. Sign in first, choose on the way through.
const START_HREF = '/login'

// A signed-in visitor with no plan is already past auth, so the same journey
// resumes one step further along: straight to the combined plan-and-card page.
const CHECKOUT_HREF = '/checkout'

/**
 * What the header CTA should offer.
 *
 * Signing in and being able to use the product are different things now that
 * access is scoped to a subscription. A header that knows only the first sends
 * someone who has signed in but not chosen a plan to a dashboard the access
 * gate immediately bounces back to this page — a loop with no indication of
 * what went wrong or what to do about it.
 */
export type NavState = 'anonymous' | 'no-plan' | 'active'

export function navState(loggedIn: boolean, hasAccess: boolean): NavState {
  if (!loggedIn) return 'anonymous'
  return hasAccess ? 'active' : 'no-plan'
}

export function Nav({ state }: { state: NavState }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-[#030611]/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8">
        {/* Gaps tighten at md and relax again at lg. md is where the desktop
            nav appears while the header still has the least room for it, and
            the row is at its most crowded there — every item is nowrap, so
            without this the nav is the only thing that can give, and it gives
            by wrapping a link onto a second line. */}
        <div className="flex items-center gap-6 lg:gap-9">
          <Link href="/">
            <span className="flex items-center gap-2.5">
              <LogoMark size={32} />
              {/* The wordmark does not wrap or truncate, so on the narrowest
                  phones it ran underneath the CTA button. Below ~394px there is
                  not room for mark + wordmark + CTA + menu, and the mark alone
                  still identifies the site. */}
              <span className="hidden text-[1.18125rem] font-semibold tracking-tight min-[394px]:inline">
                <span className="text-white">answer</span>
                <span className="bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent">Loops</span>
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-5 md:flex lg:gap-7">
            <Link href="/#features" className="whitespace-nowrap text-[0.7875rem] font-medium text-white/45 transition-colors hover:text-white">Product</Link>
            <Link href="/#how-it-works" className="whitespace-nowrap text-[0.7875rem] font-medium text-white/45 transition-colors hover:text-white">How it works</Link>
            <Link href="/pricing" className="whitespace-nowrap text-[0.7875rem] font-medium text-white/45 transition-colors hover:text-white">Pricing</Link>
            <a href="/docs" target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-[0.7875rem] font-medium text-white/45 transition-colors hover:text-white">Docs</a>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {state === 'active' && (
            <Link href={DASHBOARD_HREF} className={CTA_CLASS}>
              Go to dashboard →
            </Link>
          )}
          {/* Signed in without a plan. Pointing at the dashboard here is what
              produced a loop: the gate sends them back to /pricing, and the
              header offers the same door again.

              The label names the one thing left to do, and the link lands on
              the plan cards rather than the top of the page — so the button
              still moves them forward when they are already reading /pricing,
              which is exactly where the gate puts them. */}
          {state === 'no-plan' && (
            <Link href={CHECKOUT_HREF} className={CTA_CLASS}>
              Choose a plan →
            </Link>
          )}
          {/* Anonymous covers both a brand-new visitor and a returning one whose
              session expired, and there is no way to tell them apart before
              they authenticate — so serve both rather than guessing. The trial
              is the primary action and keeps the filled treatment; sign-in sits
              beside it, quieter, where a returning user expects to find it.

              Both point at auth. The plan is chosen after signing in, on the
              same screen that takes the card, because a free trial makes the
              plan a small decision and putting it first spends attention
              before anyone is invested. */}
          {state === 'anonymous' && (
            <>
              <Link href={SIGNIN_HREF} className={SECONDARY_CTA_CLASS}>
                Sign in
              </Link>
              <Link href={START_HREF} className={CTA_CLASS}>
                Start free trial
              </Link>
            </>
          )}
          <MobileDrawer triggerLabel="Open navigation" triggerClassName="md:hidden">
            <nav className="flex flex-col p-4 gap-1">
              <Link href="/#features" className="rounded-lg px-3 py-2.5 text-[0.91875rem] font-medium text-ink-600 hover:bg-gray-100">Features</Link>
              <Link href="/#how-it-works" className="rounded-lg px-3 py-2.5 text-[0.91875rem] font-medium text-ink-600 hover:bg-gray-100">How it works</Link>
              <Link href="/pricing" className="rounded-lg px-3 py-2.5 text-[0.91875rem] font-medium text-ink-600 hover:bg-gray-100">Pricing</Link>
              <a href="/docs" target="_blank" rel="noopener noreferrer" className="rounded-lg px-3 py-2.5 text-[0.91875rem] font-medium text-ink-600 hover:bg-gray-100">Docs</a>
              {/* Both halves of the anonymous pair, since the header hides them
                  below sm — without these the drawer is the only navigation on
                  a phone and offers no way to sign in at all. */}
              {state === 'anonymous' && (
                <>
                  <Link href={SIGNIN_HREF} className="rounded-lg px-3 py-3 text-[0.91875rem] font-medium text-ink-600 hover:bg-gray-100">Sign in</Link>
                  {/* Filled, like its counterpart in the header. The drawer is
                      the only navigation a phone gets, so the weighting between
                      these two has to survive the move — a blue text link next
                      to a grey one reads as two equal options rather than a
                      primary action and its alternative. */}
                  <Link href={START_HREF} className="mt-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-3 py-3 text-center text-[0.91875rem] font-semibold text-white shadow-sm">Start free trial</Link>
                </>
              )}
            </nav>
          </MobileDrawer>
        </div>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-white/8 bg-[#030611] text-white">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          <div>
            <div className="mb-4"><NavWordmark /></div>
            <p className="max-w-xs text-xs leading-relaxed text-white/50">Confidence-gated AI support for developer communities. Open source and self-hostable.</p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-white/50">
              <GithubIcon className="h-3 w-3" />
              <Link href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white/85">Open source — view source</Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-12 gap-y-6">
            <div>
              <div className="mb-3 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-white/60">Product</div>
              <div className="flex flex-col gap-2">
                <Link href="/#features" className="text-xs text-white/50 transition-colors hover:text-white/85">Features</Link>
                <Link href="/#how-it-works" className="text-xs text-white/50 transition-colors hover:text-white/85">How it works</Link>
                <Link href="/pricing" className="text-xs text-white/50 transition-colors hover:text-white/85">Pricing</Link>
              </div>
            </div>
            <div>
              <div className="mb-3 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-white/60">Compare</div>
              <div className="flex flex-col gap-2">
                <Link href="/vs/chatbase" className="text-xs text-white/50 transition-colors hover:text-white/85">vs Chatbase</Link>
                <Link href="/vs/intercom" className="text-xs text-white/50 transition-colors hover:text-white/85">vs Intercom</Link>
              </div>
            </div>
            <div>
              <div className="mb-3 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-white/60">Open source</div>
              <div className="flex flex-col gap-2">
                <Link href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-white/50 transition-colors hover:text-white/85">GitHub</Link>
                <Link href="/docs" target="_blank" rel="noopener noreferrer" className="text-xs text-white/50 transition-colors hover:text-white/85">Docs</Link>
                <Link href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer" className="text-xs text-white/50 transition-colors hover:text-white/85">Issues</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/8 pt-6 sm:flex-row">
          <p className="text-[0.625rem] text-white/40">© 2026 AnswerLoops. Open source.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-[0.625rem] text-white/40 transition-colors hover:text-white/70">Privacy Policy</Link>
            <p className="text-[0.625rem] text-white/40">Built in public · Self-hostable</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
