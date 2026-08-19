import { cosineSimilarity } from 'ai'

// A link is only stored when tickets are at least loosely on-topic together.
export const RELATED_THRESHOLD = 0.45
// At/above this, two tickets are treated as effectively the same question.
export const DUPLICATE_THRESHOLD = 0.85
// Cap how many neighbours we keep per ticket.
export const TOP_K = 5

export interface Candidate {
  ticket_id: number
  vector: number[]
}

export interface Match {
  related_id: number
  score: number
}

/**
 * Rank candidate tickets by cosine similarity to `vector`, keeping the top-K
 * above RELATED_THRESHOLD. Candidates are expected to exclude the source ticket.
 */
export function findRelated(vector: number[], candidates: Candidate[]): Match[] {
  return candidates
    .map((c) => ({ related_id: c.ticket_id, score: cosineSimilarity(vector, c.vector) }))
    .filter((m) => m.score >= RELATED_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)
}

export function isDuplicate(score: number): boolean {
  return score >= DUPLICATE_THRESHOLD
}
