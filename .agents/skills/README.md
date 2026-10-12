# Documentation des skills

Skills disponibles pour les agents du projet Casino Fantôme. Chaque skill vit dans son propre dossier avec un `SKILL.md`.

## 1. Skills d'outillage et d'expertise transverse

| Skill | Rôle |
|---|---|
| `architecte-integration` | Vérifie les contrats d'intégration entre groupes avant ouverture de PR |
| `changelog-generator` | Compile les PR mergées en changelog par groupe et par type |
| `flaky-test-detector` | Isole les tests instables et propose correctif ou quarantaine tracée |
| `pr-checklist` | Vérifie la « Définition de terminé » juste avant d'ouvrir une PR |
| `pr-validation` | Valider une PR selon les critères du projet |
| `test-coverage-report` | État des lieux de la couverture de tests par groupe |
| `branch-creator` | Crée la branche obligatoire avant toute feature |
| `expert-git-commit-push` | Préparer le staging, le message de commit et le push d'une branche |
| `expert-javascript` | Expertise technique par domaine (JavaScript) |
| `expert-react` | Expertise technique par domaine (React) |
| `expert-securite-frontend` | Expertise technique par domaine (Sécurité) |
| `expert-tests-node` | Expertise technique par domaine (Tests Node) |
| `expert-vite` | Expertise technique par domaine (Vite) |
| `skills-structure-validator` | Linter de conformité des dossiers de skills |
| `audit-activite-projet` | Scripts d'agrégation de l'activité GitHub du projet (commits, PR, issues) |

## 2. Skills du projet (créées à l'origine dans ce projet)

| Skill | Description |
|---|---|
| `flux-git-et-versionnement` | Cycle de vie Git, nommage des branches, hygiène pré-commit, format strict des commits |
| `ingenierie-ui-frontend` | Conception et règles d'architecture des composants React |
| `relecture-et-qualite` | Grille d'évaluation et règles de la relecture de code |
| `ci-cd-et-automatisation` | Pipeline CI/CD GitHub Actions et Quality Gate |
| `dev-par-les-tests` | Méthodologie TDD, runner natif `node --test` |
| `jsdoc-et-documentation` | Standard de documentation JSDoc |
| `utiliser-core` | Utiliser une fonction du Core (état, RNG, sauvegarde) depuis G2/G3/G4 |
| `jeux-g2` | Implémentation des règles et de la logique des jeux (G2) |
| `game-ui` | Développer l'interface des jeux du casino (G3) |
| `jeux-ui-g3` | Monter une UI de jeu (G4), brancher l'orchestrateur G2 ou ajouter une UI (G3) |
| `pages-et-routage-g4` | Gestion des pages et de la navigation de l'application (G4) |
| `composants-communs-g4` | Affichage transverse : solde, notification, loader, sidebar (G4) |

## 3. Skills adoptées depuis GitHub

| Skill | Source | Licence |
|---|---|---|
| `systematic-debugging` | [obra/superpowers](https://github.com/obra/superpowers) | MIT |
| `verification-before-completion` | [obra/superpowers](https://github.com/obra/superpowers) | MIT |
| `requesting-code-review` | [obra/superpowers](https://github.com/obra/superpowers) | MIT |
| `receiving-code-review` | [obra/superpowers](https://github.com/obra/superpowers) | MIT |
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills) | Apache-2.0 |
| `resolving-merge-conflicts` | [mattpocock/skills](https://github.com/mattpocock/skills) | MIT |

## 4. Skills adoptées depuis l'écosystème Qwen

| Skill | Description | Source | Licence |
|---|---|---|---|
| `bugfix` | Workflow reproduce-first de correction de bug depuis une issue GitHub | [QwenLM/qwen-code](https://github.com/QwenLM/qwen-code) | MIT |
| `feat-dev` | Workflow de bout en bout d'une feature : investigation, conception, tests, implémentation, vérification, relecture | [QwenLM/qwen-code](https://github.com/QwenLM/qwen-code) | MIT |
| `prepare-pr` | Préparation du titre et du corps d'une PR au format strict du projet | [QwenLM/qwen-code](https://github.com/QwenLM/qwen-code) | MIT |
Toutes les skills adoptées (GitHub et Qwen) ont été traduites en français et adaptées aux règles du projet (`coreService.js`, `node --test`, `rng.js`, format de commit `[Groupe X]`). L'attribution figure dans le frontmatter (`license`, `metadata.source`) de chaque fichier.

### Notes sur l'écosystème Qwen

- **QwenLM/qwen-code** est l'agent de codage officiel de Qwen. Il charge les skills de `.qwen/skills/` (dépôt) et `~/.qwen/skills/` (global), avec le même format `SKILL.md` (frontmatter `name` + `description`, noms Unicode autorisés).
- Les 3 skills ci-dessus proviennent des 22 skills intégrées de qwen-code ; les plus spécifiques CI sandbox (`verify-pr`, `triage`, `deflake`, …) ont été écartées comme non transposables à ce projet.
- Pour utiliser ces skills avec Qwen Code, les copier (ou les lier) dans `.qwen/skills/` à la racine du dépôt.

## Proposer une nouvelle skill

1. Créer `.agents/skills/<nom-de-la-skill>/SKILL.md` (nom : minuscules, séparés par `-`, identique au nom du dossier).
2. Frontmatter obligatoire : `name` et `description` (1-1024 caractères, spécifique).
3. Corps en français, orienté action.
4. Passer par une branche `docs/<nom>` et une Pull Request (voir `flux-git-et-versionnement`).
