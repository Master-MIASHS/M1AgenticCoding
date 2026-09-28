---
name: flux-git-et-versionnement
description: Gère le cycle de vie Git, le nommage des branches, l'hygiène pré-commit et le format strict des messages de commit.
---

## Compétence : flux-git-et-versionnement

- **Interdiction formelle de pousser directement sur main.** Tout passe par une branche dédiée et une Pull Request.
- **Branches éphémères :** durée de vie de 1 à 3 jours max, basées sur main à jour.
- **Commits atomiques :** 1 commit = 1 seule action logique.
- **Nommage des branches :** `feat/<nom>`, `fix/<nom>`, `chore/<nom>`, `docs/<nom>`.
- **Format strict des commits :**
  `<type>(<périmètre>): [Groupe X] <description à l'infinitif> (#<issue>)`
  Types autorisés : `feat`, `fix`, `chore`, `docs`, `refactor`, `test`. En français, tout en minuscules, sans point final.
- **Hygiène pré-commit :** Aucun secret (.env), aucun dossier de build (dist/, node_modules/), tests validés via `npm test`.

## Quand l'utiliser

- Avant de créer une branche, un commit ou une Pull Request.
- Avant tout merge (relecture de l'historique et vérification du format).
- Quand un commit est refusé par un hook ou signalé en relecture.

## Processus type

1. Mettre `main` à jour (`git pull origin main`).
2. Créer la branche éphémère depuis `main` (`feat/`, `fix/`, `chore/` ou `docs/`).
3. Travailler en commits atomiques, au format strict.
4. Valider localement : `npm test` (voir `ci-cd-et-automatisation`).
5. Pousser la branche et ouvrir la PR (voir `prepare-pr`).
6. Rebaser sur `main` à jour si la branche dépasse 3 jours, puis re-valider.
7. Fermer la branche après merge.

## Drapeaux rouges

- Push direct sur `main`.
- Commit mêlant plusieurs actions logiques.
- Format de commit non conforme (type invalide, groupe `[Groupe X]` manquant, description non à l'infinitif, point final).
- Commit sans `npm test` validé.
- Fichier `.env`, `dist/` ou `node_modules/` dans le diff.

## Liens avec les autres skills

- `prepare-pr` : préparation du titre et du corps de la PR.
- `ci-cd-et-automatisation` : Quality Gate à exécuter avant tout commit et tout push.
- `verification-before-completion` : ne jamais affirmer un état git ou un test vert sans l'avoir exécuté.
- `resolving-merge-conflicts` : gestion des conflits au rebase ou au merge.
- `bugfix` et `feat-dev` : workflows qui consomment ces règles (type `fix` et `feat`).
