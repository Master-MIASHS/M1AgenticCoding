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

describe('calculerStatistiques : joueurs actifs et détail par jeu', () => {
  it('compte 0 joueur actif sans partie, 1 dès qu’une partie existe (un seul profil)', () => {
    assert.strictEqual(calculerStatistiques([]).activePlayers, 0);
    assert.strictEqual(calculerStatistiques([partie()]).activePlayers, 1);
  });

  it('détaille les parties, mises et montants reversés par jeu', () => {
    const stats = calculerStatistiques([
      partie(),
      partie({ roundId: 'r2', bet: 40, payout: 50 }),
      partie({ roundId: 'r3', gameId: 'slots', bet: 10, payout: 0 }),
    ]);
    assert.deepStrictEqual(stats.byGame, {
      roulette: { plays: 2, wagered: 50, won: 70 },
      slots: { plays: 1, wagered: 10, won: 0 },
    });
  });

  it('trie les jeux les plus joués, les égalités par identifiant', () => {
    const stats = calculerStatistiques([
      partie({ gameId: 'slots' }),
      partie({ roundId: 'r2', gameId: 'dice' }),
      partie({ roundId: 'r3', gameId: 'wheel' }),
      partie({ roundId: 'r4', gameId: 'wheel' }),
    ]);
    assert.deepStrictEqual(stats.mostPlayed, ['wheel', 'dice', 'slots']);
  });

  it('renvoie un détail vide pour un historique vide', () => {
    const stats = calculerStatistiques([]);
    assert.deepStrictEqual(stats.byGame, {});
    assert.deepStrictEqual(stats.mostPlayed, []);
  });
});

describe('calculerStatistiques : historique invalide', () => {
  it('rejette un historique qui n’est pas un tableau', () => {
    for (const historique of [null, undefined, {}, 'parties']) {
      assert.throws(() => calculerStatistiques(historique), /stats/);
    }
  });

  it('rejette une entrée invalide, en indiquant sa position', () => {
    const invalides = [
      null,
      partie({ gameId: '' }),
      partie({ gameId: 3 }),
      partie({ bet: -1 }),
      partie({ bet: '10' }),
      partie({ payout: NaN }),
      partie({ payout: Infinity }),
    ];
    for (const entree of invalides) {
      assert.throws(() => calculerStatistiques([partie(), entree]), /stats.*entrée 1/, JSON.stringify(entree));
    }
  });
});

describe('calculerStatistiques : identifiants de jeu dangereux (relecture G5 de #271)', () => {
  it('compte "__proto__" et "constructor" comme des jeux ordinaires, sans toucher aux prototypes', () => {
    const stats = calculerStatistiques([
      partie({ gameId: '__proto__', bet: 10, payout: 20 }),
      partie({ roundId: 'r2', gameId: 'constructor', bet: 5, payout: 0 }),
    ]);
    assert.deepStrictEqual(stats.byGame.__proto__, { plays: 1, wagered: 10, won: 20 });
    assert.deepStrictEqual(Object.keys(stats.byGame).sort(), ['__proto__', 'constructor']);
    assert.deepStrictEqual(stats.byGame.constructor, { plays: 1, wagered: 5, won: 0 });
    assert.strictEqual(stats.totalPlays, 2);
    // Aucun prototype global n'a été modifié.
    assert.strictEqual({}.plays, undefined);
    assert.strictEqual(typeof Object.prototype.wagered, 'undefined');
    assert.strictEqual(Object.plays, undefined);
  });
});

describe('calculerStatistiques : ajustements de l’admin (#322)', () => {
  const ajustement = {
    type: 'ADMIN_ADJUSTMENT',
    amount: 150,
    balanceBefore: 400,
    balanceAfter: 550,
    adjustedAt: '2026-10-10T18:00:00.000Z',
  };

  it('ne compte pas un ajustement de l’admin comme une partie', () => {
    const stats = calculerStatistiques([partie(), ajustement]);
    assert.strictEqual(stats.totalPlays, 1);
    assert.strictEqual(stats.totalWagered, 10);
    assert.strictEqual(stats.totalWon, 20);
    assert.deepStrictEqual(stats.mostPlayed, ['roulette']);
  });

  it('ne compte aucun joueur actif avec seulement des ajustements', () => {
    const stats = calculerStatistiques([ajustement]);
    assert.strictEqual(stats.totalPlays, 0);
    assert.strictEqual(stats.activePlayers, 0);
  });
});
