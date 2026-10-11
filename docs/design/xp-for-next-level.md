# Seuil total du niveau suivant — #249

## Objectif et décisions
Fournir le calcul interne G1 du champ xpForNextLevel attendu par G4.
G5 : https://github.com/maximiliense/M1AgenticCoding/discussions/9#discussioncomment-18794697
Ahmed : https://github.com/maximiliense/M1AgenticCoding/discussions/9#discussioncomment-18790791
Florient : https://github.com/maximiliense/M1AgenticCoding/discussions/9#discussioncomment-18789823
Retourner le seuil TOTAL du prochain niveau, jamais l'XP restante ; null si
aucun niveau suivant n'est configuré. Les seuils actuels restent temporaires.

## Conception
`calculateXPForNextLevel(currentLevel, thresholds = TEMPORARY_LEVEL_THRESHOLDS)`
dans src/core/nextLevel.js : tableau indexé depuis le niveau 1 ; le prochain
seuil est thresholds[currentLevel]. Valider un niveau entier sûr positif et
toute la configuration (tableau non vide depuis zéro, nombres finis non négatifs
strictement croissants). Niveau au-delà du tableau : null, sans diminuer le niveau.
Recevoir le niveau effectif conservant les niveaux acquis, fourni par la logique
de progression (getLevel), plutôt que recalculer un niveau depuis l'XP seule.
Fonction pure, aucune mutation ni cache, aucune lecture de l'état ou de l'horloge.
Importer uniquement la configuration : progression.js importe state.js qui lit
le stockage lors du chargement. Ne pas extraire/refactorer calculateLevel pendant
le travail d'Ahmed ; conserver une validation locale courte des seuils.

## Frontières et risques
Ahmed garde le branchement dans getState/coreService et le contrat public avec G5.
Pas de nouveau champ d'état persisté, ni modification de progression.js, des
seuils, de l'UI, de play(), de la persistance ou des contrats. Aucun changement
des PR #238 ou #248. Aucun RNG nécessaire. Le helper seul ne résout pas l'absence
actuelle du champ dans l'API. Le caller doit transmettre le niveau effectif
conservant les acquis, pas une ancienne valeur brute incohérente avec l'XP.

## Plan de tests et vérifications
Runner node:test : valeurs niveaux 1–4, niveau maximal et au-delà, seuil total
vs XP restante, tableaux mono-niveau/personnalisés/décimaux, niveaux acquis,
entrées et seuils invalides même au niveau maximal, configuration gelée et absence
de cache. RED : import manquant ; GREEN : tous les tests réussis.
Commandes équivalentes aux scripts npm (npm indisponible localement) :
`node --test`, `node node_modules/eslint/bin/eslint.js . --ext .js,.jsx`,
`node node_modules/vite/bin/vite.js build`. Aucun parcours UI, helper interne pur.

## Résultats locaux
Base origin/main 4611caf : 553 tests, 550 réussis, 0 échec, 3 TODO préexistants.
Après ajout : 567 tests, 564 réussis, 0 échec, mêmes 3 TODO ; 14 tests ciblés verts.
Lint final : 0 erreur, 2 avertissements préexistants (rng.js, dice/rules.js).
Build Vite réussi : 1133 modules. Relecture indépendante : aucun point bloquant.
La syntaxe d'un tableau incomplet de test a été corrigée pour satisfaire le lint.
CI GitHub à vérifier lors de la livraison ; aucun changement de l'API publique.
