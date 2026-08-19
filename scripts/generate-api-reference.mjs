#!/usr/bin/env node
/**
 * Runner for _generate-api-reference-impl.mts — see that file for what it
 * actually does and why it needs to be bundled first rather than run
 * directly with tsx/node. Bundles to a throwaway CommonJS file under
 * .cache/ (gitignored) and executes it, then cleans up.
 */
import { buildSync } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'

mkdirSync('.cache', { recursive: true })
const bundlePath = '.cache/generate-api-reference.cjs'

buildSync({
  entryPoints: ['scripts/_generate-api-reference-impl.mts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['next', 'react', 'react-dom'],
  outfile: bundlePath,
  logLevel: 'warning',
})

try {
  execFileSync(process.execPath, [bundlePath], { stdio: 'inherit' })
} finally {
  rmSync(bundlePath, { force: true })
}
