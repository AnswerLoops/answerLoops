import { createOpenAPI } from 'fumadocs-openapi/server'

// Reads the Agent API spec that scripts/generate-api-reference.mjs commits
// to content/docs/reference/api/openapi.json. The generated MDX pages only
// carry the file path (see that script's output) — resolving it to the
// actual bundled schema happens here, server-side, at render time.
export const openapi = createOpenAPI({
  input: ['content/docs/reference/api/openapi.json'],
})
