#!/usr/bin/env bash
# branches.sh — branches distantes.
# Usage: branches.sh [remote]
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: branches.sh [remote]"
  echo "  Branches distantes (préfixes feat/fix/chore + nom). Remote par défaut: origin."
}

require_git
REMOTE="origin"
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    -*) echo "ERREUR: option inconnue: $1" >&2; usage; exit 1 ;;
    *) REMOTE="$1"; shift ;;
  esac
done
git ls-remote --heads "$REMOTE"
