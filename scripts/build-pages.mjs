#!/usr/bin/env node
/**
 * Builds the site into docs/ for GitHub Pages.
 *
 *   npm run build:pages
 *
 * GitHub Pages can serve straight from a repo folder, so this is the whole
 * deployment: build, commit, push. No CI, no hosting account, no tokens.
 *
 * Two Pages-specific touches:
 *   404.html   — Pages has no SPA rewrite rule, so it serves 404.html for any
 *                path it doesn't recognise. Making that a copy of index.html
 *                lets the router handle deep links like /AisleLedger/budget.
 *   .nojekyll  — stops Pages running the files through Jekyll, which would
 *                otherwise ignore any file or folder starting with an
 *                underscore.
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'docs')

rmSync(out, { recursive: true, force: true })

execFileSync('npx', ['vite', 'build', '--outDir', 'docs'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})

const index = resolve(out, 'index.html')
if (!existsSync(index)) {
  console.error('build produced no docs/index.html — aborting')
  process.exit(1)
}

copyFileSync(index, resolve(out, '404.html'))
writeFileSync(resolve(out, '.nojekyll'), '')

console.log('\ndocs/ ready — commit and push, then set Pages to serve /docs')
