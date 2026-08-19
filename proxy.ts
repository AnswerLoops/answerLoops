// Auth.js handles session verification + public-path logic via the `authorized`
// callback in auth.ts. Exporting `auth` directly as the proxy is the v5 pattern.
export { auth as proxy } from '@/auth'

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|.*\\.(?:png|svg|ico)$).*)'],
}
