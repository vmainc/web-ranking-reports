import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineNuxtModule } from '@nuxt/kit'

/**
 * Nuxt’s `writeSchema` runs at `build:done` / dev watchers before `ready`.
 * The `ready` hook in nuxt.config runs too late, so `.nuxt/schema` can be missing → ENOENT.
 * Re-ensure dirs immediately before schema write and at the start of each build.
 */
function ensureSchemaArtifacts(buildDir: string) {
  const schemaDir = join(buildDir, 'schema')
  mkdirSync(schemaDir, { recursive: true })
  const json = join(schemaDir, 'nuxt.schema.json')
  const dts = join(schemaDir, 'nuxt.schema.d.ts')
  if (!existsSync(json)) {
    writeFileSync(json, '{}\n', 'utf8')
  }
  if (!existsSync(dts)) {
    writeFileSync(dts, '/** Placeholder — replaced by Nuxt. */\nexport {}\n', 'utf8')
  }
}

function ensureDistDirs(buildDir: string) {
  mkdirSync(join(buildDir, 'dist', 'server'), { recursive: true })
  mkdirSync(join(buildDir, 'dist', 'client'), { recursive: true })
}

export default defineNuxtModule({
  meta: {
    name: 'wrr-ensure-nuxt-schema-paths',
    enforce: 'pre',
  },
  setup(_options, nuxt) {
    const touch = () => {
      ensureSchemaArtifacts(nuxt.options.buildDir)
      ensureDistDirs(nuxt.options.buildDir)
    }
    nuxt.hook('schema:beforeWrite', touch)
    nuxt.hook('build:before', touch)
  },
})
