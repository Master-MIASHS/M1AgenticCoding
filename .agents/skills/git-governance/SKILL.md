---
name: git-governance
description: "Source unique de vérité pour le cycle de vie Git : création de branches, formatage des commits et stratégie de push."
---

## Compétence : git-governance

L'agent utilise cette skill pour garantir la cohérence du dépôt et l'historique du projet. Tout développement doit suivre strictement ce cycle : **Issue $\rightarrow$ Branche $\rightarrow$ Commits Atomiques $\rightarrow$ Push $\rightarrow$ PR**.

### 1. Création de la Branche (Standard Unique)

Toute feature ou correction doit être développée sur une branche dédiée créée à partir de `main` à jour. **Le push direct sur `main` est strictement interdit.**

**Format de nommage obligatoire :**
`<SKOTCKER>-<feature>(<nomgithub>)`

- `<SKOTCKER>` : Variable `SKOTCKER` du fichier `.env` (ex: `Groupe5`).
- `<feature>` : Description courte, minuscules, kebab-case (ex: `noirjack`, `fix-auth`).
- `<nomgithub>` : Nom GitHub de l'auteur (via `git config user.name`), sanitisé (espaces $\rightarrow$ `-`).

**Exemple :** `Groupe5-noirjack(Anthony-Miranda)`

**Workflow de création :**
1. Mettre `main` à jour : `git fetch origin` $\rightarrow$ `git checkout main` $\rightarrow$ `git pull origin main`.
2. Créer la branche : `git checkout -b "Groupe5-noirjack(Anthony-Miranda)"` (utiliser des guillemets pour les parenthèses).
3. Pousser la branche : `git push -u origin "Groupe5-noirjack(Anthony-Miranda)"`.

### 2. Formatage des Commits (Standard Unique)

Les commits doivent être atomiques (une seule action logique par commit).

**Format obligatoire :**
`<type>(<périmètre>): [Groupe X] <description à l'infinitif> (#<issue>)`

- `<type>` : `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
- `<périmètre>` : Le module ou fichier impacté (ex: `core`, `ui`, `auth`).
- `[Groupe X]` : Le groupe de l'auteur (ex: `[Groupe 5]`).
- `<description>` : Action à l'infinitif, minuscules, sans point final.
- `#<issue>` : Référence à l'issue GitHub liée.

**Exemple :** `feat(core): [Groupe 5] implémenter le moteur de RNG (#213)`

### 3. Hygiène et Sécurité

- **Interdiction formelle** de committer : `.env`, `dist/`, `node_modules/`.
- **Vérification obligatoire** : Exécuter `npm run lint` et `npm test` avant tout commit et push.
- **Force Push** : Interdiction absolue d'utiliser `git push --force` sur des branches partagées.

### 4. Quand l'utiliser

- Avant toute manipulation Git (création de branche, commit, push).
- Lors de la relecture d'un historique de commits.
- Avant l'ouverture d'une Pull Request.

---
Lien avec `prepare-pr` pour la rédaction finale de la demande de fusion.
