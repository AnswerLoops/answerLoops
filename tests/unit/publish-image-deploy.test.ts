import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

// Regression guard for fix/railway-deploy-unblock.
//
// publish-image.yml used to trigger on `push: branches: [main]`. That run only
// ever produced a `main`/sha tag no deploy consumes, and — because the platform
// host waits on the whole check suite for a commit — a red run here froze every
// production deploy from main. The fix removes the push trigger entirely,
// leaving only `release` and `workflow_dispatch`. Reintroducing any `push:` key
// under `on:` brings the deploy coupling back, so that is asserted explicitly.

describe('publish-image.yml: no push trigger (deploy coupling removed)', () => {
  const load = async () => {
    const root = process.cwd()
    const raw = await readFile(
      path.join(root, '.github/workflows/publish-image.yml'),
      'utf8',
    )
    // Slice out the `on:` block: from the top-level `on:` line to the next
    // top-level (column-0) key.
    const lines = raw.split('\n')
    const start = lines.findIndex((l) => /^on:\s*$/.test(l))
    expect(start).toBeGreaterThan(-1)
    let end = lines.length
    for (let i = start + 1; i < lines.length; i++) {
      if (/^[A-Za-z]/.test(lines[i])) {
        end = i
        break
      }
    }
    return { raw, onBlock: lines.slice(start, end).join('\n') }
  }

  it('has no push trigger in the on: block', async () => {
    const { onBlock } = await load()
    // any indented `push:` key under on:
    expect(onBlock).not.toMatch(/^\s+push:/m)
    expect(onBlock).not.toMatch(/branches:\s*\[\s*main\s*\]/)
    expect(onBlock).not.toMatch(/branches:\s*\n\s*-\s*main/)
  })

  it('does not mention branches: [main] anywhere in the workflow', async () => {
    const { raw } = await load()
    expect(raw).not.toContain('branches: [main]')
  })

  it('still triggers on published release and workflow_dispatch', async () => {
    const { onBlock } = await load()
    expect(onBlock).toMatch(/^\s+release:/m)
    expect(onBlock).toMatch(/types:\s*\[\s*published\s*\]/)
    expect(onBlock).toMatch(/^\s+workflow_dispatch:/m)
  })
})
