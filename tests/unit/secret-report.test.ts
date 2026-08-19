import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

/**
 * Validates the secret-scan reporter.
 *
 * Two properties matter here, and the second was got wrong first time round.
 *
 * 1. The credential value is never reproduced. The scanner's own table output
 *    includes the match, which is why its JSON is parsed instead of piped
 *    through — a blocked commit must not put the secret into scrollback.
 *
 * 2. Only findings that can actually reach the repository block. The scanner
 *    walks the working tree, which includes `.env` and everything else git
 *    ignores. A credential in a gitignored file is correct placement, not an
 *    incident. Blocking on those makes the hook fire against ordinary local
 *    setup, and a hook that fires constantly gets --no-verify'd — which skips
 *    the disclosure and test stages along with it.
 */

const SCRIPT = path.join(process.cwd(), 'scripts/report-secrets.mjs')

/** Runs the reporter over a synthetic scanner report. Returns exit code + output. */
function run(report: unknown): { code: number; out: string } {
  // spawnSync rather than execFileSync: the reporter writes its findings to
  // stderr, and execFileSync discards stderr on a zero exit — which would hide
  // exactly the non-blocking notice one of these tests asserts on.
  const r = spawnSync('node', [SCRIPT], {
    input: JSON.stringify(report),
    encoding: 'utf-8',
  })
  return { code: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` }
}

const SECRET_VALUE = 'the-actual-credential-value-that-must-never-be-printed'

const finding = (target: string) => ({
  Results: [
    {
      Target: target,
      Secrets: [
        {
          RuleID: 'stripe-secret-token',
          Title: 'Stripe Secret Key',
          Severity: 'CRITICAL',
          StartLine: 42,
          Match: SECRET_VALUE,
        },
      ],
    },
  ],
})

describe('secret reporter — what blocks', () => {
  it('blocks a finding in a tracked file', () => {
    // package.json is tracked, so a credential there is already in the repo.
    const { code, out } = run(finding('package.json'))
    expect(code).toBe(1)
    expect(out).toContain('package.json:42')
    expect(out).toContain('Stripe Secret Key')
  })

  it('does not block a finding in a gitignored, untracked file', () => {
    // .env is where credentials are supposed to live.
    const { code } = run(finding('.env'))
    expect(code).toBe(0)
  })

  it('still reports the gitignored finding rather than hiding it', () => {
    // Silence would make a genuine mistake — the same file force-added — look
    // identical to correct placement.
    const { out } = run(finding('.env'))
    expect(out).toContain('.env')
    expect(out).toMatch(/not blocking/i)
  })

  it('passes a clean report', () => {
    expect(run({ Results: [] }).code).toBe(0)
    expect(run({}).code).toBe(0)
  })

  it('blocks when a tracked and an ignored finding appear together', () => {
    const both = {
      Results: [
        ...finding('.env').Results,
        ...finding('lib/db/schema.ts').Results,
      ],
    }
    expect(run(both).code).toBe(1)
  })
})

describe('secret reporter — what it prints', () => {
  it('never reproduces the credential value', () => {
    for (const target of ['package.json', '.env']) {
      expect(run(finding(target)).out).not.toContain(SECRET_VALUE)
    }
  })

  it('reports type, file and line so the finding is actionable', () => {
    const { out } = run(finding('package.json'))
    expect(out).toContain('stripe-secret-token')
    expect(out).toContain('CRITICAL')
    expect(out).toContain(':42')
  })

  it('treats unparseable scanner output as clean rather than blocking', () => {
    // A plumbing failure must not look like a finding — the reverse of the bug
    // where an initialisation error was reported as a CRITICAL vulnerability.
    const r = spawnSync('node', [SCRIPT], { input: 'not json at all', encoding: 'utf-8' })
    expect(r.status).toBe(0)
  })
})
