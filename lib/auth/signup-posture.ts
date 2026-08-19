import { logger } from '@/lib/logger'
import { getDeploymentMode, stripeConfigured } from '@/lib/billing/plans'

const MOD = 'auth/signup-posture'

/**
 * States, at startup, whether signup is open and whether it leads to a real
 * charge.
 *
 * `ALLOWED_EMAILS` is one variable whose empty value means "anyone may create
 * an account" and whose non-empty value means "almost nobody may". Nothing in
 * the product surfaces which of those is in effect — no banner, no log line,
 * no admin screen — so the only way to know has been to read the environment
 * and the `isEmailAllowed` source together and reason it out. That is a poor
 * way to learn that your front door is open, particularly when a live Stripe
 * key sits behind it and a completed signup becomes a real customer with a
 * real invoice in fourteen days.
 *
 * Logged once at boot rather than exposed anywhere public: it is operational
 * information, and the addresses themselves are not printed.
 */
export function logSignupPosture(): void {
  const raw = process.env.ALLOWED_EMAILS ?? ''
  const allowCount = raw
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean).length

  const mode = getDeploymentMode()
  const open = allowCount === 0

  // Self-hosted has no billing and no waitlist posture worth announcing — the
  // operator is the only user and configured it themselves.
  if (mode === 'self-hosted') {
    logger.info('signup posture: self-hosted', { module: MOD, allowlistEntries: allowCount })
    return
  }

  if (!open) {
    logger.info('signup posture: closed — only allowlisted addresses can create an account', {
      module: MOD,
      allowlistEntries: allowCount,
    })
    return
  }

  // Open signup on a cloud deployment. Loud, because the combination of an
  // empty allowlist and a live Stripe key means the next stranger to find the
  // pricing page can start a trial that bills them for real.
  logger.warn(
    'signup posture: OPEN — ALLOWED_EMAILS is empty, so anyone who reaches the site can create an account',
    {
      module: MOD,
      deploymentMode: mode,
      // Deliberately not logging which mode the key is in beyond configured or
      // not: the value itself must never reach a log, and "configured" is the
      // part that matters for whether a signup becomes a paying customer.
      stripeConfigured: stripeConfigured(),
    },
  )
}
