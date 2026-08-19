#!/usr/bin/env node
/**
 * Blocks weakness narration from entering repo-visible surfaces.
 *
 * AGENTS.md is explicit that a public surface may say a security issue was
 * fixed and nothing more — not how it was reachable, not what it would have
 * allowed. In practice that rule is easy to agree with and easy to break, since
 * the natural way to explain a fix is to describe the thing it fixed. Over one
 * working session the same leak happened four times, in a commit message, two
 * PR bodies, a build-plan entry, code comments, a test docblock, and a branch
 * name — each time while actively trying not to.
 *
 * Care during drafting demonstrably does not work, so this runs automatically
 * instead. It reads the *added* lines of the staged diff plus the commit
 * message and branch name, and refuses the commit when it finds phrasing that
 * describes a weakness rather than an invariant.
 *
 * What it cannot do: understand meaning. It matches the vocabulary that
 * characterises this failure, which is narrower than the concept but caught
 * every real instance from that session when tested against them. Treat a hit
 * as "reword this to state what the code guarantees", not as a scold.
 *
 * Escape hatch: `disclosure-ok` on the same line, or in the commit message, for
 * the cases where the wording is genuinely necessary and the file is internal.
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'

export const ALLOW_MARKER = 'disclosure-ok'

/**
 * Files that are supposed to talk about security in these terms. SECURITY.md is
 * a disclosure policy — it has to say "vulnerability" — and the scanning guide
 * documents the tooling. Neither describes a weakness in this product.
 */
export const EXEMPT_FILES = [
  'SECURITY.md',
  'content/docs/self-hosting/security-scanning.mdx',
  // This file only, because it holds the pattern definitions themselves rather
  // than prose. The test file is deliberately NOT exempt: its fixtures carry
  // per-line markers instead, so an added fixture is visible in review rather
  // than silently permitted by a filename.
  'scripts/check-disclosure.mjs',
]

/**
 * Two tiers, because precision matters more than coverage here: a check that
 * cries wolf gets bypassed with --no-verify and then protects nothing.
 *
 * STRONG: phrases that are hard to write innocently about your own codebase.
 * NARRATIVE: past-tense weakness framing — only flagged when it co-occurs with
 * an impact word, since "previously" alone is ordinary prose.
 */
const STRONG = [
  /\battacker\b/i,
  /\bexploitab(le|ility)\b/i,
  /\binsert primitive\b/i,
  /\bvictim (org|account|customer|user)\b/i,
  /\banonymous caller\b/i,
  /\bopen redirect\b/i, // fine in a fix note, but usually paired with the how
  /\bbypass(ed|able)?\s+(the\s+)?(gate|check|limit|guard|auth)/i,
  /\bunauthenticated\s+\w*\s*(500|insert|write|read|access)/i,
  /\bexhaust(ed|ing)?\s+(a|the|their|its)?\s*(victim|org|month|quota|allowance)/i,
  /\bwas (enough|sufficient) to\b/i,
  /\bany(one|body) with a\b.*\b(account|token|link)\b/i,
  /\bgive away the product\b/i,
  /\bhand the product to\b/i,
  /\bsanitiz(e|ed|ing) (the )?security (detail|information)\b/i,
  /\bsecurity (detail|framing) from\b/i,
  /\bhow .{0,40}had been reachable\b/i,
  // Added after testing against real leaked lines: these three shapes appeared
  // in text that reached a public surface and that the first pattern set missed.
  /\bkept (full )?(read|write|access)/i,
  /\bcould be shown\b/i,
  /\banonymous (widget )?(visitor|user|caller)\b/i,
]

const NARRATIVE = [
  /\bpreviously\b/i,
  /\bused to\b/i,
  /\bwould have\b/i,
  /\bcould have\b/i,
  /\bbefore (the|this) fix\b/i,
  /\bpre-fix\b/i,
  // Past incorrect ordering, which is how several real cases were phrased —
  // "X ran before Y" describing a sequence that has since been changed.
  /\b(ran|happened|occurred|was checked) before\b/i,
]

const IMPACT = [
  /\bexploit/i,
  /\bvulnerab/i,
  /\bunauthenticated\b/i,
  /\bany(one|body|user|org|customer)\b/i,
  /\bfull (read|write|access)\b/i,
  /\bkept (full )?access\b/i,
  /\bwrong (price|amount|org|tenant)\b/i,
  /\bother (customer|org|tenant|user)/i,
  /\bcross-tenant\b/i,
  /\bleak(ed|s|ing)?\b/i,
  /\bshown to\b/i,
  /\bcharged\b/i,
  /\bquota\b/i,
  /\breject(ed|ing)? the request\b/i,
]

function isExempt(file) {
  return EXEMPT_FILES.some((f) => file === f)
}

export function match(line) {
  for (const re of STRONG) if (re.test(line)) return { tier: 'strong', re }
  const narrative = NARRATIVE.find((re) => re.test(line))
  if (narrative) {
    const impact = IMPACT.find((re) => re.test(line))
    if (impact) return { tier: 'narrative', re: narrative, with: impact }
  }
  return null
}

/**
 * Score a block of free text — a PR body, a comment, a title. Exported so the
 * gh PreToolUse hook and the CI check score against exactly these patterns
 * rather than keeping their own copies, which would drift apart the first time
 * one of them was tuned.
 */
export function scanText(text, label = 'text', { honorMarker = true } = {}) {
  const out = []
  String(text ?? '')
    .split('\n')
    .forEach((line, i) => {
      // A PR title or body is public the instant it is written, and the marker
      // is as easy to type as the wording it excuses. Surfaces that cannot be
      // walked back opt out of the escape hatch entirely.
      if (honorMarker && line.includes(ALLOW_MARKER)) return
      const hit = match(line)
      if (hit) out.push({ where: `${label}:${i + 1}`, text: line.trim(), hit })
    })
  return out
}

/** Shared failure output, so every surface explains itself the same way. */
export function reportFindings(findings, surfaceNote) {
  console.error('')
  console.error('[31m[1m  DISCLOSURE CHECK FAILED  [0m')
  console.error('')
  console.error('These lines describe a weakness rather than what the code guarantees.')
  console.error(surfaceNote)
  console.error('')

  for (const f of findings) {
    console.error(`  ${f.where}`)
    console.error(`    ${f.text.slice(0, 160)}`)
    console.error(`    matched: ${f.hit.re}${f.hit.with ? ` + ${f.hit.with}` : ''}`)
    console.error('')
  }

  console.error('What to do:')
  console.error('  Reword to state the invariant. "Access is scoped to subscriptions" rather')
  console.error('  than "authenticating alone used to be enough". Same information for whoever')
  console.error('  maintains this, no roadmap for anyone else.')
  console.error('')
  console.error('  Full detail belongs on the internal security page, not here.')
  console.error('')
}

function stagedAdditions() {
  // -U0 keeps the hunk headers we need to recover real line numbers, and limits
  // output to the lines actually being introduced.
  const diff = execSync('git diff --cached --unified=0 --no-color', {
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
  })

  const out = []
  let file = null
  let lineNo = 0

  for (const raw of diff.split('\n')) {
    if (raw.startsWith('+++ b/')) {
      file = raw.slice(6)
      continue
    }
    if (raw.startsWith('@@')) {
      const m = raw.match(/\+(\d+)/)
      lineNo = m ? Number(m[1]) : 0
      continue
    }
    if (raw.startsWith('+') && !raw.startsWith('+++')) {
      if (file && !isExempt(file)) out.push({ file, line: lineNo, text: raw.slice(1) })
      lineNo++
    }
  }
  return out
}

function main() {
  const findings = []

  for (const { file, line, text } of stagedAdditions()) {
    if (text.includes(ALLOW_MARKER)) continue
    const hit = match(text)
    if (hit) findings.push({ where: `${file}:${line}`, text: text.trim(), hit })
  }

  // The commit message is a public surface too, and was the worst offender.
  const msgPath = process.argv[2]
  if (msgPath && fs.existsSync(msgPath)) {
    const msg = fs.readFileSync(msgPath, 'utf-8')
    if (!msg.includes(ALLOW_MARKER)) {
      msg.split('\n').forEach((text, i) => {
        if (text.startsWith('#')) return // git's own comment lines
        const hit = match(text)
        if (hit) findings.push({ where: `commit message:${i + 1}`, text: text.trim(), hit })
      })
    }
  }

  // A branch name ships in the merge commit and in the PR forever.
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()
    if (/sanitiz|security-detail|vuln|exploit|leak/i.test(branch)) {
      findings.push({
        where: 'branch name',
        text: branch,
        hit: { tier: 'strong', re: /branch name/ },
      })
    }
  } catch {
    // detached HEAD or a fresh repo — nothing to check
  }

  if (findings.length === 0) process.exit(0)

  reportFindings(
    findings,
    'Repo-visible surfaces may say a security issue was fixed and nothing more \u2014\n' +
      'anything that explains how it was reachable is useful to someone running an\n' +
      'older version.',
  )
  console.error(`  Genuinely needed? Add ${JSON.stringify(ALLOW_MARKER)} to the line or the commit message.`)
  console.error('  Emergency bypass: git commit --no-verify')
  console.error('')

  process.exit(1)
}

// Only run the pre-commit flow when invoked directly. The gh hook and the CI
// check import this module for its patterns, and must not trigger a staged-diff
// scan merely by importing it.
if (import.meta.url === `file://${process.argv[1]}`) main()
