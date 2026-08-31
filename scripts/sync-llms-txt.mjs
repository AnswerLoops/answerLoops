import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LLMS_PATH = path.join(ROOT, 'public/llms.txt')
const SITEMAP_PATH = path.join(ROOT, 'app/sitemap.ts')
const INTEGRATIONS_PATH = path.join(ROOT, 'content/docs/integrations/meta.json')
const BASE_URL = 'https://answerloops.com'

const LINKS_START = '<!-- BEGIN GENERATED PUBLIC LINKS -->'
const LINKS_END = '<!-- END GENERATED PUBLIC LINKS -->'
const INTEGRATIONS_START = '<!-- BEGIN GENERATED INTEGRATION LINKS -->'
const INTEGRATIONS_END = '<!-- END GENERATED INTEGRATION LINKS -->'

const LABELS = {
  '': 'Marketing site',
  '/agentic-support': 'Agentic support overview',
  '/pricing': 'Pricing',
  '/privacy': 'Privacy policy',
  '/terms': 'Terms of service',
  '/vs/chatbase': 'AnswerLoops vs Chatbase',
  '/vs/intercom': 'AnswerLoops vs Intercom',
}

const INTEGRATION_LABELS = {
  discord: 'Discord',
  slack: 'Slack',
  discourse: 'Discourse',
  circle: 'Circle',
  'google-chat': 'Google Chat',
  telegram: 'Telegram',
  email: 'Email',
  github: 'GitHub',
  mcp: 'MCP server',
  'agent-api': 'Agent API (REST)',
}

function extractStaticRoutes(sitemapSource) {
  const match = sitemapSource.match(/const STATIC_ROUTES = \[([\s\S]*?)\]/)
  if (!match) throw new Error('Could not find STATIC_ROUTES in app/sitemap.ts')
  return [...match[1].matchAll(/'([^']*)'/g)].map(([, route]) => route)
}

function generatedBlock(source, start, end, lines) {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end)
  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
    throw new Error(`Missing generated block markers: ${start}`)
  }
  const contentStart = startIndex + start.length
  return source.slice(0, contentStart) + `\n${lines.join('\n')}\n` + source.slice(endIndex)
}

export function syncLlmsText(llmsText, sitemapSource, integrationsJson) {
  const routes = extractStaticRoutes(sitemapSource)
  const publicLinks = routes.map((route) => `- ${LABELS[route] ?? route}: ${BASE_URL}${route}`)
  const integrations = integrationsJson.pages
    .filter((slug) => slug in INTEGRATION_LABELS)
    .map((slug) => `- ${INTEGRATION_LABELS[slug]}: ${BASE_URL}/docs/integrations/${slug}`)

  let result = generatedBlock(llmsText, LINKS_START, LINKS_END, publicLinks)
  result = generatedBlock(result, INTEGRATIONS_START, INTEGRATIONS_END, integrations)
  return result
}

async function main() {
  const [llmsText, sitemapSource, integrationsText] = await Promise.all([
    readFile(LLMS_PATH, 'utf8'),
    readFile(SITEMAP_PATH, 'utf8'),
    readFile(INTEGRATIONS_PATH, 'utf8'),
  ])
  const next = syncLlmsText(llmsText, sitemapSource, JSON.parse(integrationsText))

  if (process.argv.includes('--check')) {
    if (next !== llmsText) {
      console.error('public/llms.txt is stale. Run `pnpm llms:sync` and commit the result.')
      process.exitCode = 1
    }
    return
  }

  if (next !== llmsText) await writeFile(LLMS_PATH, next)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
