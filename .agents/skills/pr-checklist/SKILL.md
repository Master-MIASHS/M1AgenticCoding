---
name: pr-checklist
description: Vérifie qu'une tâche respecte la "Définition de terminé" d'AGENTS.md avant l'ouverture d'une PR (tests, lint, contrats, invariants, portée). À utiliser par tout agent personnel juste avant d'ouvrir sa PR.
---

# PR Checklist

## Quand l'utiliser

- Juste avant d'ouvrir une PR, pour tout agent personnel (G1 à G5).
- En relecture par un agent G5, pour vérifier qu'une PR reçue est complète avant la revue humaine.

## Ce que fait cette skill

Vérifie chaque point de la « Définition de terminé » (`AGENTS.md`) et rapporte un statut clair par point :

1. **Tests** : tests écrits ou mis à jour pour la tâche, et au vert (`npm test`).
2. **Lint** : au vert (`npm run lint`).
3. **CI** : le pipeline `ci.yml` passe (ou passera — vérifier localement ce qui est reproductible).
4. **Contrats** : si la tâche touche une interaction inter-groupes, les contrats concernés dans `docs/contracts/` sont respectés et **non modifiés** par la PR.
5. **Portée minimale** : la PR ne modifie que les fichiers du périmètre du groupe concerné (règle absolue n°9) — pas de refonte ni de nettoyage non demandé.
6. **Règles absolues** applicables à la tâche (pas de `Math.random()` hors RNG Core, pas de valeur en dur, UI qui ne décide pas d'un résultat, permissions vérifiées côté serveur/Core).
7. **Invariants métier** touchés par la tâche encore respectés (solde/XP indépendants, XP/niveau ne redescendent jamais, meilleur solde ne redescend jamais, jamais bloqué à 0 jeton).
8. **Ticket** : la PR est bien liée à un ticket, avec le compte rendu attendu (fichiers modifiés, tests lancés et résultat, points bloquants).
9. **Branche** : créée via `git-governance`, pas de push direct sur `main`.
10. **Taille de la PR** : diff raisonnable pour une seule tâche. Une PR anormalement large (beaucoup de fichiers hors périmètre attendu) est un signal d'alerte de portée débordante.
11. **Commits** : historique lisible (pas de commit type "wip", "fix fix fix" en rafale) — pas bloquant en soi, mais à signaler en ⚠️.
12. **Doublon de travail** : vérifier rapidement (`git log`, PR ouvertes) qu'aucune autre PR en cours ne touche déjà les mêmes fichiers pour une autre tâche — sinon remonter le conflit potentiel à G5 avant d'aller plus loin.
13. **Changement UI (G3/G4)** : si la tâche touche un composant visuel, vérifier qu'une capture d'écran ou une description du rendu est incluse dans la PR pour faciliter la revue humaine.
14. **Changement Core (G1)** : si la tâche touche l'API publique, vérifier explicitement que c'est un ajout/évolution **rétrocompatible** — un breaking change sur l'API publique doit être signalé en clair dans la PR (impact sur G2/G3/G4) et jamais fusionné sans que G5 en soit informé.
15. **Mocks encore présents** : si la tâche visait à remplacer un mock, vérifier qu'aucun résidu de mock actif ne subsiste (import mort, flag de bascule laissé activé par erreur).

## Sortie attendue

Une liste type checklist avec ✅ / ❌ / ⚠️ par point, et pour chaque ❌ ou ⚠️ : le fichier ou la preuve concernée, et l'action à faire avant d'ouvrir (ou de faire relire) la PR.

Exemple de format :

| # | Point | Statut | Détail |
|---|---|---|---|
| 1 | Tests | ✅ | `npm test` : 42/42 |
| 4 | Contrats | ❌ | `docs/contracts/core-api.md` non respecté : champ `xp` renommé en `xpGained` sans mise à jour du contrat |
| 12 | Doublon de travail | ⚠️ | PR #58 (G2) touche aussi `src/games/blackjack/engine.js` |

## Cas particuliers

- **Tâche purement G5** (CI, tooling, tests transverses) : les points 4 (contrats) et frontières de groupe peuvent ne pas s'appliquer — le signaler en "N/A" plutôt que ❌.
- **PR de correction urgente (hotfix)** : tous les points restent obligatoires ; l'urgence ne dispense d'aucune vérification, seule la vitesse de relecture humaine peut être accélérée par les référents.
- **Contrat absent pour une interaction utilisée** : point 4 devient bloquant → ❌ + ouverture d'issue à G5 avant de considérer la PR prête.

## Ce que cette skill ne fait PAS

- Ne corrige pas le code à la place de l'agent — elle signale, l'agent (ou la personne) corrige.
- Ne merge rien et ne remplace pas la relecture humaine obligatoire.
- Ne modifie jamais `docs/contracts/`.
- Ne juge pas la qualité du code au-delà des règles absolues et de la définition de terminé (pas une revue de style).

## En cas de doute

Si un point ne peut pas être vérifié (ex. contrat manquant pour une interaction utilisée), s'arrêter et signaler à G5 plutôt que de cocher par défaut (règle absolue n°10).
