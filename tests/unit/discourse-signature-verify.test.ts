import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifyDiscourseSignature } from '@/lib/discourse/client'

// Discourse signs every inbound webhook with
// `X-Discourse-Event-Signature: sha256=<hex>` = HMAC-SHA256(rawBody, secret).
// verifyDiscourseSignature is the only thing standing between a forged POST
// and processCommunityMessage running against a real org, so it needs the
// full battery: right key passes, wrong key / tampered body / bad header all
// fail, and a malformed header must return false instead of throwing (a
// crash in the verifier is a 500, not a 401 — it would look like our bug).

const SECRET = 'a-discourse-per-webhook-secret'

function sign(body: string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body, 'utf8').digest('hex')
}

describe('verifyDiscourseSignature', () => {
  const body = '{"post":{"id":42,"topic_id":7,"raw":"a real question about the product"}}'

  it('accepts a correctly signed body', () => {
    expect(verifyDiscourseSignature(body, sign(body, SECRET), SECRET)).toBe(true)
  })

  it('rejects the wrong secret', () => {
    expect(verifyDiscourseSignature(body, sign(body, 'the-wrong-secret'), SECRET)).toBe(false)
  })

  it('rejects a tampered body', () => {
    const sig = sign(body, SECRET)
    expect(verifyDiscourseSignature(body + ' ', sig, SECRET)).toBe(false)
  })

  it('rejects a null / empty header', () => {
    expect(verifyDiscourseSignature(body, null, SECRET)).toBe(false)
    expect(verifyDiscourseSignature(body, '', SECRET)).toBe(false)
  })

  it('rejects when the secret is empty', () => {
    expect(verifyDiscourseSignature(body, sign(body, SECRET), '')).toBe(false)
  })

  it('rejects a malformed / wrong-length header without throwing', () => {
    expect(() => verifyDiscourseSignature(body, 'sha256=deadbeef', SECRET)).not.toThrow()
    expect(verifyDiscourseSignature(body, 'sha256=deadbeef', SECRET)).toBe(false)
    expect(() => verifyDiscourseSignature(body, 'not-a-signature-at-all', SECRET)).not.toThrow()
    expect(verifyDiscourseSignature(body, 'not-a-signature-at-all', SECRET)).toBe(false)
  })
})
