import type { MetadataRoute } from 'next'
import { docsSource } from '@/lib/docs/source'
import { marketingSiteEnabled, MARKETING_URL } from '@/lib/site'

const BASE_URL = MARKETING_URL

// Static marketing routes worth a crawler's time. Auth-gated app routes
// (/dashboard, /settings, etc.) are intentionally excluded — a crawler can't
// do anything useful with a page that just redirects to /login.
const STATIC_ROUTES = ['', '/pricing', '/vs/chatbase', '/vs/intercom']

export default function sitemap(): MetadataRoute.Sitemap {
  // Every URL below is on our own domain. Served from a self-hosted install it
  // would be a sitemap for somebody else's site, advertising pages that install
  // should not be serving in the first place. robots.txt already disallows the
  // whole origin there; this makes the sitemap itself empty rather than wrong.
  if (!marketingSiteEnabled()) return []

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
