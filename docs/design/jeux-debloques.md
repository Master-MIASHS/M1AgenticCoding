# Calcul des jeux débloqués — #234

## Objectif

Conserver les jeux acquis et ajouter ceux accessibles au niveau actuel, même après une hausse administrative des seuils (validation G5 dans #234).

## Non-objectifs

Aucune modification de l'état, API publique, stockage, règlement des parties, configuration d'Ania, catalogue ou UI. Ahmed garde le branchement atomique ; G4 consomme toujours `string[]` via l'API publique.

## Conception et décisions

`src/core/unlockedGames.js` exporte `calculateUnlockedGames(level, unlockLevels, unlockedGames = [])`. Les seuils sont injectés directement depuis `createUnlockConfig(store).getUnlockLevels()` : objet `{ gameId: niveau }`. Aucun import du catalogue ou de l'état, aucun réglage en dur.

Le niveau et tous les seuils sont des entiers sûrs >= 1, comme dans la configuration d'Ania. Les acquis sont un tableau de chaînes, comme dans l'état existant. Le helper ne filtre pas les identifiants au catalogue : les acquis absents de la table restent conservés. La table est un objet simple (ou de prototype null), pas un tableau ou une instance de classe.

Retour indépendant sans doublons : ordre des acquis, puis nouveaux jeux dans l'ordre des clés de la table. Tous les seuils sont validés, y compris ceux des jeux déjà acquis. Appels répétés sans changement des entrées : résultat identique. La fonction ne modifie aucune entrée.

## Intégration à fournir par Ahmed

Lire le niveau effectif et `unlockedGames` depuis le même état cohérent, injecter les seuils effectifs d'Ania, puis écrire le résultat dans sa mise à jour atomique. Ce helper interne G1 n'est pas un nouvel export de `coreService`. Il ne décide ni des permissions, ni de la restauration de sauvegardes (#258).

## Risques

Le calcul est utilisable dès sa livraison, mais l'acquisition persistante attend le branchement d'Ahmed. Une liste acquise incomplète fournie par l'appelant ne permet pas de retrouver les acquisitions antérieures. Les seuils ne sont pas limités par la courbe XP temporaire.

## Plan de tests

Runner `node:test`, commande `node --test tests/unit/unlockedGames.test.js` : échec avant création du module, succès après implémentation.

- Niveau inférieur, égal et supérieur ; déblocages multiples et table vide.
- Acquis conservés après hausse du seuil ou absence dans la table ; aucun doublon et ordre stable.
- Tableau renvoyé indépendant, entrées gelées, appels répétés.
- Niveau invalide, table invalide, seuil invalide même pour un acquis, acquis invalides et tableaux creux.
- Configuration réelle d'Ania : modification administrative, déblocage puis hausse sans perte d'accès.

Vérifications complètes : `node --test`, ESLint et build Vite. Pas d'interaction navigateur : aucun comportement UI modifié.

## Vérifications réalisées

Base `origin/main` : `3d176e8` (8 octobre 2026). Avant implémentation : 561 tests, 558 réussis, aucun échec, 3 TODO existants ; lint sans erreur avec 2 avertissements existants ; build Vite réussi.

Cycle rouge/vert observé : le test ciblé échoue d'abord avec module absent, puis les 14 tests passent. Après implémentation : 575 tests, 572 réussis, aucun échec, mêmes 3 TODO ; lint sans erreur et mêmes avertissements (`rng.js` et `games/dice/rules.js`) ; build Vite réussi (1133 modules). Exécution par le runtime Node fourni, équivalente aux scripts npm du dépôt.
