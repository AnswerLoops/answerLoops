import type { NotionBlock, NotionRichText } from './client'

const MAX_DEPTH = 5
const MAX_OUTPUT_CHARS = 200_000

function rt(richText: unknown): string {
  if (!Array.isArray(richText)) return ''
  return (richText as NotionRichText[])
    .map((t) => {
      const text = t.plain_text ?? ''
      return t.annotations?.code ? `\`${text}\`` : text
    })
    .join('')
}

interface BlockData {
  rich_text?: unknown
  checked?: boolean
  language?: string
  cells?: unknown[][]
  title?: string
  icon?: { emoji?: string }
}

/**
 * Convert Notion blocks to markdown for the KB chunker. Pragmatic, not
 * pixel-perfect — the chunker only needs readable prose. Recurses into
 * `has_children` blocks up to MAX_DEPTH and stops appending once the output
 * passes MAX_OUTPUT_CHARS.
 */
export async function blocksToMarkdown(
  blocks: NotionBlock[],
  fetchChildren: (blockId: string) => Promise<NotionBlock[]>,
  depth = 0,
  visited: Set<string> = new Set()
): Promise<string> {
  const lines: string[] = []
  let numberedRun = 0

  for (const block of blocks) {
    if (lines.join('\n').length > MAX_OUTPUT_CHARS) break

    const data = (block[block.type] ?? {}) as BlockData
    const text = rt(data.rich_text)
    let handledChildren = false

    if (block.type !== 'numbered_list_item') numberedRun = 0

    switch (block.type) {
      case 'paragraph':
        if (text) lines.push(text, '')
        break
      case 'heading_1':
        lines.push(`# ${text}`, '')
        break
      case 'heading_2':
        lines.push(`## ${text}`, '')
        break
      case 'heading_3':
        lines.push(`### ${text}`, '')
        break
      case 'bulleted_list_item':
        lines.push(`- ${text}`)
        break
      case 'numbered_list_item':
        numberedRun += 1
        lines.push(`${numberedRun}. ${text}`)
        break
      case 'to_do':
        lines.push(`- [${data.checked ? 'x' : ' '}] ${text}`)
        break
      case 'quote':
        lines.push(`> ${text}`, '')
        break
      case 'callout': {
        const icon = data.icon?.emoji ? `${data.icon.emoji} ` : ''
        lines.push(`> ${icon}${text}`, '')
        break
      }
      case 'code':
        lines.push('```' + (data.language && data.language !== 'plain text' ? data.language : ''), text, '```', '')
        break
      case 'divider':
        lines.push('---', '')
        break
      case 'toggle':
        if (text) lines.push(text)
        break
      case 'table':
        // Rows arrive as child table_row blocks — handled below via recursion.
        break
      case 'table_row': {
        const cells = Array.isArray(data.cells) ? data.cells.map((c) => rt(c)) : []
        lines.push(`| ${cells.join(' | ')} |`)
        break
      }
      case 'child_page':
        if (data.title) lines.push(`## ${data.title}`, '')
        break
      case 'child_database':
        if (data.title) lines.push(`## ${data.title}`, '')
        handledChildren = true // rows come from the top-level database pass
        break
      default: {
        // image / bookmark / embed / file / pdf / link_preview / video —
        // salvage any caption text, otherwise skip.
        const caption = rt((block[block.type] as { caption?: unknown })?.caption)
        if (caption) lines.push(caption, '')
      }
    }

    if (block.has_children && !handledChildren && depth < MAX_DEPTH && !visited.has(block.id)) {
      visited.add(block.id)
      const childBlocks = await fetchChildren(block.id)
      const childMd = await blocksToMarkdown(childBlocks, fetchChildren, depth + 1, visited)
      if (childMd.trim()) lines.push(childMd)
    }
  }

  return lines.join('\n').slice(0, MAX_OUTPUT_CHARS).trim()
}
