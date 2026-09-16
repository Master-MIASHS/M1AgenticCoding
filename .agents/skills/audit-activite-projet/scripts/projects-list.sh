#!/usr/bin/env bash
# projects-list.sh — projets (tableaux Kanban) de l'owner.
# Usage: projects-list.sh [owner]
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: projects-list.sh [owner]"
  echo "  Numéro + titre des projets de l'owner."
  echo "  Owner par défaut: celui du repo courant (git remote origin)."
}

require_gh
parse_owner_args "$@"
gh project list --owner "$OWNER"
