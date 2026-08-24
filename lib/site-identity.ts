import { GITHUB_URL } from '@/lib/site'

export const ORGANIZATION_ID = 'https://answerloops.com/#organization'

/**
 * The canonical public identity graph shared by every crawlable route.
 *
 * Keep this limited to relationships that AnswerLoops can verify and control:
 * the canonical site, repository, documentation, logo, and support contact.
 * Additional social profiles belong here only once they are official and
 * maintained by the project.
 */
export const siteIdentityJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': ORGANIZATION_ID,
      name: 'AnswerLoops',
      url: 'https://answerloops.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://answerloops.com/logo.png',
      },
      description:
        'Open-source, self-hostable agentic support for developer communities.',
      sameAs: [GITHUB_URL],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'support@answerloops.com',
        url: 'https://answerloops.com/docs',
      },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://answerloops.com/#website',
      name: 'AnswerLoops',
      url: 'https://answerloops.com',
      publisher: { '@id': ORGANIZATION_ID },
    },
    {
      '@type': 'WebPage',
      '@id': 'https://answerloops.com/docs',
      name: 'AnswerLoops Documentation',
      url: 'https://answerloops.com/docs',
      isPartOf: { '@id': 'https://answerloops.com/#website' },
      about: { '@id': ORGANIZATION_ID },
    },
  ],
} as const
