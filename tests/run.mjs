// Runs the unit tests with no extra installs: esbuild (already here, it comes with Vite) bundles each
// tests/*.test.ts for Node, then Node's built-in test runner runs them.   npm test
import { build } from 'esbuild'
import { readdirSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const files = readdirSync('tests').filter((f) => f.endsWith('.test.ts'))
rmSync('.test-build', { recursive: true, force: true })
await build({ entryPoints: files.map((f) => `tests/${f}`), outdir: '.test-build', bundle: true, platform: 'node', format: 'esm',
  outExtension: { '.js': '.mjs' }, logLevel: 'warning', define: { 'import.meta.env.BASE_URL': '"/"' } })
const r = spawnSync(process.execPath, ['--test', ...files.map((f) => `.test-build/${f.replace(/\.ts$/, '.mjs')}`)], { stdio: 'inherit' })
process.exit(r.status ?? 1)
