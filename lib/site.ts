/**
 * Canonical public URLs for the project itself.
 *
 * The repository URL lived in three places that drifted apart: the marketing
 * chrome, the docs layout, and the waitlist email. The marketing copy was still
 * pointing at the pre-migration repository, which now redirects to the private
 * archive — so every "view source" link on the site sent people somewhere they
 * could not read. One export, imported everywhere, is what stops that
 * recurring. Markdown and MDX cannot import this, so those files carry the
 * literal URL and a test keeps them honest.
 */
export const GITHUB_URL = 'https://github.com/AnswerLoops/answerLoops'

export const GITHUB_ISSUES_URL = `${GITHUB_URL}/issues`
