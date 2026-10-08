# Progression XP — branchement sur l’état Core

Branchement autorisé par Reda dans #61 (commentaire 6018700163), suivi dans #237.

## Comportement public

`addXP(amount)` et `getLevel()` conservent leurs signatures et les calculs de
`createProgression`. Leur instance différée utilise désormais
`createProgressionStore({ getState, updateState })` : chaque opération relit
l’état courant, notamment après import d’une sauvegarde.

`addXP` applique XP et niveau ensemble. Avec localStorage disponible, les données
sont enregistrées dans `casino_state` avant publication en mémoire. Une erreur
est propagée sans annoncer de gain réussi ni publier une mise à jour partielle.
Sans localStorage, l’état fonctionne en mémoire conformément à `state.js`.
Le solde, le meilleur solde, l’historique et les jeux débloqués ne sont pas modifiés.
`getState()` et `exportSave()` voient les gains réussis ; un rechargement retrouve
les données persistées. Aucun deuxième stockage de progression n’est créé.

## Calculs conservés

Les seuils de `config/progression.config.js` restent **TEMPORAIRES** : niveaux
1 à 5 aux seuils cumulés 0, 100, 250, 500 et 1000 XP. Le calcul sature au dernier
niveau configuré, l’XP continue de s’accumuler. Un niveau déjà acquis n’est pas
abaissé par une nouvelle courbe. Les gains sont finis, positifs ou nuls ; les
valeurs décimales sont acceptées. `getLevel()` calcule à la lecture sans écrire.
La configuration est copiée à la création du service : changer le fichier de
seuils s’applique à une nouvelle session, pas à chaud.

## Limites et frontières

Aucun gain automatique par partie n’est ajouté. Le futur `play()` doit appliquer
solde, XP/niveau, meilleur solde et historique dans **une seule transaction**
(#131/#218), sans enchaîner une écriture du solde puis `addXP()`.
Les déblocages, `pseudo`, `xpForNextLevel`, le classement et l’historique réels
restent des travaux séparés. Les règles de restauration ne sont pas modifiées.

`createProgression`, `calculateLevel` et `createProgressionStore` restent internes
à G1 ; les consommateurs passent par `coreService`. `progression.mock.js` reste
un double explicite de tests, jamais le stockage de l’instance publique.

## Vérification

`tests/unit/progression-api.test.js` teste les fonctions publiques : état/export,
import après initialisation, erreur de stockage avec rollback puis retry,
rechargement dans un nouveau processus et refus des gains invalides.
La seule API externe simulée est localStorage ; calcul, adaptateur et état sont réels.

La documentation pédagogique XP dans `utiliser-core` est coordonnée avec Reda
au ticket #221 ; ne pas y présenter ce branchement comme une attribution
automatique de gains par `play()`.
