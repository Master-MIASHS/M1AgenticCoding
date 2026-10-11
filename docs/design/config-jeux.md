# Configuration des jeux — #231

## Objectif

Fiabiliser les lectures et mises à jour des sections `probabilities` et `multipliers`, selon les règles confirmées par G2, Ahmed et Nina (G5) dans #231.

## Non-objectifs

Pas d'extension paytable/segments/weights (#256), de modification des exports (#158), permissions, état, stockage, statistiques globales, jeux, UI ou contrats.

## Conception et décisions

Conserver le stockage `Map` en mémoire et les signatures existantes. Les deux fonctions vérifient un identifiant propre de `GAMES`. Un jeu connu sans configuration renvoie deux objets vides neufs. Le catalogue et chacune de ses entrées sont gelés ; `unlockLevel` reste le défaut, sans remplacer la configuration effective d'Ania.

Le setter accepte un objet simple (ou sans prototype) avec seulement `probabilities` et `multipliers`. Chaque section est une table plate de nombres finis >= 0, sans normalisation ni borne supérieure à 1. Une section omise reste inchangée ; une section fournie remplace toute la section ; `{}` la vide. `null`, `undefined` explicite dans une section, champs inconnus, valeurs imbriquées, cycles, tableaux et objets spécialisés sont refusés. Les propriétés symboles, non énumérables et accesseurs ne représentent pas les données JSON attendues et sont refusées sans les exécuter.

Construire et valider la copie candidate avant `Map.set` : tout refus conserve la configuration précédente. Copier chaque section en écriture et en lecture suffit à l'indépendance profonde dans ce schéma strictement plat. Les clés de table, y compris `__proto__`, sont copiées comme propriétés de données sans affectation au prototype.

Erreurs : `Error` pour un identifiant inconnu, `TypeError` pour une forme/valeur non numérique ou champ non autorisé, `RangeError` pour un nombre négatif ou non fini. Le retour du setter reste `{ ok: true, gameId }`. Le paramètre par défaut `config = {}` reste compatible : omission ou `undefined` du payload entier ne change rien ; `undefined` explicite dans une section est refusé.

## Dépendances et risques

Ahmed conserve le contrôle admin déjà présent dans `core.js` et l'exposition du getter (#158). Le module interne n'ajoute pas de permission. L'Admin transmet actuellement les deux sections complètes, et son champ vide devient `{}` : il vide donc cette section. Les entrées auparavant acceptées par le mock (jeu inconnu, données non numériques) provoqueront maintenant une erreur ; les consommateurs doivent gérer ces erreurs. Le stockage reste en mémoire ; aucune nouvelle garantie de persistance.

## Plan de tests

`node --test tests/unit/games.config.test.js` : phase rouge sur le module actuel puis verte après correction. Couvrir jeu connu non configuré, identifiants inconnus/propriétés héritées, isolation des retours et entrées, remplacement/conservation/vidage, validation sans coercition/normalisation, refus atomique après une première section valide, entrées non JSON/cycliques et catalogue gelé. Les tests de permissions existants vérifient la compatibilité avec la façade publique.

Vérifications : suite entière Node, lint et build Vite ; aucune modification UI à vérifier dans le navigateur.

## Résultats du 8 octobre 2026

Base `7bd792f` : 575 tests, 572 réussis, 0 échec, 3 TODO ; lint 0 erreur et 2 avertissements préexistants ; build réussi (1135 modules).

Cycle rouge/vert : 15 tests échouent sur le module initial, puis les 18 tests ciblés passent. Suite finale : 593 tests, 590 réussis, 0 échec, mêmes 3 TODO ; lint 0 erreur et mêmes 2 avertissements (`rng.js`, `games/dice/rules.js`) ; build réussi (1135 modules). Relecture indépendante : aucun retour critique ou requis. Vérifications exécutées avec le runtime Node fourni, équivalentes aux scripts npm.

## Configuration enregistrée (#350)

Problème : `setGameConfig` écrivait dans une `Map` en mémoire. Au rechargement, les réglages de l'admin étaient perdus.

| Élément | Choix |
|---|---|
| Stockage | `createStockageLocal('casino_config_jeux', {}, { valider })` (#262) : réglage global, hors de `casino_state` et des sauvegardes du joueur |
| Forme | `{ [gameId]: { probabilities: {…}, multipliers: {…} } }`, seulement pour les jeux réglés |
| Validation au chargement | Objet simple ; chaque clé est un jeu de `GAMES` (`Object.hasOwn`, donc ni `__proto__` ni propriété héritée) ; chaque valeur ne contient que `probabilities` et `multipliers`, tables de nombres finis ≥ 0 |
| Valeur invalide | Avertissement, configuration vide, clé conservée jusqu'à la prochaine écriture réussie |
| Écriture | `setGameConfig` valide tout, puis écrit l'objet complet ; rien n'est écrit en cas d'erreur |
| API | `getGameConfig` / `setGameConfig` inchangées (mêmes retours, mêmes erreurs) |

Tests : `tests/unit/config-jeux-persistante.test.js` (faux `localStorage`, module rechargé comme après un rechargement de page).
