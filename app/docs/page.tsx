import { redirect } from 'next/navigation'

// `/docs` has no content of its own — Mintlify's docs.json listed
// "introduction" as the first Getting Started page, so that's the page
// that owns the docs home. Keeping this as a redirect (rather than
// duplicating the intro content at two URLs) means there's one canonical
// URL for search indexing and inbound links.
export default function DocsIndexPage() {
  redirect('/docs/introduction')
}
