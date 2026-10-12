// Lectures réelles de la progression via coreService (Groupe 1, #344) : jeux
// débloqués selon le niveau et historique de l'état, sans écriture.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../src/services/coreService.js';
import { updateState } from '../../src/core/state.js';

/**
 * Passe l'état au niveau donné (le niveau ne baisse jamais : appels croissants).
 * @param {number} level - Niveau à atteindre.
 * @returns {void}
 */
function atteindreNiveau(level) {
  updateState((etat) => ({ ...etat, level }));
}

describe('getUnlockedGames : jeux débloqués selon le niveau', () => {
  it('donne les jeux de départ au niveau 1', () => {
    assert.deepStrictEqual(coreService.getUnlockedGames(), ['slots', 'dice']);
  });

  it('débloque les jeux dont le niveau requis est atteint (niveau 3)', () => {
    atteindreNiveau(3);
    assert.deepStrictEqual(coreService.getUnlockedGames(), ['slots', 'dice', 'scratch', 'blackjack']);
  });

  it('n’écrit rien pendant la lecture', () => {
    const avant = coreService.getState();
    coreService.getUnlockedGames();
    assert.deepStrictEqual(coreService.getState(), avant);
    assert.deepStrictEqual(avant.unlockedGames, ['slots', 'dice']);
  });

  it('débloque le vidéo poker au niveau 8 et le poker au niveau 12', () => {
    atteindreNiveau(8);
    const niveau8 = coreService.getUnlockedGames();
    assert.ok(niveau8.includes('video-poker'));
    assert.ok(!niveau8.includes('poker'));
    atteindreNiveau(12);
    assert.ok(coreService.getUnlockedGames().includes('poker'));
  });

  it('garde un jeu déjà acquis dans l’état, même hors du catalogue', () => {
    updateState((etat) => ({ ...etat, unlockedGames: [...etat.unlockedGames, 'ancien-jeu'] }));
    assert.ok(coreService.getUnlockedGames().includes('ancien-jeu'));
  });

  it('renvoie une liste sans doublon et indépendante', () => {
    const jeux = coreService.getUnlockedGames();
    assert.strictEqual(new Set(jeux).size, jeux.length);
    jeux.push('triche');
    assert.ok(!coreService.getUnlockedGames().includes('triche'));
  });
});

describe('getHistory : historique de l’état', () => {
  const partie = (roundId) => ({
    roundId, gameId: 'slots', bet: 10, outcome: 'loss', payout: 0, netGain: -10,
    playedAt: '2026-10-11T12:00:00.000Z',
  });

  it('renvoie les entrées enregistrées, dans l’ordre', () => {
    updateState((etat) => ({ ...etat, history: [partie('r1'), partie('r2')] }));
    assert.deepStrictEqual(coreService.getHistory().map((e) => e.roundId), ['r1', 'r2']);
  });

  it('renvoie une copie : la modifier ne touche pas l’état', () => {
    const historique = coreService.getHistory();
    historique[0].bet = 999;
    historique.push(partie('triche'));
    assert.strictEqual(coreService.getHistory().length, 2);
    assert.strictEqual(coreService.getState().history[0].bet, 10);
  });
});
