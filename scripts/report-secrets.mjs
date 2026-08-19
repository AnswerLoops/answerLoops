#!/usr/bin/env node
/**
 * Reports Trivy secret findings without reproducing the credential.
 *
 * AGENTS.md is explicit: never print, quote, log or summarise a detected
 * secret — report only the type, the file and the line. Trivy's table output
 * includes the matched string, so piping it straight to the terminal puts the
 * credential into scrollback, into any terminal-sharing session, and into
 * whatever captures CI logs. The finding is what matters; the value is never
 * needed to act on it.
 *
 * Reads `trivy fs --scanners secret -f json` on stdin. Exits 1 if any secret
 * was found, 0 if clean, so the caller can use it directly as a gate.
 */

import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

let raw = ''
try {
  raw = fs.readFileSync(0, 'utf-8')
} catch {
  // Nothing on stdin. Treat as clean rather than blocking a commit on a
  // plumbing failure — the exit code from trivy itself still applies upstream.
  process.exit(0)
}

let report
try {
  report = JSON.parse(raw)
} catch {
  console.error('⚠️  Could not parse the secret scanner output. Treating as clean.')
  console.error('   Run `trivy fs --scanners secret .` by hand to check.')
  process.exit(0)
}

/**
 * The scanner walks the working tree, which includes files git will never
 * receive — `.env` above all. A credential sitting in a gitignored file is
 * correct placement, not an incident, and blocking commits over it would make
 * this hook fire constantly against normal local setup. A hook that cries wolf
 * gets --no-verify'd, and --no-verify skips every other stage with it.
 *
 * So the question is not "is there a credential on disk" but "can this
 * credential reach the repository". Only findings in files git tracks or has
 * staged can, and only those block.
 */
function reachesGit(file) {
  const q = (args) => spawnSync('git', args, { stdio: 'ignore' }).status === 0
  if (q(['ls-files', '--error-unmatch', file])) return true
  const staged = spawnSync('git', ['diff', '--cached', '--name-only', '--', file], {
    encoding: 'utf-8',
  })
  return Boolean((staged.stdout ?? '').trim())
}

const blocking = []
const ignorable = []
for (const result of report.Results ?? []) {
  for (const secret of result.Secrets ?? []) {
    const finding = {
      target: result.Target ?? '(unknown file)',
      line: secret.StartLine ?? '?',
      rule: secret.RuleID ?? 'unknown-rule',
      title: secret.Title ?? secret.Category ?? 'secret',
      severity: secret.Severity ?? 'UNKNOWN',
    }
    ;(reachesGit(finding.target) ? blocking : ignorable).push(finding)
  }
}

// Reported rather than hidden: the scanner saw them, and staying silent would
// make a genuine mistake — the same file force-added — look identical to this.
if (ignorable.length > 0) {
  const where = [...new Set(ignorable.map((f) => f.target))].join(', ')
  console.error(`  ${ignorable.length} credential(s) found in files git does not track (${where}) — not blocking.`)
}

const findings = blocking

if (findings.length === 0) process.exit(0)

console.error('')
console.error('  SECRET DETECTED — COMMIT BLOCKED')
console.error('')
console.error('  The value itself is deliberately not shown. Open the file at the line')
console.error('  below to see it; it is not reproduced here, in scrollback, or in logs.')
console.error('')

for (const f of findings) {
  console.error(`  ${f.target}:${f.line}`)
  console.error(`    ${f.title}  [${f.rule}, ${f.severity}]`)
  console.error('')
}

console.error('  Treat the credential as compromised, whether or not it was pushed:')
console.error('')
console.error('   1. Revoke and regenerate it now, before fixing the file.')
console.error('   2. Remove it from the working tree.')
console.error('   3. If it was already committed, it is in the history — removing the')
console.error('      line is not enough. Rewrite the affected commits.')
console.error('   4. If it was already pushed, rotate first, then force-push with lease.')
console.error('')
console.error('  A rotated credential costs minutes. A leaked one does not.')
console.error('')

process.exit(1)
