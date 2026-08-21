import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db/drizzle'
import { users, memberships, orgs } from '@/lib/db/schema'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'
import { resolveOrgIdForSessionUpdate, resolveOrgAccess } from '@/lib/auth/membership'
import { orgHasProductAccess, isAccessExempt } from '@/lib/billing/access'
import { sendWelcomeEmail } from '@/lib/email/send'

const PUBLIC_PATHS = ['/', '/login', '/api/auth', '/api/ingest', '/api/feedback', '/api/slack', '/api/widget', '/widget', '/api/billing/webhook', '/api/waitlist', '/api/health', '/api/github/webhook', '/api/email/ingest', '/api/mcp', '/api/agent', '/api/google-chat', '/vs', '/pricing', '/docs', '/privacy', '/robots.txt', '/sitemap.xml', '/llms.txt']
const ONBOARDING_PATH = '/onboarding'
const ACCOUNT_DELETED_PATH = '/account-deleted'
const START_TRIAL_PATH = '/start-trial'
function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function getAllowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
}

function isEmailAllowed(email: string): boolean {
  const allowed = getAllowedEmails()
  if (allowed.length === 0) return true
  return allowed.includes(email.toLowerCase())
}

async function provisionUser(
  email: string,
  name: string | null,
  image: string | null,
  provider: string
): Promise<{ userId: number; orgId: number }> {
  const db = getDb()

  // Upsert user
  await db
    .insert(users)
    .values({ email, name, image, provider })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: name ?? undefined,
        image: image ?? undefined,
      },
    })

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)

  // Returning user: find existing membership
  const [existing] = await db
    .select({ orgId: memberships.orgId })
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(1)

  if (existing) {
    return { userId: user.id, orgId: existing.orgId }
  }

  // New user: create a fresh org workspace
  const [newOrg] = await db
    .insert(orgs)
    .values({ name: 'My Workspace', slug: `org-${user.id}-${Date.now()}` })
    .returning({ id: orgs.id })

  await db
    .insert(memberships)
    .values({ userId: user.id, orgId: newOrg.id, role: 'owner' })
    .onConflictDoNothing()

  // Only new workspaces reach here — a returning user returns above, at the
  // existing-membership branch — so this sends exactly once per signup.
  //
  // Not awaited for its result and unable to throw: a mail provider having a
  // bad minute must not turn into a failed sign-in, which would leave someone
  // holding an account they cannot get into. sendWelcomeEmail swallows and logs
  // its own errors; the catch here is belt and braces for anything thrown
  // before it gets that far.
  try {
    await sendWelcomeEmail(email, name)
  } catch {
    // deliberately ignored — provisioning has already succeeded
  }

  return { userId: user.id, orgId: newOrg.id }
}

// Cloud runs the dashboard at app.answerloops.com alongside the marketing
// site's root domain (a Railway custom-domain plan cap means they share one
// service rather than each getting its own — see next.config.ts). A session
// cookie is host-only by default, so a user signed in on the root domain
// would appear logged out the moment a link sent them to the app subdomain.
// AUTH_COOKIE_DOMAIN shares the cookie across every subdomain of the apex;
// self-hosted deployments never set it, so their cookie stays host-only.
const cookieDomain = process.env.AUTH_COOKIE_DOMAIN
const useSecureCookies = process.env.NODE_ENV === 'production'

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  providers: [
    Google,
  ],

  pages: {
    signIn: '/login',
    error: '/login',
  },

  // Without this, Auth.js always completes the OAuth flow on the fixed
  // AUTH_URL host, so a login started from app.answerloops.com would still
  // land back on the root marketing domain after Google's redirect — no
  // per-route link fix can work around that, since it happens at the auth
  // layer before routing is even involved. Scoped to the same cookieDomain
  // signal as above: only cloud's multi-subdomain setup needs Auth.js to
  // trust the request's Host header: instead of a single fixed origin;
  // self-hosted single-domain deployments keep trusting only their explicit
  // AUTH_URL, unchanged. Safe here because both domains sit behind
  // Cloudflare/Railway, which set the forwarded-host header from the actual
  // edge request rather than passing through anything client-supplied.
  ...(cookieDomain && { trustHost: true }),

  // Deliberately not Auth.js's default cookie name — this cookie's Domain
  // is broader than what browsers already held under that default name, so
  // reusing it risked ambiguous session resolution. See the internal
  // security page for details. Renaming forces every browser to establish a
  // fresh session under this cookie once, which is expected and safe.
  ...(cookieDomain && {
    cookies: {
      sessionToken: {
        name: useSecureCookies ? '__Secure-authjs.apex-session-token' : 'authjs.apex-session-token',
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: useSecureCookies,
          domain: cookieDomain,
        },
      },
    },
  }),

  callbacks: {
    async signIn({ user }) {
      const email = user.email ?? ''
      return isEmailAllowed(email)
    },

    async authorized({ request, auth: session }) {
      const { pathname, search } = request.nextUrl

      if (isPublic(pathname)) return true

      if (!session?.user) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const loginUrl = new URL('/login', request.nextUrl)
        // Path *and* query. The query is often the whole point of the link:
        // `/checkout?plan=pro` returning as a bare `/checkout` silently drops
        // the plan and lands the visitor on the default one instead — a
        // downgrade they never chose and would only notice on the invoice.
        // Same for any other deep link whose parameters carry the intent.
        //
        // Relative by construction: both halves are read off this request's
        // own URL, never from anything a caller supplies, and the consumer in
        // app/actions/auth.ts accepts only a value beginning with a single
        // slash. searchParams.set handles the encoding.
        loginUrl.searchParams.set('callbackUrl', `${pathname}${search}`)
        return NextResponse.redirect(loginUrl)
      }

      // Org state and membership are both resolved live here rather than read
      // from the token. `onboarded` only ever flips false→true and is safe to
      // cache in the session, but the two things that *revoke* access — the org
      // being soft-deleted, and the user's membership being removed — cannot
      // reach a JWT that was already issued, so a cached answer would keep
      // granting access after the fact. The account-deleted page itself is
      // exempt so a deleted org's owner can still reach the restore action.
      // See lib/auth/membership.ts for the check itself.
      if (pathname !== ACCOUNT_DELETED_PATH) {
        const sessionOrgId = (session as { orgId?: number }).orgId
        const access = await resolveOrgAccess(session.user?.id, sessionOrgId)

        // A session that can't be scoped to an org the user still belongs to is
        // ended rather than downgraded. Signing out is the same response this
        // already gave a session naming an org that no longer exists, and it
        // avoids leaving someone in a half-working state where the UI loads but
        // every query is empty.
        if (
          access.status === 'invalid-session' ||
          access.status === 'org-missing' ||
          access.status === 'not-member'
        ) {
          return NextResponse.redirect(new URL('/api/auth/signout?callbackUrl=/login', request.nextUrl))
        }

        if (access.status === 'org-deleted') {
          if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'This account has been deleted' }, { status: 403 })
          }
          return NextResponse.redirect(new URL(ACCOUNT_DELETED_PATH, request.nextUrl))
        }

        // Checked before onboarding on purpose. A trial requires a card up
        // front, so authenticating is not the same as having started one —
        // someone who signs in and abandons checkout has an account and
        // nothing else, and must not reach the product. Onboarding counts as
        // the product: it connects real channels and seeds a real knowledge
        // base.
        //
        // Anyone without access is sent to /start-trial, which either resumes
        // checkout for a chosen plan or returns them to the pricing page. See
        // lib/billing/access.ts for why each exempt path is exempt.
        if (!isAccessExempt(pathname)) {
          const hasAccess = await orgHasProductAccess(sessionOrgId as number)
          if (!hasAccess) {
            if (pathname.startsWith('/api/')) {
              return NextResponse.json({ error: 'No active subscription' }, { status: 402 })
            }
            return NextResponse.redirect(new URL(START_TRIAL_PATH, request.nextUrl))
          }
        }

        // Every access-exempt path must also be onboarding-exempt, or the two
        // checks fight each other. /start-trial is access-exempt (the whole point of
        // the gate is to send an unsubscribed user there) but was not
        // onboarding-exempt, so a brand-new account — unsubscribed and
        // unonboarded, which is every brand-new account — got redirected
        // /start-trial → /onboarding (not onboarded) → /start-trial (still no
        // subscription) forever. Onboarding requires access the same as
        // everything else in the product; a path that is exempt from needing
        // access cannot also demand onboarding, which itself requires access.
        if (
          pathname !== ONBOARDING_PATH &&
          !isAccessExempt(pathname) &&
          !pathname.startsWith('/api/') &&
          !(session as { onboarded?: boolean }).onboarded &&
          !access.onboardedAt
        ) {
          return NextResponse.redirect(new URL(ONBOARDING_PATH, request.nextUrl))
        }
      }

      return true
    },

    async jwt({ token, user, account, trigger, session: updateData }) {
      if (trigger === 'update' && updateData) {
        const data = updateData as { orgId?: number; onboarded?: boolean }
        // updateData is caller-supplied, and this claim scopes every org query
        // in the app, so a requested org is only adopted when the user has a
        // real membership row for it — the same source of truth
        // requireOrgAccess uses. A rejected switch leaves the existing claim in
        // place rather than erroring: it should be a no-op, not a way to break
        // a valid session.
        const allowedOrgId = await resolveOrgIdForSessionUpdate(token.userId, data.orgId)
        if (allowedOrgId !== null) token.orgId = allowedOrgId
        if (data.onboarded) token.onboarded = true
      }
      if (user?.email && account) {
        const { userId, orgId } = await provisionUser(
          user.email,
          user.name ?? null,
          user.image ?? null,
          account.provider
        )
        token.userId = String(userId)
        token.orgId = orgId

        // Stamp onboarded into the JWT so returning users never hit /onboarding again
        const [org] = await getDb()
          .select({ onboardedAt: orgs.onboardedAt })
          .from(orgs)
          .where(eq(orgs.id, orgId))
          .limit(1)
        if (org?.onboardedAt) token.onboarded = true
      }
      return token
    },

    session({ session, token }) {
      session.orgId = (token.orgId as number | undefined) ?? DEFAULT_ORG_ID
      session.onboarded = token.onboarded === true
      if (session.user) {
        session.user.id = token.userId as string ?? token.sub ?? ''
      }
      return session
    },
  },
})
