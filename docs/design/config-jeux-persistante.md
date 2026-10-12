# Conception — Configuration des jeux enregistrée (G1, #350)

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
