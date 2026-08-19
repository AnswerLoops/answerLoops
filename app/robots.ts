import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/settings', '/tickets', '/kb', '/analytics', '/leads', '/knowledge-gaps', '/billing', '/simulation', '/onboarding', '/account-deleted', '/api/'],
    },
    sitemap: 'https://answerloops.com/sitemap.xml',
  }
}
