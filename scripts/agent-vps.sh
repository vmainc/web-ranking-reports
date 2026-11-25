#!/usr/bin/env bash
# Cursor Cloud Agent: SSH to production VPS using Cursor Secrets (never commit keys).
# Required secrets: VPS_SSH_HOST, VPS_SSH_USER, VPS_SSH_PRIVATE_KEY
set -euo pipefail

if [[ -z "${VPS_SSH_HOST:-}" || -z "${VPS_SSH_USER:-}" || -z "${VPS_SSH_PRIVATE_KEY:-}" ]]; then
  echo "Missing VPS_SSH_HOST, VPS_SSH_USER, or VPS_SSH_PRIVATE_KEY in environment." >&2
  exit 1
fi

KEY_FILE="${TMPDIR:-/tmp}/cursor-vps-ssh-$$"
trap 'rm -f "$KEY_FILE"' EXIT
umask 077
printf '%s\n' "$VPS_SSH_PRIVATE_KEY" >"$KEY_FILE"

exec ssh -i "$KEY_FILE" \
  -o StrictHostKeyChecking=accept-new \
  -o BatchMode=yes \
  "${VPS_SSH_USER}@${VPS_SSH_HOST}" "$@"