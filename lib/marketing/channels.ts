/**
 * The canonical marketed channel list — the single source of truth for every
 * "AnswerLoops connects to …" enumeration on the marketing site, in the docs,
 * in `public/llms.txt`, and in the GitHub README.
 *
 * Rules for keeping this honest:
 * - Order is meaningful. Keep this order everywhere the list is rendered.
 * - Discourse and Circle are first-class channels and read as normal list
 *   members everywhere, including the docs ingest-channels table. The Discourse
 *   adapter has shipped (Market Expansion Phase 2); the Circle adapter is still
 *   being built, and per "Capability copy can lead the build" in AGENTS.md the
 *   copy does not hedge for it. Do not reintroduce a "Planned" marker.
 * - Google Chat is supported but not part of the headline list. It belongs in
 *   "also supported" / "what's included" / legal-processor contexts only —
 *   never in a "here is what AnswerLoops does" marketing enumeration. That is
 *   why it is a separate export, not a member of MARKETED_CHANNELS.
 *
 * Prose that needs the list as a sentence should use `channelListSentence()`
 * so the Oxford-comma phrasing stays identical too.
 */

export interface MarketedChannel {
  /** Display name, exactly as it should appear in copy. */
  name: string
  /** Brand color, for the channel rail icons on the landing page. */
  color: string
}

export const MARKETED_CHANNELS: readonly MarketedChannel[] = [
  { name: 'Discord', color: '#5865f2' },
  { name: 'Slack', color: '#36c5f0' },
  { name: 'Discourse', color: '#e4572e' },
  { name: 'Circle', color: '#7c3aed' },
  { name: 'GitHub', color: '#24292f' },
  { name: 'Telegram', color: '#229ed9' },
  { name: 'Email', color: '#64748b' },
  { name: 'Website widget', color: '#2563eb' },
] as const

/** Just the names, in canonical order. */
export const MARKETED_CHANNEL_NAMES: readonly string[] = MARKETED_CHANNELS.map((c) => c.name)

/**
 * Supported but deliberately absent from the headline list. Use only in
 * "also supported" or "included in every plan" contexts.
 */
export const ALSO_SUPPORTED_CHANNELS: readonly string[] = ['Google Chat']

/**
 * The canonical list as a comma-separated sentence fragment with an Oxford
 * "and" before the last item — e.g. "Discord, Slack, …, and a website widget".
 * `lastLabel` overrides the final item's wording (the rail says "Website
 * widget", prose usually wants "a website widget").
 */
export function channelListSentence(lastLabel = 'a website widget'): string {
  const names = [...MARKETED_CHANNEL_NAMES.slice(0, -1), lastLabel]
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}
