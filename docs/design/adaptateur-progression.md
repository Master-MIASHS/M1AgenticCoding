# Adaptateur de progression — #143

## Objectif

Fournir à `createProgression` de Reda une lecture fraîche et une écriture
atomique de XP/niveau, sans modifier les autres données du joueur.

## Conception

`createProgressionStore({ getState, updateState })` retourne `read()` et
`write({ xp, level })`. Les dépendances synchrones sont injectées : aucune
importation de l’écriture encore en revue dans #139. Chaque lecture redemande
l’état courant et renvoie une nouvelle paire de nombres. Chaque écriture valide
la paire puis appelle une fois `updateState`, qui reçoit le nouvel état complet.
Le contrôle de monotonie compare avec l’état reçu dans ce callback.

Les autres champs d’une entrée d’écriture sont ignorés, jamais recopiés.
Les XP décimales sont autorisées ; le niveau doit être un entier sûr positif.
Les deux champs sont obligatoires. La progression garde le calcul du niveau.
L’adaptateur ne cache pas d’état, ne persiste rien seul et propage les erreurs.

## Périmètre et risques

Ce module interne ne remplace pas encore le mock par défaut de progression.js.
Le branchement avec `{ getState, updateState }` attend #139 et la coordination
avec Reda. L’atomicité dépend du contrat de l’écriture injectée : synchrone,
sur copie, sans publication avant validation/persistance. Aucun accès UI ajouté.
Le règlement complet d’une partie (#131) doit toujours utiliser une seule
transaction globale, pas une écriture solde suivie de cet adaptateur XP.

## Plan de tests

Commande : `node --test tests/unit/progression.store.test.js`.
Avant implémentation : module absent. Après : lecture indépendante et fraîche,
écriture unique et ciblée, refus des champs invalides et des diminutions,
propagation des erreurs, contrôle sur l’état du callback et compatibilité avec
le vrai `createProgression` (calcul de niveau et gains décimaux).

Base `4057105` : 185 tests réussis. Aucun nouveau parcours UI.
