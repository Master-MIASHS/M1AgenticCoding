// Tests unitaires des statistiques globales (Groupe 1, tâche n°23, #270).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { calculerStatistiques } from '../../src/core/stats.js';

/**
 * Entrée d'historique de test (format de #266), modifiable.
 * @param {object} [changements] - Champs à remplacer.
 * @returns {object} Entrée d'historique.
 */
function partie(changements = {}) {
  return {
    roundId: 'r1',
    gameId: 'roulette',
    bet: 10,
    outcome: 'win',
    payout: 20,
    netGain: 10,
    playedAt: '2026-10-08T12:00:00.000Z',
    ...changements,
  };
}

describe('calculerStatistiques : totaux', () => {
  it('renvoie des zéros pour un historique vide', () => {
    const stats = calculerStatistiques([]);
    assert.strictEqual(stats.totalPlays, 0);
    assert.strictEqual(stats.totalWagered, 0);
    assert.strictEqual(stats.totalWon, 0);
  });

  it('compte les parties, somme les mises et les montants reversés', () => {
    const stats = calculerStatistiques([
      partie(),
      partie({ roundId: 'r2', bet: 40, outcome: 'win', payout: 50, netGain: 10 }),
      partie({ roundId: 'r3', gameId: 'slots', bet: 10, outcome: 'loss', payout: 0, netGain: -10 }),
    ]);
    assert.strictEqual(stats.totalPlays, 3);
    assert.strictEqual(stats.totalWagered, 60);
    assert.strictEqual(stats.totalWon, 70);
  });

  it('arrondit les sommes au centime', () => {
    const stats = calculerStatistiques([
      partie({ bet: 0.1, payout: 0.2 }),
      partie({ roundId: 'r2', bet: 0.2, payout: 0.1 }),
    ]);
    assert.strictEqual(stats.totalWagered, 0.3);
    assert.strictEqual(stats.totalWon, 0.3);
  });
});
