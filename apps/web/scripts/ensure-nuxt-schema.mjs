#!/usr/bin/env node
/**
 * Pre-create `.nuxt/schema/` plus minimal `nuxt.schema.d.ts` and `nuxt.schema.json` when missing.
 * Nuxt can read/write these without mkdir; avoids ENOENT during dev, prepare, and IDE TS.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const schemaDir = join(process.cwd(), '.nuxt', 'schema')
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
