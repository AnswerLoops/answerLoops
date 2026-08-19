import { describe, it, expect } from 'vitest'
import {
  normalizeHeaders,
  detectAutoResponse,
  extractSpamVerdict,
  htmlToText,
  parseMessageIds,
  canonicalMessageId,
  collectThreadIds,
} from '../../lib/email/inbound'

describe('normalizeHeaders', () => {
  it('reads from an array of { name, value } pairs, case-insensitively', () => {
    const headers = normalizeHeaders([{ name: 'X-Spam-Flag', value: 'YES' }])
    expect(headers.get('x-spam-flag')).toBe('YES')
    expect(headers.get('X-SPAM-FLAG')).toBe('YES')
  })

  it('reads from a plain object map', () => {
    const headers = normalizeHeaders({ 'Message-ID': '<abc@x.com>' })
    expect(headers.get('message-id')).toBe('<abc@x.com>')
  })

  it('returns null for missing headers and tolerates garbage input', () => {
    expect(normalizeHeaders(null).get('anything')).toBeNull()
    expect(normalizeHeaders(undefined).get('anything')).toBeNull()
    expect(normalizeHeaders('not an object').get('anything')).toBeNull()
    expect(normalizeHeaders([{ name: 123, value: 'x' }]).get('123')).toBeNull()
  })
})

describe('detectAutoResponse (mail-loop guard)', () => {
  it('flags Auto-Submitted when not "no"', () => {
    const h = normalizeHeaders({ 'Auto-Submitted': 'auto-replied' })
    expect(detectAutoResponse(h, 'a@b.com')).toMatch(/auto-submitted/)
  })

  it('allows Auto-Submitted: no', () => {
    const h = normalizeHeaders({ 'Auto-Submitted': 'no' })
    expect(detectAutoResponse(h, 'a@b.com')).toBeNull()
  })

  it('flags bulk/auto-reply/junk/list precedence', () => {
    for (const value of ['bulk', 'auto_reply', 'auto-reply', 'junk', 'list']) {
      const h = normalizeHeaders({ Precedence: value })
      expect(detectAutoResponse(h, 'a@b.com'), value).toMatch(/precedence/)
    }
  })

  it('flags X-Autoreply / X-Auto-Response-Suppress', () => {
    expect(detectAutoResponse(normalizeHeaders({ 'X-Autoreply': 'yes' }), 'a@b.com')).toMatch(/autoreply/)
    expect(
      detectAutoResponse(normalizeHeaders({ 'X-Auto-Response-Suppress': 'All' }), 'a@b.com')
    ).toMatch(/suppress/)
  })

  it('flags mailing-list headers', () => {
    expect(detectAutoResponse(normalizeHeaders({ 'List-Id': 'foo.list.com' }), 'a@b.com')).toMatch(/mailing-list/)
  })

  it('flags an empty Return-Path (bounce)', () => {
    expect(detectAutoResponse(normalizeHeaders({ 'Return-Path': '<>' }), 'a@b.com')).toMatch(/bounce/)
  })

  it('flags no-reply-style sender addresses', () => {
    expect(detectAutoResponse(normalizeHeaders({}), 'no-reply@vendor.com')).toMatch(/no-reply/)
    expect(detectAutoResponse(normalizeHeaders({}), 'mailer-daemon@vendor.com')).toMatch(/no-reply/)
  })

  it('allows a normal customer email with no loop signals', () => {
    expect(detectAutoResponse(normalizeHeaders({}), 'jane@customer.com')).toBeNull()
  })
})

describe('extractSpamVerdict', () => {
  it('flags X-Spam-Status: Yes', () => {
    const h = normalizeHeaders({ 'X-Spam-Status': 'Yes, score=8.2' })
    expect(extractSpamVerdict(h, {})).toMatch(/x-spam-status/)
  })

  it('flags X-Spam-Flag: YES', () => {
    const h = normalizeHeaders({ 'X-Spam-Flag': 'YES' })
    expect(extractSpamVerdict(h, {})).toBe('x-spam-flag: yes')
  })

  it('flags a numeric spam_score at/above threshold', () => {
    expect(extractSpamVerdict(normalizeHeaders({}), { spam_score: 7 })).toMatch(/spam_score/)
    expect(extractSpamVerdict(normalizeHeaders({}), { spam_score: 2 })).toBeNull()
  })

  it('flags a fail/spam verdict string from the payload', () => {
    expect(extractSpamVerdict(normalizeHeaders({}), { spam_verdict: 'FAIL' })).toMatch(/verdict/)
  })

  it('is fail-open: returns null when no signal is present', () => {
    expect(extractSpamVerdict(normalizeHeaders({}), {})).toBeNull()
  })
})

describe('htmlToText', () => {
  it('converts block tags to newlines and strips the rest', () => {
    const html = '<p>Hello <b>world</b></p><p>Second line</p>'
    expect(htmlToText(html)).toBe('Hello world\nSecond line')
  })

  it('strips style/script blocks entirely', () => {
    const html = '<style>.a{color:red}</style><p>Visible</p><script>evil()</script>'
    expect(htmlToText(html)).toBe('Visible')
  })

  it('decodes common HTML entities', () => {
    expect(htmlToText('<p>Tom &amp; Jerry &lt;3&gt; &quot;fun&quot;</p>')).toBe('Tom & Jerry <3> "fun"')
  })

  it('collapses excessive blank lines', () => {
    const html = '<p>A</p><br><br><br><p>B</p>'
    expect(htmlToText(html)).toBe('A\n\nB')
  })
})

describe('parseMessageIds / canonicalMessageId / collectThreadIds', () => {
  it('parses multiple space-separated angle-bracketed ids', () => {
    expect(parseMessageIds('<a@x.com> <b@y.com>')).toEqual(['<a@x.com>', '<b@y.com>'])
  })

  it('returns an empty array for null/undefined/empty input', () => {
    expect(parseMessageIds(null)).toEqual([])
    expect(parseMessageIds(undefined)).toEqual([])
    expect(parseMessageIds('')).toEqual([])
  })

  it('canonicalizes a bare id to angle-bracketed form and leaves bracketed ids alone', () => {
    expect(canonicalMessageId('abc@x.com')).toBe('<abc@x.com>')
    expect(canonicalMessageId('<abc@x.com>')).toBe('<abc@x.com>')
  })

  it('collects a deduplicated union of In-Reply-To and References ids', () => {
    const ids = collectThreadIds('<a@x.com>', '<a@x.com> <b@y.com>')
    expect(ids).toEqual(['<a@x.com>', '<b@y.com>'])
  })

  it('returns an empty array when both threading headers are absent', () => {
    expect(collectThreadIds(null, null)).toEqual([])
  })
})
