import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifyResendWebhook } from '../../lib/email/webhook-verify'

const SECRET = `whsec_${Buffer.from('a-test-signing-key-32-bytes-long').toString('base64')}`

function sign(id: string, timestamp: string, body: string, secret: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const sig = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')
  return `v1,${sig}`
}

describe('verifyResendWebhook', () => {
  const body = '{"type":"email.received","data":{}}'
  const id = 'msg_123'
  const nowMs = 1_700_000_000_000
  const timestamp = String(Math.floor(nowMs / 1000))

  it('accepts a correctly signed payload within the tolerance window', () => {
    const signature = sign(id, timestamp, body, SECRET)
    expect(verifyResendWebhook(body, { id, timestamp, signature }, SECRET, nowMs)).toBe(true)
  })

  it('rejects a tampered body', () => {
    const signature = sign(id, timestamp, body, SECRET)
    expect(verifyResendWebhook(body + 'tampered', { id, timestamp, signature }, SECRET, nowMs)).toBe(false)
  })

  it('rejects the wrong secret', () => {
    const signature = sign(id, timestamp, body, SECRET)
    expect(verifyResendWebhook(body, { id, timestamp, signature }, 'whsec_' + Buffer.from('wrong-key-wrong-key-wrong-key-32').toString('base64'), nowMs)).toBe(false)
  })

  it('rejects a timestamp outside the tolerance window (replay protection)', () => {
    const staleTimestamp = String(Math.floor(nowMs / 1000) - 3600)
    const signature = sign(id, staleTimestamp, body, SECRET)
    expect(verifyResendWebhook(body, { id, timestamp: staleTimestamp, signature }, SECRET, nowMs)).toBe(false)
  })

  it('rejects when any header is missing', () => {
    const signature = sign(id, timestamp, body, SECRET)
    expect(verifyResendWebhook(body, { id: null, timestamp, signature }, SECRET, nowMs)).toBe(false)
    expect(verifyResendWebhook(body, { id, timestamp: null, signature }, SECRET, nowMs)).toBe(false)
    expect(verifyResendWebhook(body, { id, timestamp, signature: null }, SECRET, nowMs)).toBe(false)
  })

  it('accepts a valid candidate among multiple space-separated signatures', () => {
    const goodSig = sign(id, timestamp, body, SECRET)
    const signature = `v1,bm90dGhlcmVhbHNpZw== ${goodSig}`
    expect(verifyResendWebhook(body, { id, timestamp, signature }, SECRET, nowMs)).toBe(true)
  })

  it('rejects a malformed secret without throwing', () => {
    const signature = sign(id, timestamp, body, SECRET)
    expect(() =>
      verifyResendWebhook(body, { id, timestamp, signature }, 'not-base64-!!!', nowMs)
    ).not.toThrow()
  })
})
