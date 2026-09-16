#!/usr/bin/env bash
# search-commits.sh — commits globaux (tous repos) via l'index GitHub.
# Usage: search-commits.sh [--login LOGIN]
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: search-commits.sh [--login LOGIN]"
  echo "  Recherche globale de commits (index GitHub, en retard sur < 24 h)."
  echo "  Sans --login: l'utilisateur gh courant (gh api user)."
}

require_gh
LOGIN=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --login) LOGIN="${2:?--login: valeur requise}"; shift 2 ;;
    --login=*) LOGIN="${1#*=}"; shift ;;
    *) echo "ERREUR: argument inattendu: $1" >&2; usage; exit 1 ;;
  esac
done
if [[ -z "$LOGIN" ]]; then
  LOGIN=$(gh api user --jq '.login')
fi
gh api "search/commits?q=author:$LOGIN&per_page=100" \
  --jq '.total_count, (.items[] | {date: .commit.author.date, repo: .repository.full_name, msg: .commit.message})'
