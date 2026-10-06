---
name: resolving-merge-conflicts
description: À utiliser quand il faut résoudre un conflit git de merge ou de rebase en cours.
license: MIT
metadata:
  source: https://github.com/mattpocock/skills
  original: "Resolving Merge Conflicts (mattpocock/skills)"
---

# Résolution de conflits de merge

1. **Constater l'état actuel** du merge / rebase. Vérifier l'historique git et les fichiers en conflit.

2. **Retrouver les sources primaires** de chaque conflit. Comprendre en profondeur pourquoi chaque changement a été fait et quelle était l'intention originale. Lire les messages de commit (format du projet : `<type>(<périmètre>): [Groupe X] ...`), vérifier les PR, vérifier les issues/tickets d'origine.

3. **Résoudre chaque hunk.** Préserver les deux intentions quand c'est possible. Quand elles sont incompatibles, choisir celle qui correspond à l'objectif déclaré du merge et noter le compromis. **Ne pas inventer de nouveau comportement.** Toujours résoudre ; jamais `--abort`.

4. **Découvrir les vérifications automatisées du projet** et les exécuter : le Quality Gate (`npm run lint` → `npm test` → `npm run build`). Corriger tout ce que le merge a cassé.

5. **Terminer le merge / rebase.** Stager tout et committer (commits atomiques, message au format du projet). En cas de rebase, continuer le processus jusqu'à ce que tous les commits soient rebasés.

## Liens avec les autres skills

- `flux-git-et-versionnement` : branches éphémères, rebaser sur `main` à jour, format des commits.
- `ci-cd-et-automatisation` : le Quality Gate à exécuter après le merge.
- `verification-before-completion` : ne jamais affirmer un merge terminé sans l'avoir vérifié.
