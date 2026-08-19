import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/**
 * Guards the `prepare` script against the environments it actually runs in.
 *
 * `prepare` fires on every `pnpm install`, which includes places that are not a
 * developer's checkout. A container image build copies `package.json` and the
 * lockfile into a layer of their own so dependency installation caches
 * independently of source changes — so at that moment `scripts/` does not exist
 * yet. A `prepare` that assumes its own script is present fails the install,
 * and the whole image build with it.
 *
 * That is not hypothetical: it took production down. The script guarded against
 * a missing `.git` directory but not against being absent itself, and the
 * failure surfaced only in the deploy log, well past every local check.
 */

const prepare: string = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'),
).scripts.prepare

function runIn(dir: string): number {
  return spawnSync('sh', ['-c', prepare], { cwd: dir, encoding: 'utf-8' }).status ?? 1
}

function tempDir(build: (dir: string) => void): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prepare-'))
  build(dir)
  return dir
}

describe('the prepare script survives every install context', () => {
  it('succeeds when scripts/ does not exist yet (the dependency layer of an image build)', () => {
    const dir = tempDir((d) => {
      fs.copyFileSync(path.join(process.cwd(), 'package.json'), path.join(d, 'package.json'))
    })
    try {
      expect(runIn(dir)).toBe(0)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('succeeds when the source is present but there is no .git (a container with source)', () => {
    const dir = tempDir((d) => {
      fs.mkdirSync(path.join(d, 'scripts'))
      fs.copyFileSync(
        path.join(process.cwd(), 'scripts/install-hooks.sh'),
        path.join(d, 'scripts/install-hooks.sh'),
      )
    })
    try {
      expect(runIn(dir)).toBe(0)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('installs both hooks in a real working copy', () => {
    const dir = tempDir((d) => {
      fs.mkdirSync(path.join(d, 'scripts'))
      fs.copyFileSync(
        path.join(process.cwd(), 'scripts/install-hooks.sh'),
        path.join(d, 'scripts/install-hooks.sh'),
      )
      spawnSync('git', ['init', '--quiet'], { cwd: d })
    })
    try {
      expect(runIn(dir)).toBe(0)
      expect(fs.existsSync(path.join(dir, '.git/hooks/pre-commit'))).toBe(true)
      expect(fs.existsSync(path.join(dir, '.git/hooks/commit-msg'))).toBe(true)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('is idempotent — a second install does not stack the managed block', () => {
    const dir = tempDir((d) => {
      fs.mkdirSync(path.join(d, 'scripts'))
      fs.copyFileSync(
        path.join(process.cwd(), 'scripts/install-hooks.sh'),
        path.join(d, 'scripts/install-hooks.sh'),
      )
      spawnSync('git', ['init', '--quiet'], { cwd: d })
    })
    try {
      runIn(dir)
      runIn(dir)
      const hook = fs.readFileSync(path.join(dir, '.git/hooks/pre-commit'), 'utf-8')
      const blocks = hook.split('>>> answerloops managed >>>').length - 1
      expect(blocks).toBe(1)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
