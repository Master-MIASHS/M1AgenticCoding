# Contributing — Casino Fantôme

## Règle d'or (architecture)

> **Chaque groupe ne modifie QUE son propre dossier.**

La communication entre groupes se fait uniquement via des **contrats de
fonctions / interfaces documentés**.

### Point d'accès unique au Core

`/src/services/coreService.js` est le **SEUL point d'accès** au Core pour
`/src/app/`, `/src/pages/`, `/src/components/`, `/src/game-ui/`.

**Interdit :** ces dossiers ne doivent JAMAIS importer `/src/core/core.js`
ou un module interne du Core directement.

```
UI / Pages / App / Game UI   ->   coreService.js   ->   Core
```

Et **jamais** : `UI ──────────────► Core interne`.

### Source de hasard unique

`/src/core/rng.js` est la seule source de hasard. Aucun fichier n'utilise
`Math.random()` directement. Les jeux interprètent uniquement les résultats
bruts de `roll()`.

## Stratégie de branches

- `main` : branche stable, ne reçoit que des merges depuis `develop`
  via Pull Request.
- `develop` : branche d'intégration, reçoit les merges des branches de
  feature via Pull Request. Jamais de push direct.
- `setup/*` : branches d'infrastructure / architecture
  (ex. `setup/architecture-initiale`).
- `feat/<groupe>-<feature>` : branches de fonction, créées depuis `develop`.
- `fix/<issue>` : branches de correction, créées depuis `develop`.

## Pull Requests

- Chaque PR cible `develop` et décrit : ce qui change, quel groupe / dossier,
  et quel contrat est impacté (le cas échéant).
- Une PR ne doit **pas** modifier un dossier appartenant à un autre groupe
  (sauf via un contrat convenu).
- La CI (`.github/workflows/ci.yml`) doit être **verte** (build + tests).

## Intégration entre groupes

- Travailler uniquement dans son propre dossier.
- Si une fonction d'un autre groupe est nécessaire, s'appuyer sur le
  **contrat documenté** (API publique du Core via `coreService`, ou une
  interface documentée).
- Si le contrat manque ou est insuffisant, **ne pas** importer des modules
  internes : ouvrir une discussion / issue pour faire évoluer le contrat.

## Gestion des conflits

- Rebase (ou merge) la branche sur le `develop` à jour avant de demander une PR.
- Conflit dans son propre dossier : le résoudre soi-même.
- Conflit sur un fichier partagé (ex. `coreService.js`, `core/core.js`) :
  coordonner avec le groupe responsable. Ces fichiers sont des fichiers de
  **contrat** : toute modification y est soumise à validation.

## Règles minimales avant merge

- [ ] `npm install` fonctionne
- [ ] `npm run build` sans erreur
- [ ] `npm test` vert
- [ ] Aucun `Math.random()` hors `src/core/rng.js`
- [ ] Aucun import direct du Core depuis `app/`, `pages/`, `components/`, `game-ui/`
- [ ] Aucun secret, `.env`, `node_modules/`, fichier de build commité
- [ ] Seul son propre dossier a été modifié (ou un contrat convenu)

## Groupe 5 — Intégration, tests et qualité

Le Groupe 5 est responsable des éléments transversaux : stratégie Git,
intégration, CI/CD, tests et vérification des contrats. À l'initialisation,
une base fonctionnelle est fournie (CI, test minimal, règles ci-dessus) et
évoluera au fil du développement.