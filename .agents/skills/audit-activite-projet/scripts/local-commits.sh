#!/usr/bin/env bash
# local-commits.sh — commits côté local (toutes les refs), fetch + filtre optionnel.
# Usage: local-commits.sh [--pattern TEXTE] [--no-fetch]
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: local-commits.sh [--pattern TEXTE] [--no-fetch]"
  echo "  git fetch --all puis git log --all sur toutes les refs."
  echo "  --pattern: filtre ERE insensible à la casse (login|email|nom réel)."
  echo "  Sans --pattern: tous les commits."
}

require_git
FETCH=1
PATTERN=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --no-fetch) FETCH=0; shift ;;
    --pattern) PATTERN="${2:?--pattern: valeur requise}"; shift 2 ;;
    --pattern=*) PATTERN="${1#*=}"; shift ;;
    *) echo "ERREUR: argument inattendu: $1" >&2; usage; exit 1 ;;
  esac
done
if [[ "$FETCH" == "1" ]]; then
  git fetch --all --quiet
fi
if [[ -n "$PATTERN" ]]; then
  git log --all --format='%h %an <%ae> %ad %s' --date=short | grep -iE -- "$PATTERN" \
    || echo "(aucun commit ne correspond à '$PATTERN')" >&2
else
  git log --all --format='%h %an <%ae> %ad %s' --date=short
fi
