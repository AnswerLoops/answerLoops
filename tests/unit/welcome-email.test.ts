import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * The welcome email is sent from the sign-in path, which makes one property
 * more important than anything the message says: it cannot fail a signup.
 *
 * A provider outage turning into a failed sign-in would leave somebody holding
 * an account they cannot get into, over a courtesy email. So the send is
 * guarded, swallowed, and logged — and these tests invoke the real function
 * against a mocked provider rather than asserting on source text, because
 * "does not throw" is a behaviour and not a shape.
 */

const send = vi.fn()

vi.mock('resend', () => ({
  Resend: class {
    emails = { send }
  },
}))

// send.ts pulls these in at module scope; neither is exercised here.
vi.mock('@/lib/db/queries/members', () => ({ getOrgMembers: vi.fn(async () => []) }))
vi.mock('@/lib/mock-mode', () => ({ MOCK_EXTERNALS: false }))

const ORIGINAL_KEY = process.env.RESEND_API_KEY

async function subject() {
  const mod = await import('@/lib/email/send')
  return mod
}

beforeEach(() => {
  send.mockReset()
  send.mockResolvedValue({ data: { id: 'email_1' }, error: null })
  process.env.RESEND_API_KEY = 'test-key'
  vi.resetModules()
})

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.RESEND_API_KEY
  else process.env.RESEND_API_KEY = ORIGINAL_KEY
})

describe('sendWelcomeEmail — never breaks a signup', () => {
  it('resolves rather than throwing when the provider rejects', async () => {
    send.mockRejectedValue(new Error('provider is down'))
    const { sendWelcomeEmail } = await subject()
    await expect(sendWelcomeEmail('new@example.com', 'Ada')).resolves.toBeUndefined()
  })

  it('sends nothing when no API key is configured', async () => {
    delete process.env.RESEND_API_KEY
    const { sendWelcomeEmail } = await subject()
    await sendWelcomeEmail('new@example.com', 'Ada')
    expect(send).not.toHaveBeenCalled()
  })
})

describe('sendWelcomeEmail — what it sends', () => {
  it('goes to the address that just signed up', async () => {
    const { sendWelcomeEmail } = await subject()
    await sendWelcomeEmail('new@example.com', 'Ada Lovelace')
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0].to).toEqual(['new@example.com'])
  })

  it('points at support for questions, in the body and as the reply address', async () => {
    const { sendWelcomeEmail, SUPPORT_EMAIL } = await subject()
    await sendWelcomeEmail('new@example.com', 'Ada')
    const payload = send.mock.calls[0][0]
    expect(SUPPORT_EMAIL).toBe('support@answerloops.com')
    expect(payload.replyTo).toBe(SUPPORT_EMAIL)
    expect(payload.html).toContain(SUPPORT_EMAIL)
  })

  it('thanks them by first name', async () => {
    const { sendWelcomeEmail } = await subject()
    await sendWelcomeEmail('new@example.com', 'Ada Lovelace')
    expect(send.mock.calls[0][0].html).toContain('Welcome, Ada.')
  })

  it('greets without a name rather than printing an empty one', async () => {
    const { sendWelcomeEmail } = await subject()
    for (const name of [null, '', '   ']) {
      send.mockClear()
      await sendWelcomeEmail('new@example.com', name)
      const html = send.mock.calls[0][0].html
      expect(html).toContain('Welcome.')
      expect(html).not.toMatch(/Welcome,\s*\./)
    }
  })
})

describe('the sign-in path only welcomes new workspaces', () => {
  it('calls the send after creating the org, not on the returning-user branch', async () => {
    // provisionUser returns early for anyone with an existing membership. This
    // pins that the call sits below that return, so a returning user is not
    // welcomed again on every sign-in.
    const fs = await import('node:fs')
    const src = fs.readFileSync('auth.ts', 'utf-8')
    const returningBranch = src.indexOf('return { userId: user.id, orgId: existing.orgId }')
    const welcomeCall = src.indexOf('sendWelcomeEmail(email, name)')
    expect(returningBranch).toBeGreaterThan(-1)
    expect(welcomeCall).toBeGreaterThan(returningBranch)
  })
})
