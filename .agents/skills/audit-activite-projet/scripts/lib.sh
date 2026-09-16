#!/usr/bin/env bash
# lib.sh — utilitaires partagés des scripts d'audit (à sourcer, jamais à exécuter).
# Compatible bash 3.2 (macOS).
#
# Conventions communes à tous les scripts:
#   - repo : [owner/repo] en positionnel (ou [owner] [repo]) ; défaut = git remote origin
#   - utilisateur audité : --login LOGIN (optionnel = pas de filtre)
#   - --number N : numéro de la ressource individuelle (PR, issue, projet)
#   - --limit N  : per_page (défaut 100)

set -euo pipefail

if [[ "${BASH_SOURCE[0]:-}" == "$0" ]]; then
  echo "lib.sh est à sourcer (source lib.sh), pas à exécuter directement." >&2
  exit 1
fi

detect_owner_repo() {
  DETECTED_OWNER=""
  DETECTED_REPO=""
  local url path
  url=$(git remote get-url origin 2>/dev/null || true)
  if [[ -n "$url" ]]; then
    path=$(printf '%s' "$url" | sed -E 's#^(git@[^/]+:|https?://[^/]+/)##; s#\.git$##')
    DETECTED_OWNER="${path%%/*}"
    DETECTED_REPO="${path#*/}"
  fi
  return 0
}

resolve_repo() {
  OWNER="${1:-}"
  REPO="${2:-}"
  if [[ -z "$REPO" && "$OWNER" == */* ]]; then
    REPO="${OWNER#*/}"
    OWNER="${OWNER%%/*}"
  fi
  if [[ -z "$OWNER" || -z "$REPO" ]]; then
    detect_owner_repo
    if [[ -z "$OWNER" ]]; then OWNER="$DETECTED_OWNER"; fi
    if [[ -z "$REPO" ]]; then REPO="$DETECTED_REPO"; fi
  fi
  if [[ -z "$OWNER" || -z "$REPO" ]]; then
    echo "ERREUR: repo non résolvable — passer [owner/repo] en argument" >&2
    exit 1
  fi
}

require_gh() {
  if ! command -v gh >/dev/null 2>&1; then
    echo "ERREUR: la commande 'gh' est requise (https://cli.github.com/)" >&2
    exit 1
  fi
}

require_git() {
  if ! command -v git >/dev/null 2>&1; then
    echo "ERREUR: la commande 'git' est requise" >&2
    exit 1
  fi
}

check_int() {
  if ! [[ "$1" =~ ^[0-9]+$ ]]; then
    echo "ERREUR: $2 doit être un entier (reçu: $1)" >&2
    exit 1
  fi
}

login_jq_filter() {
  # $1 = champ jq (ex: .author.login). Émet 'select(<champ> == "LOGIN")' ou '.' (no-op).
  if [[ -n "${LOGIN:-}" ]]; then
    printf 'select(%s == "%s")' "$1" "$LOGIN"
  else
    printf '.'
  fi
  return 0
}

parse_repo_args() {
  OWNER_ARG=""; REPO_ARG=""; LOGIN=""; NUMBER=""; LIMIT=100
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h|--help) usage; exit 0 ;;
      --login) LOGIN="${2:?--login: valeur requise}"; shift 2 ;;
      --login=*) LOGIN="${1#*=}"; shift ;;
      --number) NUMBER="${2:?--number: valeur requise}"; shift 2 ;;
      --number=*) NUMBER="${1#*=}"; shift ;;
      --limit) LIMIT="${2:?--limit: valeur requise}"; shift 2 ;;
      --limit=*) LIMIT="${1#*=}"; shift ;;
      -*) echo "ERREUR: option inconnue: $1" >&2; usage; exit 1 ;;
      *)
        if [[ -z "$OWNER_ARG" ]]; then OWNER_ARG="$1"
        elif [[ -z "$REPO_ARG" ]]; then REPO_ARG="$1"
        else echo "ERREUR: argument inattendu: $1" >&2; usage; exit 1
        fi
        shift ;;
    esac
  done
  check_int "$LIMIT" "--limit"
  if [[ -n "$NUMBER" ]]; then check_int "$NUMBER" "--number"; fi
  resolve_repo "$OWNER_ARG" "$REPO_ARG"
}

parse_owner_args() {
  OWNER_ARG=""; LOGIN=""; NUMBER=""; LIMIT=100
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h|--help) usage; exit 0 ;;
      --login) LOGIN="${2:?--login: valeur requise}"; shift 2 ;;
      --login=*) LOGIN="${1#*=}"; shift ;;
      --number) NUMBER="${2:?--number: valeur requise}"; shift 2 ;;
      --number=*) NUMBER="${1#*=}"; shift ;;
      --limit) LIMIT="${2:?--limit: valeur requise}"; shift 2 ;;
      --limit=*) LIMIT="${1#*=}"; shift ;;
      -*) echo "ERREUR: option inconnue: $1" >&2; usage; exit 1 ;;
      *)
        if [[ -z "$OWNER_ARG" ]]; then OWNER_ARG="$1"
        else echo "ERREUR: argument inattendu: $1" >&2; usage; exit 1
        fi
        shift ;;
    esac
  done
  check_int "$LIMIT" "--limit"
  if [[ -n "$NUMBER" ]]; then check_int "$NUMBER" "--number"; fi
  if [[ -n "$OWNER_ARG" ]]; then
    OWNER="$OWNER_ARG"
  else
    detect_owner_repo
    OWNER="$DETECTED_OWNER"
  fi
  if [[ -z "$OWNER" ]]; then
    echo "ERREUR: owner non résolvable — passer [owner] en argument" >&2
    exit 1
  fi
}
