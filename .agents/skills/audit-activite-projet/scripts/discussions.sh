#!/usr/bin/env bash
# discussions.sh — discussions du repo (GraphQL uniquement, pas de REST).
# Usage: discussions.sh [owner/repo] [--pattern TEXTE]
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: discussions.sh [owner/repo] [--pattern TEXTE]"
  echo "  Discussions (numéro, titre, auteur, corps, commentaires) via GraphQL."
  echo "  --pattern: ne garder que les lignes correspondant (grep -iE: login|prénom|nom)."
  echo "  Repo par défaut: détecté depuis git remote origin."
}

require_gh
OWNER_ARG=""; REPO_ARG=""; PATTERN=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --pattern) PATTERN="${2:?--pattern: valeur requise}"; shift 2 ;;
    --pattern=*) PATTERN="${1#*=}"; shift ;;
    -*) echo "ERREUR: option inconnue: $1" >&2; usage; exit 1 ;;
    *)
      if [[ -z "$OWNER_ARG" ]]; then OWNER_ARG="$1"
      elif [[ -z "$REPO_ARG" ]]; then REPO_ARG="$1"
      else echo "ERREUR: argument inattendu: $1" >&2; usage; exit 1
      fi
      shift ;;
  esac
done
resolve_repo "$OWNER_ARG" "$REPO_ARG"
out=$(gh api graphql \
  -f owner="$OWNER" \
  -f name="$REPO" \
  -f query='query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { discussions(first: 30) { nodes { number title author { login } bodyText comments(first: 100) { nodes { author { login } createdAt body } } } } } }')
render() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s\n' "$out" | jq .
  else
    printf '%s\n' "$out"
  fi
}
if [[ -n "$PATTERN" ]]; then
  render | grep -inE -- "$PATTERN" \
    || echo "(aucune discussion ne mentionne '$PATTERN')" >&2
else
  render
fi
