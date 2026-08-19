import { loader } from 'fumadocs-core/source'
import { docs } from '@/.source/server'

// Single loader for the whole docs/ tree, replacing Mintlify's docs.json
// nav resolution. Page tree ordering comes from meta.json files under
// content/docs/**, mirroring the group order in the old docs.json exactly.
export const docsSource = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
})
