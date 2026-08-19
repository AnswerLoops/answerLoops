import crypto from 'crypto'

// al_live_ + 32 random bytes (hex) — long enough to be unguessable, short
// enough to paste into a config file. Only the SHA-256 hash is ever stored;
// the plaintext is shown once at creation and cannot be recovered.
const KEY_PREFIX = 'al_live_'
const DISPLAY_PREFIX_LEN = 16 // "al_live_" + 8 hex chars, enough to tell keys apart in a list

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const secret = crypto.randomBytes(32).toString('hex')
  const key = `${KEY_PREFIX}${secret}`
  return { key, hash: hashApiKey(key), prefix: key.slice(0, DISPLAY_PREFIX_LEN) }
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

export function isValidApiKeyFormat(key: string): boolean {
  return key.startsWith(KEY_PREFIX) && key.length === KEY_PREFIX.length + 64
}
