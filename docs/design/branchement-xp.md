# Brancher la progression sur l’état persistant

## Objectif
Les gains explicitement appliqués par `coreService.addXP` deviennent visibles
dans l’état partagé et les sauvegardes, sans perdre le solde du joueur.

## Périmètre et accord
Branchement autorisé par Reda dans #61 (commentaire 6018700163), suivi dans #237.
Conserver les signatures publiques, les calculs et les seuils temporaires.
Pas d’XP automatique par partie, de nouveau schéma, de pseudo, de déblocage ou
de calcul de `xpForNextLevel`. Le règlement global reste #131/#218.

## Conception
`getProgression()` conserve une instance différée de `createProgression`, mais
lui injecte `createProgressionStore({ getState, updateState })` au lieu du mock.
Chaque lecture retrouve ainsi le joueur courant après restauration. Chaque
gain écrit XP/niveau en une transaction du Core ; la persistance précède la
publication en mémoire. Aucun setter général n’est exposé.

## Risques
Une erreur de stockage est désormais propagée par `addXP` au lieu d’un succès
en mémoire. `getLevel` garde le calcul existant et peut conserver un niveau
supérieur à la courbe temporaire. Les règles de restauration restent inchangées.
Le mock reste un double explicite de tests, sans import dans la production.
La section XP de la skill est coordonnée avec Reda dans #221 ; cette livraison
actualise `progression.integration.md`.

## Plan de tests
Runner Node natif, tests publics dans `tests/unit/progression-api.test.js` :
- gain visible dans getState/getLevel/exportSave, autres champs inchangés ;
- import d’une sauvegarde puis gain sur l’état restauré, sans cache obsolète ;
- erreur de persistance : mémoire/fichier inchangés, puis gain unique au retry ;
- nouveau processus : XP persistée retrouvée via la façade ;
- gain invalide : aucune écriture.
Avant branchement, les scénarios de persistance et de restauration doivent échouer.
Après branchement : tests ciblés puis `npm test`, `npm run lint`, `npm run build`.
Adapter le test existant qui imposait explicitement l’absence de modification
de l’état : il doit maintenant vérifier l’état partagé et restaurer sa fixture.
