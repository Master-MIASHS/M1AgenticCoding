// ---------------------------------------------------------------------------
// Fixtures G2 - tirages bruts prédéfinis (issue #68)
// ---------------------------------------------------------------------------
// Remplace coreService.roll() dans les tests d'intégration : aucun
// Math.random(), aucun appel au vrai RNG. Chaque appel renvoie le tirage
// suivant de la séquence, au format public actuel de roll() :
//   roll(gameId, params) -> { gameId, value, nonce }, value dans [0, 1)
// (contrat G2 v0.3, § 4.1).
//
// Quand G1 exposera tirageEntier / tirageAvecPoids / melanger (PR #28),
// ajouter ici les fixtures correspondantes (ex. 2 dés, paquet mélangé).
// ---------------------------------------------------------------------------

/** Séquences de valeurs brutes réutilisables. */
export const ROLLS = {
  single: [0.42],
  multiStep: [0.1, 0.5, 0.9],
};

/**
 * Crée un faux roll() déterministe qui rejoue `values` dans l'ordre et
 * enregistre chaque appel dans `calls`.
 *
 * @param {number[]} values tirages bruts à renvoyer, dans l'ordre
 * @returns {{ roll: Function, calls: Array<{ gameId: string, params: any }> }}
 */
export function makeFixtureRoll(values) {
  const queue = [...values];
  const calls = [];
  let nonce = 0;

  function roll(gameId, params) {
    calls.push({ gameId, params });
    if (queue.length === 0) {
      throw new Error(
        `fixture roll(): plus de tirage disponible (appel n°${calls.length} pour "${gameId}")`
      );
    }
    nonce += 1;
    return { gameId, value: queue.shift(), nonce };
  }

  return { roll, calls };
}
