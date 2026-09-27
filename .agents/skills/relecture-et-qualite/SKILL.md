---
name: relecture-et-qualite
description: Grille d'évaluation et règles pour la relecture de code (Code Review).
---

## Compétence : relecture-et-qualite

- **4 axes d'analyse :** Exactitude métier, lisibilité (noms explicites), respect de l'architecture (`coreService.js`), sécurité et performance front-end.
- **Chasse au code mort :** Repérer et lister le code orphelin (imports inutilisés, anciens composants) sans le supprimer de ton propre chef.
- **Classification des retours :** Préfixer par `[CRITIQUE]` (bloquant), `[REQUIS]` (à corriger avant merge) ou `[SUGGESTION]` (optionnel).

## Quand l'utiliser

- Relecture d'une Pull Request avant merge.
- Auto-relecture de son propre diff avant de pousser (voir `requesting-code-review`).
- Quand un bug ou une régression doit être compris avant correction (voir `systematic-debugging`).

## Processus type

1. Lire le diff complet dans son ensemble, puis fichier par fichier.
2. Passer les 4 axes d'analyse sur chaque zone modifiée.
3. Chasser le code mort et le lister (sans le supprimer).
4. Classer chaque retour (`[CRITIQUE]`, `[REQUIS]`, `[SUGGESTION]`).
5. Publier les retours ; l'auteur les traite avec `receiving-code-review`.

## Tri des commentaires reçus (côté auteur)

Quand on répond aux retours, trier chaque commentaire :

- **Valide** : vrai problème. Le corriger.
- **Faux positif** : le relecteur a manqué du contexte. L'expliquer poliment.
- **Sur-analyse** : techniquement plausible mais la complexité n'en vaut pas la peine. L'ignorer avec justification.

## Drapeaux rouges

- Retours non classés (impossibilité de distinguer bloquant et optionnel).
- Code mort supprimé de sa propre initiative au lieu d'être listé.
- Merge accordé avec un `[CRITIQUE]` non résolu.
- Relecture limitée à la syntaxe, sans passer les 4 axes.

## Liens avec les autres skills

- `requesting-code-review` : comment demander une relecture.
- `receiving-code-review` : comment traiter les retours reçus.
- `systematic-debugging` : investigation systématique en cas de doute sur l'exactitude métier.
- `verification-before-completion` : exiger des preuves (tests exécutés) et non des affirmations.
