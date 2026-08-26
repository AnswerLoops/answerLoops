import type { MetadataRoute } from 'next'
import { docsSource } from '@/lib/docs/source'

const BASE_URL = 'https://answerloops.com'

// Static marketing routes worth a crawler's time. Auth-gated app routes
// (/dashboard, /settings, etc.) are intentionally excluded — a crawler can't
// do anything useful with a page that just redirects to /login.
const STATIC_ROUTES = [
  '',
  '/agentic-support',
  '/architecture',
  '/discord-github-support',
  '/mcp-support-agents',
  '/open-source-support',
  '/pricing',
  '/privacy',
  '/self-hosted-ai-support',
  '/self-hosting-proof',
  '/support-example',
  '/support-workflow',
  '/terms',
  '/vs/chatbase',
  '/vs/intercom',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
  }))

  const docsEntries: MetadataRoute.Sitemap = docsSource.getPages().map((page) => ({
    url: `${BASE_URL}${page.url}`,
    lastModified: new Date(),
  }))

  return [...staticEntries, ...docsEntries]
}
