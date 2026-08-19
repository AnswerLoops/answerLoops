import { OAuth2Client } from 'google-auth-library'
import { logger } from '@/lib/logger'

const MOD = 'google-chat/verify'

// Every event Google Chat sends to our HTTP endpoint carries a signed OIDC
// ID token in the Authorization header. For an endpoint-URL Chat app the
// token's audience is the endpoint URL itself, and the token is issued by
// chat@system.gserviceaccount.com — verifying both closes the door on a
// forged request claiming to be Google. See:
// https://developers.google.com/workspace/chat/receive-respond-interactions
const CHAT_ISSUER_EMAIL = 'chat@system.gserviceaccount.com'

const client = new OAuth2Client()

/**
 * Verifies a Google Chat request's bearer token. `audience` must be the
 * exact public HTTPS endpoint URL configured in the Chat app's connection
 * settings (GOOGLE_CHAT_ENDPOINT_URL) — Google signs the token's `aud`
 * claim to that value specifically, not just any URL on our domain.
 */
export async function verifyGoogleChatRequest(
  authorizationHeader: string | null,
  audience: string
): Promise<boolean> {
  if (!authorizationHeader?.startsWith('Bearer ')) return false
  const token = authorizationHeader.slice('Bearer '.length)

  try {
    const ticket = await client.verifyIdToken({ idToken: token, audience })
    const payload = ticket.getPayload()
    if (!payload) return false
    return payload.email === CHAT_ISSUER_EMAIL && payload.email_verified === true
  } catch (err) {
    logger.warn('Google Chat token verification failed', { module: MOD, error: err })
    return false
  }
}
