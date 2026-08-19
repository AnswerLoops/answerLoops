import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// Bug (GitHub issue #183): a maintainer filing an issue against their own
// connected repo (e.g. a z-index bug in our own dashboard) got ingested as a
// support ticket — full AI triage, staff queue entry, notification email —
// even though it's work tracking, not a customer asking for help. The
// webhook only ever filtered by author *type* (bot vs. not); it never looked
// at author *membership*.
// Fix: skip issues/comments/discussions authored by anyone with write access
// or org membership (author_association OWNER/MEMBER/COLLABORATOR) in all
// four ticket-ingest branches, using the association GitHub already includes
// on the webhook payload — no extra API call needed.
//
// Source-file structural assertion — vitest cannot POST a real GitHub
// webhook payload through Next.js route handling here. Same convention as
// github-webhook-bot-filter.test.ts.

const ROOT = process.cwd()

function read(relPath: string): string {
  const absPath = path.join(ROOT, relPath)
  expect(fs.existsSync(absPath), `File not found: ${relPath}`).toBe(true)
  return fs.readFileSync(absPath, 'utf-8')
}

describe('app/api/github/webhook/route.ts — maintainer-authored content is never ticketed', () => {
  const src = read('app/api/github/webhook/route.ts')

  it('defines a maintainer-association allowlist covering OWNER, MEMBER, and COLLABORATOR', () => {
    expect(src).toMatch(/MAINTAINER_ASSOCIATIONS\s*=\s*new Set\(/)
    expect(src).toMatch(/'OWNER'/)
    expect(src).toMatch(/'MEMBER'/)
    expect(src).toMatch(/'COLLABORATOR'/)
  })

  it('checks isMaintainerAuthored on all four ticket-ingest branches: issue opened, issue comment, discussion created, discussion comment', () => {
    const matches = src.match(/isMaintainerAuthored\(/g) ?? []
    // 1 definition + 4 call sites
    expect(matches.length).toBe(5)
  })

  it('bails out before calling handleTicket for each branch, not after, and after the bot check', () => {
    for (const branchStart of [
      "if (event === 'issues' && (action === 'opened' || action === 'reopened')) {",
      "} else if (event === 'issue_comment' && action === 'created') {",
      "} else if (event === 'discussion' && action === 'created') {",
      "} else if (event === 'discussion_comment' && action === 'created') {",
    ]) {
      const branchIdx = src.indexOf(branchStart)
      expect(branchIdx, `branch not found: ${branchStart}`).toBeGreaterThan(-1)
      const botCheckIdx = src.indexOf(".user.type === 'Bot'", branchIdx)
      const maintainerCheckIdx = src.indexOf('isMaintainerAuthored(', branchIdx)
      const handleTicketIdx = src.indexOf('await handleTicket(', branchIdx)
      expect(maintainerCheckIdx, `no maintainer check in branch: ${branchStart}`).toBeGreaterThan(botCheckIdx)
      expect(maintainerCheckIdx).toBeLessThan(handleTicketIdx)
    }
  })

  it('the maintainer check returns ok without processing, matching the existing early-return pattern', () => {
    const idx = src.indexOf('if (isMaintainerAuthored(issue.author_association)) return NextResponse.json({ ok: true })')
    expect(idx).toBeGreaterThan(-1)
  })
})
