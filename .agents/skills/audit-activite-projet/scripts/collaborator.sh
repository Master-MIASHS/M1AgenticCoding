#!/usr/bin/env bash
# collaborator.sh — vérifie si un utilisateur est collaborateur du repo.
# Usage: collaborator.sh [owner/repo] --login LOGIN
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: collaborator.sh [owner/repo] --login LOGIN"
  echo "  200 = collaborateur (permissions affichées), 404 = non, 403 = droit insuffisant."
  echo "  Repo par défaut: détecté depuis git remote origin."
}

require_gh
parse_repo_args "$@"
if [[ -z "$LOGIN" ]]; then
  echo "ERREUR: --login LOGIN est requis" >&2
  usage
  exit 1
fi
if out=$(gh api "repos/$OWNER/$REPO/collaborators/$LOGIN" 2>&1); then
  echo "$LOGIN est collaborateur de $OWNER/$REPO"
  perms=$(gh api "repos/$OWNER/$REPO/collaborators?per_page=100" \
    --jq ".[] | select(.login == \"$LOGIN\") | {login, permissions}" 2>/dev/null || true)
  if [[ -n "$perms" ]]; then
    printf '%s\n' "$perms"
  fi
else
  case "$out" in
    *403*) echo "Droit insuffisant (403) pour vérifier $LOGIN — indiquer la permission manquante, ne pas conclure à l'inactivité." ;;
    *404*) echo "$LOGIN n'est pas collaborateur de $OWNER/$REPO (404)." ;;
    *) echo "Vérification impossible: $out" >&2; exit 1 ;;
  esac
fi
