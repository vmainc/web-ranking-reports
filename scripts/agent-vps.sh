#!/usr/bin/env bash
# Cursor Cloud Agent: SSH to production VPS (Cursor Secrets or personal store).
set -euo pipefail

STORE="${CURSOR_USER_STORE:-/cursor/stores/user}"

if [[ -z "${VPS_SSH_HOST:-}" && -f "$STORE/vps-ssh-host.txt" ]]; then
  VPS_SSH_HOST=$(tr -d '\r\n ' <"$STORE/vps-ssh-host.txt")
  export VPS_SSH_HOST
fi
if [[ -z "${VPS_SSH_USER:-}" && -f "$STORE/vps-ssh-user.txt" ]]; then
  VPS_SSH_USER=$(tr -d '\r\n ' <"$STORE/vps-ssh-user.txt")
  export VPS_SSH_USER
fi
if [[ -z "${VPS_SSH_PRIVATE_KEY:-}" && -f "$STORE/cursor-agent-vps-private-key.pem" ]]; then
  VPS_SSH_PRIVATE_KEY=$(cat "$STORE/cursor-agent-vps-private-key.pem")
  export VPS_SSH_PRIVATE_KEY
fi

if [[ -z "${VPS_SSH_HOST:-}" || -z "${VPS_SSH_USER:-}" || -z "${VPS_SSH_PRIVATE_KEY:-}" ]]; then
  echo "Missing VPS SSH config. Set VPS_SSH_* secrets or personal store files (see wrr-vps-access.md)." >&2
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