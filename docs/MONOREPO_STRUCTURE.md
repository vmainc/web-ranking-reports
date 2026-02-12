# Monorepo Folder Structure

Repo root can be named e.g. `web-ranking-reports` or `WEB RANKING REPORTS`.

```
<repo-root>/
├── apps/
│   ├── web/                    # Nuxt 3 frontend
│   │   ├── app.vue
│   │   ├── nuxt.config.ts
│   │   ├── tailwind.config.js
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env.example
│   │   ├── assets/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── layouts/
│   │   ├── middleware/
│   │   ├── pages/
│   │   ├── public/
│   │   ├── services/
│   │   └── types/
│   │
│   └── pb/                     # PocketBase
│       ├── pocketbase           # binary (downloaded)
│       ├── pb_hooks/            # optional server hooks
│       ├── pb_migrations/       # optional migrations
│       └── schema/              # collection definitions (reference)
│
├── infra/
│   ├── docker-compose.yml
│   ├── Caddyfile
│   ├── .env.example
│   └── README.md                # deploy instructions
│
├── docs/
│   ├── PROJECT_PLAN.md
│   ├── MONOREPO_STRUCTURE.md
│   ├── LOCAL_COMMANDS.md
│   ├── POCKETBASE_SETUP.md
│   ├── ENV_VARIABLES.md
│   ├── GIT_WORKFLOW.md
│   └── GUARDRAILS.md
│
├── .gitignore
├── package.json                 # optional root package.json for scripts
└── README.md
```
