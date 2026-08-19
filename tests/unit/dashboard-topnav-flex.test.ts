import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// The dashboard topnav utility cluster (Website link / notification bell /
// Sign out) rendered on the LEFT edge of the content area at every desktop
// width (verified 900px through 1600px via Playwright), instead of the right
// edge where it belongs. Root cause: the header used
// `justify-content: space-between` with two flex children — the mobile
// drawer trigger and the utility cluster. The trigger is `md:hidden`
// (display:none) at desktop widths, and a display:none element is excluded
// from flex layout entirely, leaving only ONE flex child. With a single
// item, `space-between` has no second item to create a gap against, so
// browsers collapse it to flex-start — pinning the cluster to the left
// regardless of viewport width. This also caused the notification dropdown
// (right-0 relative to the bell) to intrude into the sidebar's column and
// get clipped by an overflow-hidden ancestor, since the bell ended up much
// closer to the sidebar boundary than intended.
//
// Fix: ml-auto on the utility cluster instead of justify-between on the
// header. ml-auto pushes an element to the far right of its flex container
// unconditionally — it doesn't depend on how many sibling items exist or
// their visibility state, so it can't regress the same way if the drawer
// trigger's visibility logic changes again.
//
// Source-file structural assertion — same convention as
// tenant-isolation.test.ts (this is a CSS/layout bug that isn't meaningfully
// unit-testable without a real browser; the reproduction was done manually
// with Playwright screenshots across viewport widths 375-1600px).

const ROOT = process.cwd()

function read(relPath: string): string {
  const absPath = path.join(ROOT, relPath)
  expect(fs.existsSync(absPath), `File not found: ${relPath}`).toBe(true)
  return fs.readFileSync(absPath, 'utf-8')
}

describe('dashboard topnav does not rely on justify-between with a conditionally-hidden sibling', () => {
  it('the header no longer uses justify-between', () => {
    const src = read('app/(dashboard)/layout.tsx')
    const headerIdx = src.indexOf('<header')
    const headerTagEnd = src.indexOf('>', headerIdx)
    const headerOpenTag = src.slice(headerIdx, headerTagEnd)
    expect(headerOpenTag).not.toContain('justify-between')
  })

  it('the utility cluster uses ml-auto to right-align unconditionally', () => {
    const src = read('app/(dashboard)/layout.tsx')
    const headerIdx = src.indexOf('<header')
    // Match the utility cluster regardless of gap-* spacing tweaks (brand polish
    // may change gap-4 → gap-3 etc.); the invariant under test is ml-auto.
    const clusterMatch = src.slice(headerIdx).match(/<div\b[^>]*\bml-auto\b[^>]*>/)
    expect(clusterMatch, 'expected a div with ml-auto inside the header').not.toBeNull()
    expect(clusterMatch![0]).toMatch(/flex items-center gap-\d+/)
  })

  it('the mobile drawer trigger is still hidden at desktop widths (md:hidden preserved)', () => {
    const src = read('app/(dashboard)/layout.tsx')
    expect(src).toContain('triggerClassName="md:hidden"')
  })
})
