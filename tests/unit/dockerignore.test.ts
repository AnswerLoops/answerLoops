import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * The Dockerfile copies the whole build context (`COPY . .`), so .dockerignore
 * is the only thing standing between a file on disk and a layer in a published
 * image. That matters more than usual here because images now publish to a
 * public registry, and a credential in a layer is not removed by deleting the
 * file in a later one.
 *
 * This was not hypothetical. Before this test existed, .dockerignore excluded
 * `.env.local` but not `.env`, so every locally built image carried real Stripe
 * and database credentials. CI builds were unaffected only because `.env` is
 * gitignored and so absent from a fresh checkout — luck rather than design.
 *
 * The matcher below implements the subset of .dockerignore syntax this file
 * actually uses: literal paths, a single `*` wildcard, and `!` negation. It is
 * not a full implementation, and a pattern relying on something fancier would
 * need it extended rather than trusted.
 */

const PATTERNS = fs
  .readFileSync(path.join(process.cwd(), '.dockerignore'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))

function toRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')
  return new RegExp(`^${escaped}(/.*)?$`)
}

/** True when docker would leave this path out of the build context. */
function excluded(candidate: string): boolean {
  let result = false
  for (const raw of PATTERNS) {
    const negated = raw.startsWith('!')
    const pattern = negated ? raw.slice(1) : raw
    if (toRegExp(pattern).test(candidate)) result = !negated
  }
  return result
}

describe('.dockerignore keeps secrets out of published layers', () => {
  it('excludes the real env file', () => {
    expect(excluded('.env')).toBe(true)
  })

  it('excludes every env variant, including backups made by hand', () => {
    for (const f of [
      '.env.local',
      '.env.production',
      '.env.notion',
      '.env.backup-before-devbranch',
      '.env.staging',
    ]) {
      expect(excluded(f), `${f} would be copied into the image`).toBe(true)
    }
  })

  it('still ships the example files, which are placeholders and are documented', () => {
    expect(excluded('.env.example')).toBe(false)
    expect(excluded('.env.staging.example')).toBe(false)
  })

  it('excludes database dumps, which contain customer data', () => {
    expect(excluded('backup.sql')).toBe(true)
    expect(excluded('railway-postgres-backup-2026-08-20.sql')).toBe(true)
  })
})

describe('.dockerignore keeps internal material out of a public image', () => {
  it('excludes agent and engineering instructions', () => {
    // CLAUDE.local.md is gitignored, so it is absent from a CI build — but a
    // local build would otherwise copy it straight out of the working tree.
    for (const f of ['CLAUDE.md', 'CLAUDE.local.md', 'AGENTS.md', 'ARCHITECTURE.md', 'TESTING-GUIDE.md']) {
      expect(excluded(f), `${f} would ship to every self-hoster`).toBe(true)
    }
  })

  it('excludes tests, whose placeholder credentials trip secret scanners', () => {
    for (const f of ['tests', 'tests/unit/mcp-server.test.ts', 'e2e', 'playwright.config.ts']) {
      expect(excluded(f)).toBe(true)
    }
  })

  it('excludes git and CI metadata', () => {
    for (const f of ['.git', '.github', 'docker-compose.yml', 'docker-compose.prod.yml']) {
      expect(excluded(f)).toBe(true)
    }
  })
})

describe('.dockerignore does not break the runtime', () => {
  it('keeps everything the image needs to boot', () => {
    // Excluding one of these produces an image that builds and then fails at
    // runtime, which is a worse failure than a build error.
    for (const f of [
      'package.json',
      'pnpm-lock.yaml',
      'next.config.ts',
      'instrumentation.ts',
      'auth.ts',
      'app',
      'lib',
      'components',
      'content',
      'drizzle',
      'public',
    ]) {
      expect(excluded(f), `${f} is needed at runtime but would be excluded`).toBe(false)
    }
  })
})
