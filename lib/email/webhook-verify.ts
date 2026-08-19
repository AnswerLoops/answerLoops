import { createHmac, timingSafeEqual } from 'node:crypto'

// Resend delivers webhooks through Svix. Signature scheme:
//   headers: svix-id, svix-timestamp, svix-signature ("v1,<base64> v1,<base64> ...")
//   secret:  "whsec_" + base64(key)
//   signed content: `${svixId}.${svixTimestamp}.${rawBody}`
//   expected: base64(HMAC-SHA256(key, signedContent))
// Verified with a constant-time comparison against every v1 candidate, plus a
// timestamp tolerance window to reject replays.

const TOLERANCE_SECONDS = 5 * 60

export function verifyResendWebhook(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string,
  nowMs: number = Date.now()
): boolean {
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature) return false

  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return false
  if (Math.abs(nowMs / 1000 - ts) > TOLERANCE_SECONDS) return false

  let key: Buffer
  try {
    key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  } catch {
    return false
  }
  if (key.length === 0) return false

  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest()

  // svix-signature may carry multiple space-separated candidates ("v1,sig v1,sig")
  for (const candidate of signature.split(' ')) {
    const [version, sig] = candidate.split(',')
    if (version !== 'v1' || !sig) continue
    let provided: Buffer
    try {
      provided = Buffer.from(sig, 'base64')
    } catch {
      continue
    }
    if (provided.length === expected.length && timingSafeEqual(provided, expected)) {
      return true
    }
  }
  return false
}
