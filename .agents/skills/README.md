# Documentation des skills

Skills disponibles pour les agents du projet Casino Fantôme. Chaque skill vit dans son propre dossier avec un `SKILL.md`.

| Skill | Rôle |
|---|---|
| `architecte-integration` | Vérifie les contrats d'intégration entre groupes avant ouverture de PR |
| `changelog-generator` | Compile les PR mergées en changelog par groupe et par type |
| `flaky-test-detector` | Isole les tests instables et propose correctif ou quarantaine tracée |
| `pr-checklist` | Vérifie la "Définition de terminé" avant l'ouverture d'une PR |
| `test-coverage-report` | État des lieux de la couverture de tests par groupe |

| `branch-creator` | Crée la branche `Groupe<X>-<feature>(<nomgithub>)` obligatoire avant toute feature (source de vérité pour la convention de nommage) |
| `expert-javascript`, `expert-react`, `expert-securite-frontend`, `expert-tests-node`, `expert-vite` | Expertise technique par domaine |
| `skills-structure-validator` | Linter de conformité des dossiers de skills (attention : décrit encore `skills/` comme racine, à mettre à jour suite à la migration vers `.agents/skills/`) |
| `audit-activite-projet` | Scripts d'agrégation de l'activité GitHub du projet (commits, PR, issues) |
