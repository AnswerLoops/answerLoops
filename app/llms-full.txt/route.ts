import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

// llms-full.txt — the curated llms.txt summary followed by the full text of
// every docs page inlined, so an agent or MCP client can load the whole
// product's documentation in one fetch with no further crawling. Generated at
// build time (force-static) and served as plain text.
export const dynamic = 'force-static'

const DOCS_DIR = path.join(process.cwd(), 'content', 'docs')

async function collectMdx(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectMdx(full)))
    } else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) {
      files.push(full)
    }
  }
  return files.sort()
}

export async function GET(): Promise<Response> {
  const summary = await readFile(path.join(process.cwd(), 'public', 'llms.txt'), 'utf8')

  const mdxFiles = await collectMdx(DOCS_DIR)
  const sections = await Promise.all(
    mdxFiles.map(async (file) => {
      const rel = path.relative(DOCS_DIR, file).replace(/\.mdx?$/, '')
      const body = await readFile(file, 'utf8')
      return `\n\n---\n\n# Doc: ${rel}\nURL: https://answerloops.com/docs/${rel}\n\n${body.trim()}`
    }),
  )

  const output = `${summary.trim()}\n\n\n${'='.repeat(72)}\nFULL DOCUMENTATION\n${'='.repeat(72)}${sections.join('')}\n`

  return new Response(output, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
