import { describe, it, expect } from 'vitest'
import { shouldAutoDeflect, AUTO_DEFLECT_THRESHOLD } from '@/lib/ai/assess'

// shouldAutoDeflect gained an optional threshold param so lib/ai/agent.ts
// can pass an org's configured confidence_threshold instead of always using
// the hardcoded platform-wide constant. Confirms both the new parameter and
// its backward-compatible default.

describe('shouldAutoDeflect threshold parameter', () => {
  it('defaults to AUTO_DEFLECT_THRESHOLD (0.8) when no threshold is passed', () => {
    expect(shouldAutoDeflect({ confidence: 0.75, answered_fully: true, reasoning: 'x' })).toBe(false)
    expect(shouldAutoDeflect({ confidence: 0.85, answered_fully: true, reasoning: 'x' })).toBe(true)
  })

  it('honors an explicit threshold below the default', () => {
    // Would be false under the old hardcoded 0.8 constant.
    expect(shouldAutoDeflect({ confidence: 0.75, answered_fully: true, reasoning: 'x' }, 0.7)).toBe(true)
  })

  it('honors an explicit threshold above the default', () => {
    // Would be true under the old hardcoded 0.8 constant.
    expect(shouldAutoDeflect({ confidence: 0.85, answered_fully: true, reasoning: 'x' }, 0.9)).toBe(false)
  })

  it('still requires answered_fully regardless of threshold', () => {
    expect(shouldAutoDeflect({ confidence: 0.99, answered_fully: false, reasoning: 'x' }, 0.1)).toBe(false)
  })

  it('AUTO_DEFLECT_THRESHOLD is still exported for callers that need the fallback value directly', () => {
    expect(AUTO_DEFLECT_THRESHOLD).toBe(0.8)
  })
})
