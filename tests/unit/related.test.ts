import { describe, it, expect } from 'vitest'
import {
  findRelated,
  isDuplicate,
  RELATED_THRESHOLD,
  DUPLICATE_THRESHOLD,
  TOP_K,
  type Candidate,
} from '@/lib/ai/related'

// Unit vectors along each axis are orthogonal (similarity = 0) or identical (similarity = 1).
// Angled vectors let us test specific thresholds without floating-point surprises.

function vec(x: number, y: number): number[] {
  const len = Math.sqrt(x * x + y * y)
  return [x / len, y / len]
}

describe('isDuplicate', () => {
  it('at DUPLICATE_THRESHOLD → true', () => {
    expect(isDuplicate(DUPLICATE_THRESHOLD)).toBe(true)
  })

  it('above DUPLICATE_THRESHOLD → true', () => {
    expect(isDuplicate(0.99)).toBe(true)
  })

  it('below DUPLICATE_THRESHOLD → false', () => {
    expect(isDuplicate(DUPLICATE_THRESHOLD - 0.01)).toBe(false)
  })

  it('perfect match (1.0) → true', () => {
    expect(isDuplicate(1.0)).toBe(true)
  })
})

describe('findRelated', () => {
  it('returns empty when no candidates', () => {
    expect(findRelated([1, 0], [])).toEqual([])
  })

  it('filters out candidates below RELATED_THRESHOLD', () => {
    // orthogonal vector → similarity = 0
    const candidates: Candidate[] = [{ ticket_id: 1, vector: [0, 1] }]
    const results = findRelated([1, 0], candidates)
    expect(results).toHaveLength(0)
  })

  it('includes candidates at RELATED_THRESHOLD', () => {
    // Build a vector with exactly RELATED_THRESHOLD cosine similarity to [1,0].
    // cos(θ) = threshold → θ = acos(threshold)
    const theta = Math.acos(RELATED_THRESHOLD)
    const v = [Math.cos(theta), Math.sin(theta)]
    const candidates: Candidate[] = [{ ticket_id: 1, vector: v }]
    const results = findRelated([1, 0], candidates)
    expect(results).toHaveLength(1)
    expect(results[0].score).toBeCloseTo(RELATED_THRESHOLD, 5)
  })

  it('identical vectors score 1.0', () => {
    const v = vec(3, 4)
    const candidates: Candidate[] = [{ ticket_id: 42, vector: v }]
    const [match] = findRelated(v, candidates)
    expect(match.score).toBeCloseTo(1.0, 5)
  })

  it('sorts by score descending', () => {
    const query = [1, 0]
    const candidates: Candidate[] = [
      { ticket_id: 1, vector: vec(1, 2) },  // lower similarity
      { ticket_id: 2, vector: vec(4, 1) },  // higher similarity
      { ticket_id: 3, vector: vec(2, 1) },  // middle
    ]
    const results = findRelated(query, candidates)
    expect(results.length).toBeGreaterThan(1)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
    }
  })

  it('caps results at TOP_K', () => {
    const query = [1, 0]
    // 10 nearly identical candidates (all above threshold)
    const candidates: Candidate[] = Array.from({ length: TOP_K + 5 }, (_, i) => ({
      ticket_id: i + 1,
      vector: vec(10, i * 0.01 + 0.001),
    }))
    const results = findRelated(query, candidates)
    expect(results.length).toBeLessThanOrEqual(TOP_K)
  })

  it('maps ticket_id correctly', () => {
    const v = [1, 0]
    const candidates: Candidate[] = [{ ticket_id: 99, vector: v }]
    const [match] = findRelated(v, candidates)
    expect(match.related_id).toBe(99)
  })
})
