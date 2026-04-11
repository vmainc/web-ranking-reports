#!/usr/bin/env bash
# Run Nuxt typegen on macOS only (keeps .nuxt/schema in sync for the IDE).
# Used by .vscode/tasks.json on folder open.
# Uses a login shell so GUI Cursor/VS Code picks up nvm/fnm/Homebrew Node in PATH.
set -e
[[ "$(uname -s)" == "Darwin" ]] || exit 0
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec bash -lic "cd \"${ROOT}/apps/web\" && npm run prepare"
