#!/usr/bin/env bash
# project-items.sh — items (issues/PRs) d'un projet.
# Usage: project-items.sh [owner] --number N
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: project-items.sh [owner] --number N"
  echo "  Items (issues/PRs) du projet de numéro N."
  echo "  Owner par défaut: celui du repo courant (git remote origin)."
}

require_gh
parse_owner_args "$@"
if [[ -z "$NUMBER" ]]; then
  echo "ERREUR: --number N (numéro du projet) est requis" >&2
  usage
  exit 1
fi
gh project item-list "$NUMBER" --owner "$OWNER"
