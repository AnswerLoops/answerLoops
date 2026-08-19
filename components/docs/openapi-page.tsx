'use client'

import { createOpenAPIPage } from 'fumadocs-openapi/ui'

// `createOpenAPIPage()` is a client-only factory (the generated reference
// pages have an interactive "try it" playground) — it can't be invoked from
// a server module. openapi-page-server.tsx wraps this with the server-side
// schema load the generated MDX pages need (they only carry a file path,
// not the resolved schema — see lib/docs/openapi.ts).
export const OpenAPIPageClient = createOpenAPIPage()
