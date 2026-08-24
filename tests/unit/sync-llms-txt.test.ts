import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { syncLlmsText } from '@/scripts/sync-llms-txt.mjs'

describe('llms.txt synchronization', () => {
  it('keeps generated public and integration links aligned with their sources', async () => {
    const root = process.cwd()
    const [llmsText, sitemapSource, integrationsText] = await Promise.all([
      readFile(path.join(root, 'public/llms.txt'), 'utf8'),
      readFile(path.join(root, 'app/sitemap.ts'), 'utf8'),
      readFile(path.join(root, 'content/docs/integrations/meta.json'), 'utf8'),
    ])

    expect(syncLlmsText(llmsText, sitemapSource, JSON.parse(integrationsText))).toBe(llmsText)
  })
})
