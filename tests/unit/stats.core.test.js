// getGlobalStats() via la façade du Core : calculée sur l'historique de
// l'état (Groupe 1, #270), avec la forme lue par le G4.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../src/services/coreService.js';
import { updateState } from '../../src/core/state.js';

describe('getGlobalStats via coreService', () => {
  it('vaut zéro tant qu’aucune partie n’est enregistrée', () => {
    assert.deepStrictEqual(coreService.getGlobalStats(), {
      totalPlays: 0, totalWagered: 0, totalWon: 0, activePlayers: 0, byGame: {}, mostPlayed: [],
    });
  });

  it('lit l’historique enregistré dans l’état', () => {
    // Simule ce que play() enregistrera (#131), au format de #266.
    updateState((etat) => ({
      ...etat,
      history: [
        { roundId: 'r1', gameId: 'roulette', bet: 10, outcome: 'win', payout: 20, netGain: 10, playedAt: '2026-10-08T12:00:00.000Z' },
        { roundId: 'r2', gameId: 'slots', bet: 5, outcome: 'loss', payout: 0, netGain: -5, playedAt: '2026-10-08T12:01:00.000Z' },
      ],
    }));
    const stats = coreService.getGlobalStats();
    assert.strictEqual(stats.totalPlays, 2);
    assert.strictEqual(stats.totalWagered, 15);
    assert.strictEqual(stats.totalWon, 20);
    assert.strictEqual(stats.activePlayers, 1);
    assert.deepStrictEqual(stats.mostPlayed, ['roulette', 'slots']);
  });
});
