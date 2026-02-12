// Web Ranking Reports — create sites, integrations, reports collections.
// In PocketBase 0.22 the migrate() callback only receives (db), not app, so we cannot
// create collections from JS migration. Use the script instead:
//   cd apps/web && node scripts/create-collections.mjs
// Or create collections manually per docs/POCKETBASE_SETUP.md
migrate((db) => {
  // No-op: collections are created via scripts/create-collections.mjs or Admin UI
}, (db) => {});
