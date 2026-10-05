# Documentation des skills

Skills disponibles pour les agents du projet Casino Fantôme. Chaque skill vit dans son propre dossier avec un `SKILL.md`.

| Skill | Rôle |
|---|---|
| `architecte-integration` | Vérifie les contrats d'intégration entre groupes avant ouverture de PR |
| `changelog-generator` | Compile les PR mergées en changelog par groupe et par type |
| `flaky-test-detector` | Isole les tests instables et propose correctif ou quarantaine tracée |
| `pr-checklist` | Vérifie la "Définition de terminé" avant l'ouverture d'une PR |
| `test-coverage-report` | État des lieux de la couverture de tests par groupe |
| `unit-test-scaffolder` | Génère le squelette d'un test `node:test` pour un fichier source non testé |
| `core-invariant-tests` | Vérifie qu'il existe un test dédié pour chaque invariant métier du jeu |
| `mock-coreservice-validator` | Vérifie que les mocks de `coreService.js` dans les tests collent à la vraie API |
| `test-naming-convention` | Vérifie l'emplacement/nommage des fichiers de test (miroir de `src/` sous `tests/unit/`) |
| `assertion-strength-checker` | Détecte les tests creux (assertions toujours vraies, aucune assertion) |
| `branch-creator` | Crée la branche `Groupe<X>-<feature>(<nomgithub>)` obligatoire avant toute feature (source de vérité pour la convention de nommage) |
| `expert-javascript`, `expert-react`, `expert-securite-frontend`, `expert-tests-node`, `expert-vite` | Expertise technique par domaine |
| `skills-structure-validator` | Linter de conformité des dossiers de skills (attention : décrit encore `skills/` comme racine, à mettre à jour suite à la migration vers `.agents/skills/`) |
| `audit-activite-projet` | Scripts d'agrégation de l'activité GitHub du projet (commits, PR, issues) |

## Skills du projet (créées à l'origine dans ce projet)

| Skill | Description |
|---|---|
| [flux-git-et-versionnement](flux-git-et-versionnement/SKILL.md) | Cycle de vie Git, nommage des branches, hygiène pré-commit, format strict des commits. |
| [ingenierie-ui-frontend](ingenierie-ui-frontend/SKILL.md) | Conception et règles d'architecture des composants React. |
| [relecture-et-qualite](relecture-et-qualite/SKILL.md) | Grille d'évaluation et règles de la relecture de code. |
| [ci-cd-et-automatisation](ci-cd-et-automatisation/SKILL.md) | Pipeline CI/CD GitHub Actions et Quality Gate. |
| [dev-par-les-tests](dev-par-les-tests/SKILL.md) | Méthodologie TDD, runner natif `node --test`. |
| [jsdoc-et-documentation](jsdoc-et-documentation/SKILL.md) | Standard de documentation JSDoc. |

## Skills adoptées depuis GitHub

| Skill | Source | Licence |
|---|---|---|
| [systematic-debugging](systematic-debugging/SKILL.md) | [obra/superpowers](https://github.com/obra/superpowers) | MIT |
| [verification-before-completion](verification-before-completion/SKILL.md) | [obra/superpowers](https://github.com/obra/superpowers) | MIT |
| [requesting-code-review](requesting-code-review/SKILL.md) | [obra/superpowers](https://github.com/obra/superpowers) | MIT |
| [receiving-code-review](receiving-code-review/SKILL.md) | [obra/superpowers](https://github.com/obra/superpowers) | MIT |
| [frontend-design](frontend-design/SKILL.md) | [anthropics/skills](https://github.com/anthropics/skills) | Apache-2.0 |
| [resolving-merge-conflicts](resolving-merge-conflicts/SKILL.md) | [mattpocock/skills](https://github.com/mattpocock/skills) | MIT |

## Skills adoptées depuis l'écosystème Qwen

| Skill | Description | Source | Licence |
|---|---|---|---|
| [bugfix](bugfix/SKILL.md) | Workflow reproduce-first de correction de bug depuis une issue GitHub. | [QwenLM/qwen-code](https://github.com/QwenLM/qwen-code) | MIT |
| [feat-dev](feat-dev/SKILL.md) | Workflow de bout en bout d'une feature : investigation, conception, tests, implémentation, vérification, relecture. | [QwenLM/qwen-code](https://github.com/QwenLM/qwen-code) | MIT |
| [prepare-pr](prepare-pr/SKILL.md) | Préparation du titre et du corps d'une PR au format strict du projet. | [QwenLM/qwen-code](https://github.com/QwenLM/qwen-code) | MIT |

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
