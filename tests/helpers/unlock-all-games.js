// ---------------------------------------------------------------------------
// Helper de test : monte le joueur au niveau maximal des jeux
// ---------------------------------------------------------------------------
// play() refuse un jeu absent de getUnlockedGames() (règle 5, #292). Les
// montages qui jouent les 13 jeux avec le vrai Core montent donc le niveau de
// l'état (comme tests/unit/progression-seuils-effectifs.test.js), sans toucher
// aux seuils de déblocage ni aux assertions.
// ---------------------------------------------------------------------------

import { updateState } from '../../src/core/state.js';
import { GAMES } from '../../src/core/config/games.config.js';

/** Niveau requis par le jeu le plus exigeant du catalogue. */
export const MAX_GAME_LEVEL = Math.max(...Object.values(GAMES).map((game) => game.unlockLevel));

/**
 * Passe l'état du Core au niveau le plus haut requis par un jeu.
 *
 * @returns {void}
 */
export function unlockAllGames() {
  updateState((state) => ({ ...state, level: Math.max(state.level, MAX_GAME_LEVEL) }));
}

unlockAllGames();
