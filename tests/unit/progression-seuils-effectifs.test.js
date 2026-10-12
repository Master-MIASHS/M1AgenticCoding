// getUnlockedGames applique les seuils de déblocage réglés par l'admin
// (Groupe 1, #396), via l'instance partagée de unlock.config.js (#315).

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../src/services/coreService.js';
import { updateState } from '../../src/core/state.js';
import { GAMES } from '../../src/core/config/games.config.js';
import { setEffectiveUnlockLevel } from '../../src/core/config/unlock.config.js';

const REGLES = new Set();

/**
 * Règle un seuil et le note pour le remettre au défaut après le test.
 * @param {string} gameId - Identifiant du jeu.
 * @param {number} level - Niveau requis.
 */
function regler(gameId, level) {
  setEffectiveUnlockLevel(gameId, level);
  REGLES.add(gameId);
}

/**
 * Passe l'état au niveau donné (le niveau ne baisse jamais : appels croissants).
 * @param {number} level - Niveau à atteindre.
 */
function atteindreNiveau(level) {
  updateState((etat) => ({ ...etat, level }));
}

afterEach(() => {
  for (const gameId of REGLES) setEffectiveUnlockLevel(gameId, GAMES[gameId].unlockLevel);
  REGLES.clear();
});

describe('getUnlockedGames : seuils réglés par l’admin', () => {
  it('sans réglage, garde les niveaux par défaut de GAMES', () => {
    assert.deepStrictEqual(coreService.getUnlockedGames(), ['slots', 'dice']);
  });

  it('un seuil abaissé par l’admin débloque le jeu plus tôt', () => {
    assert.ok(!coreService.getUnlockedGames().includes('poker'));
    regler('poker', 1);
    assert.ok(coreService.getUnlockedGames().includes('poker'));
  });

  it('un seuil relevé par l’admin retarde un jeu pas encore acquis', () => {
    atteindreNiveau(3);
    assert.ok(coreService.getUnlockedGames().includes('blackjack'));
    regler('blackjack', 5);
    assert.ok(!coreService.getUnlockedGames().includes('blackjack'));
  });

  it('un seuil relevé ne retire jamais un jeu déjà acquis dans l’état', () => {
    updateState((etat) => ({ ...etat, unlockedGames: [...etat.unlockedGames, 'scratch'] }));
    regler('scratch', 12);
    assert.ok(coreService.getUnlockedGames().includes('scratch'));
  });

  it('n’écrit rien dans l’état pendant la lecture', () => {
    regler('roulette', 1);
    const avant = coreService.getState();
    coreService.getUnlockedGames();
    assert.deepStrictEqual(coreService.getState(), avant);
  });
});
