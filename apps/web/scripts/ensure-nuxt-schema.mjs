#!/usr/bin/env node
/**
 * Pre-create `.nuxt/schema/` plus minimal `nuxt.schema.d.ts` and `nuxt.schema.json` when missing.
 * Nuxt can read/write these without mkdir; avoids ENOENT during dev, prepare, and IDE TS.
 *
 * Also pre-create `.nuxt/dist/server` and `.nuxt/dist/client` so @nuxt/vite-builder can write
 * `server.mjs` without ENOENT when `.nuxt/dist` was removed or only partially rebuilt (common
 * after failed dev runs or concurrent processes).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const cwd = process.cwd()
const distServerDir = join(cwd, '.nuxt', 'dist', 'server')
const distClientDir = join(cwd, '.nuxt', 'dist', 'client')
mkdirSync(distServerDir, { recursive: true })
mkdirSync(distClientDir, { recursive: true })

const schemaDir = join(cwd, '.nuxt', 'schema')
const schemaDts = join(schemaDir, 'nuxt.schema.d.ts')
const schemaJson = join(schemaDir, 'nuxt.schema.json')

mkdirSync(schemaDir, { recursive: true })

if (!existsSync(schemaDts)) {
  writeFileSync(
    schemaDts,
    '/** Placeholder — replaced by `nuxt prepare`. */\nexport {}\n',
    'utf8',
  )
}

if (!existsSync(schemaJson)) {
  writeFileSync(schemaJson, '{}\n', 'utf8')
}
