#!/usr/bin/env bash
# Fail if the working tree or staged release artifacts contain secrets or runtime junk.
# Does not print secret values — only paths and rule names.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

failures=0

fail() {
  echo "FAIL: $1" >&2
  failures=$((failures + 1))
}

echo "==> Release cleanliness check (root: $ROOT)"

# --- Tracked forbidden paths ---
FORBIDDEN_TRACKED=(
  '.env'
  'apps/web/.env'
  'infra/.env'
  'apps/pb/pb_data'
  'apps/pb/storage'
  'apps/pb/pocketbase'
  'apps/web/.nuxt'
  'apps/web/.output'
  'apps/web/dist'
  'node_modules'
  'apps/web/node_modules'
)

for path in "${FORBIDDEN_TRACKED[@]}"; do
  if [[ "$path" == "apps/pb/storage" ]]; then
    extra=$(git ls-files 'apps/pb/storage' | grep -v '^apps/pb/storage/\.gitkeep$' || true)
    if [[ -n "$extra" ]]; then
      fail "Forbidden PocketBase storage files tracked (keep only .gitkeep): see git ls-files apps/pb/storage"
    fi
    continue
  fi
  if git ls-files --error-unmatch "$path" >/dev/null 2>&1; then
    fail "Forbidden path is tracked by git: $path"
  fi
done

# --- Untracked / present junk on disk (warn in dev, fail if RELEASE_STRICT=1) ---
DISK_JUNK=(
  'apps/web/.output'
  'apps/web/.nuxt'
  'apps/web/node_modules'
  'apps/pb/pb_data'
  'apps/pb/storage'
)

for path in "${DISK_JUNK[@]}"; do
  if [[ -e "$path" ]]; then
    if [[ "${RELEASE_STRICT:-0}" == "1" ]]; then
      fail "Runtime artifact present on disk (remove before packaging): $path"
    else
      echo "WARN: runtime artifact present (ok for local dev): $path"
    fi
  fi
done

# --- Committed env files (except examples) ---
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  case "$f" in
    *.env.example|**/.env.example) continue ;;
    *)
      fail "Env file tracked in git (use .env.example only): $f"
      ;;
  esac
done < <(git ls-files | grep -E '(^|/)\.env(\.|$)' || true)

# --- Secret-like patterns in tracked source (names only) ---
PATTERN_NAMES=(
  'Stripe live secret key'
  'Stripe test secret key'
  'AWS access key'
  'Private key block'
  'Google OAuth client secret assignment'
)

PATTERN_REGEXES=(
  'sk_live_[A-Za-z0-9]{8,}'
  'sk_test_[A-Za-z0-9]{8,}'
  'AKIA[0-9A-Z]{16}'
  'BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY'
  'client_secret["\x27[:space:]]*=[[:space:]]*["\x27][^"\x27]{8,}'
)

for i in "${!PATTERN_REGEXES[@]}"; do
  name="${PATTERN_NAMES[$i]}"
  regex="${PATTERN_REGEXES[$i]}"
  if git grep -l -E "$regex" -- ':!*.example' ':!docs/LAUNCH_SECURITY.md' ':!scripts/check-release-clean.sh' ':!apps/pb/types.d.ts' 2>/dev/null | grep -q .; then
    matches=$(git grep -l -E "$regex" -- ':!*.example' ':!docs/LAUNCH_SECURITY.md' ':!scripts/check-release-clean.sh' ':!apps/pb/types.d.ts' 2>/dev/null | head -5)
    fail "$name pattern found in tracked files (review, do not commit secrets):
$matches"
  fi
done

# --- Mac junk ---
if git ls-files | grep -qE '(^|/)\.DS_Store$|__MACOSX'; then
  fail "macOS junk files tracked (.DS_Store or __MACOSX)"
fi

if [[ "$failures" -gt 0 ]]; then
  echo "" >&2
  echo "$failures check(s) failed. Fix before release. See docs/LAUNCH_SECURITY.md" >&2
  exit 1
fi

echo "OK: release cleanliness checks passed."
