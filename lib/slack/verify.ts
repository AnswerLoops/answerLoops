import crypto from 'crypto'

const SLACK_VERSION = 'v0'
// Reject requests with a timestamp older than 5 minutes (replay protection).
const MAX_AGE_SECONDS = 5 * 60

/**
 * Verify the X-Slack-Signature header against the request body.
 * Returns true when the request is genuine.
 */
export function verifySlackRequest(
  signingSecret: string,
  rawBody: string,
  timestamp: string | null,
  signature: string | null
): boolean {
  if (!timestamp || !signature) return false

  const ts = Number(timestamp)
  if (isNaN(ts)) return false
  if (Math.abs(Date.now() / 1000 - ts) > MAX_AGE_SECONDS) return false

  const sigBase = `${SLACK_VERSION}:${timestamp}:${rawBody}`
  const expected = `${SLACK_VERSION}=` + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBase)
    .digest('hex')

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
