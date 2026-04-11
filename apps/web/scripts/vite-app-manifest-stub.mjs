/**
 * Vite resolves `import("#app-manifest")` in Nuxt’s manifest composable during client analysis
 * even when that branch is dead at runtime. Stub avoids spurious pre-transform errors in some
 * Nuxt 3.21.1 / Vite 7.3.x combos. Safe while `experimental.appManifest` is off (default).
 */
export default {}
