#!/usr/bin/env bash
# user.sh — identité d'un compte GitHub.
# Usage: user.sh --login LOGIN
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: user.sh --login LOGIN"
  echo "  login, nom, date de création du compte, nombre de repo publics."
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
  echo "ERREUR: --login LOGIN est requis" >&2
  usage
  exit 1
fi
gh api "users/$LOGIN" --jq '{login, name, created_at, public_repos}'
