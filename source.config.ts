import { defineDocs, defineConfig } from 'fumadocs-mdx/config'

// Single collection backing the whole docs/ tree — mirrors the old
// docs/docs.json nav (one flat page collection + meta.json per folder
// for group ordering, same shape Mintlify used).
export const docs = defineDocs({
  dir: 'content/docs',
})

export default defineConfig({
  mdxOptions: {
    // Mintlify's `<Note>` etc. compiled fine without extra remark/rehype
    // plugins; the Fumadocs equivalents (Callout, Cards, Tabs, Steps) are
    // plain React components registered in mdx-components.tsx, so no extra
    // MDX processing config is required beyond the defaults.
  },
})
