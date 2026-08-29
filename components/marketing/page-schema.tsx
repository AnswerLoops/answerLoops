interface Breadcrumb {
  name: string
  path: string
}

export interface PageSchemaProps {
  name: string
  description: string
  path: string
  breadcrumbs?: Breadcrumb[]
  type?: 'WebPage' | 'CollectionPage'
}

const PAGE_SCHEMA_BY_TITLE: Record<string, PageSchemaProps> = {
  'Open-source customer support for developer communities': { name: 'Open-source customer support for developer communities', description: 'AnswerLoops support workflow for open-source maintainers and developer communities.', path: '/open-source-support', breadcrumbs: [{ name: 'Support', path: '/agentic-support' }] },
  'What is a self-hosted AI support platform?': { name: 'What is a self-hosted AI support platform?', description: 'How AnswerLoops supports self-hosted AI support deployments.', path: '/self-hosted-ai-support', breadcrumbs: [{ name: 'Support', path: '/agentic-support' }] },
  'AI support for Discord and GitHub': { name: 'AI support for Discord and GitHub', description: 'AnswerLoops support workflow for Discord and GitHub communities.', path: '/discord-github-support', breadcrumbs: [{ name: 'Support', path: '/agentic-support' }] },
  'MCP support agents for customer support': { name: 'MCP support agents for customer support', description: 'AnswerLoops MCP support agent capabilities and workflow.', path: '/mcp-support-agents', breadcrumbs: [{ name: 'Support', path: '/agentic-support' }] },
  'A support pipeline built around evidence and review': { name: 'AnswerLoops architecture', description: 'AnswerLoops support pipeline architecture and knowledge loop.', path: '/architecture', breadcrumbs: [{ name: 'Proof', path: '/agentic-support' }] },
  'From community question to reusable answer': { name: 'AnswerLoops support workflow', description: 'How AnswerLoops turns community questions into grounded, reviewed, reusable support answers.', path: '/support-workflow', breadcrumbs: [{ name: 'Proof', path: '/agentic-support' }] },
  'Run the support stack where your team operates': { name: 'Self-hosting AnswerLoops', description: 'AnswerLoops self-hosting deployment and operations overview.', path: '/self-hosting-proof', breadcrumbs: [{ name: 'Proof', path: '/agentic-support' }] },
  'One developer question, four useful outcomes': { name: 'AnswerLoops support example', description: 'A concrete AnswerLoops example from a developer question to reusable knowledge.', path: '/support-example', breadcrumbs: [{ name: 'Proof', path: '/agentic-support' }] },
}

export function pageSchemaForTitle(title: string): PageSchemaProps | undefined {
  return PAGE_SCHEMA_BY_TITLE[title]
}

export function PageSchema({ name, description, path, breadcrumbs = [], type = 'WebPage' }: PageSchemaProps) {
  const url = `https://answerloops.com${path}`
  const items = [{ name: 'AnswerLoops', path: '/' }, ...breadcrumbs, { name, path }]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.path === item.path) === index)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': type,
        '@id': `${url}#webpage`,
        name,
        description,
        url,
        isPartOf: { '@id': 'https://answerloops.com/#website' },
        about: { '@id': 'https://answerloops.com/#organization' },
        breadcrumb: { '@id': `${url}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: `https://answerloops.com${item.path}`,
        })),
      },
    ],
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
}
