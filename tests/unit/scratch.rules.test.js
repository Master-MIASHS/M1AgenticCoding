// Unit tests for the Scratch rules (Groupe 2 - issue #31).
//
// Contract under test: resolve(raw, { bets, config }) returns a gameResult
// { outcome, multiplier, details }.
//
// The payout table is NOT defined by the project yet (no table in discussion
// #8, empty `multipliers` in src/core/config/games.config.js). It is therefore
// INJECTED through config.payouts - no tuning value is hardcoded here (AGENTS.md
// rule 4). The table below is a test fixture, not a game decision.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { resolve, getTotalStake } from '../../src/games/scratch/rules.js';

/**
 * Test-only payout table: four exclusive bands over [0, 1).
 * A value falls in a band when it is strictly lower than that band's `max`.
 */
const CONFIG = {
  payouts: {
    bands: [
      { max: 0.5, symbol: 'rien', outcome: 'loss', multiplier: 0 },
      { max: 0.8, symbol: 'petit', outcome: 'win', multiplier: 2 },
      { max: 0.95, symbol: 'moyen', outcome: 'win', multiplier: 5 },
      { max: 1, symbol: 'jackpot', outcome: 'win', multiplier: 20 },
    ],
  },
};

/** Builds a valid raw roll for Scratch. @param {number} value */
const raw = (value) => ({ gameId: 'scratch', value, nonce: 42 });

/** Single-bet options, as the orchestrator always sends an array. */
const BETS = [{ type: 'mise', amount: 10 }];

describe('scratch getTotalStake', () => {
  it('additionne les montants d\'un tableau de mises', () => {
    assert.equal(
      getTotalStake([
        { type: 'mise', amount: 10 },
        { type: 'bonus', amount: 5 },
      ]),
      15,
    );
  });

  it('retourne 0 pour un tableau vide', () => {
    assert.equal(getTotalStake([]), 0);
  });

  it('rejette une mise qui n\'est pas un objet amount numérique', () => {
    assert.throws(() => getTotalStake([{ type: 'mise' }]), TypeError);
    assert.throws(() => getTotalStake([{ type: 'mise', amount: 'dix' }]), TypeError);
    assert.throws(() => getTotalStake({ type: 'mise', amount: 10 }), TypeError);
  });
});

describe('scratch resolve - validation des entrées', () => {
  it('rejette un raw sans value numérique', () => {
    assert.throws(() => resolve({}, { bets: BETS, config: CONFIG }), TypeError);
    assert.throws(() => resolve(raw('0.9'), { bets: BETS, config: CONFIG }), TypeError);
    assert.throws(() => resolve(null, { bets: BETS, config: CONFIG }), TypeError);
  });

  it('rejette une value hors de [0, 1)', () => {
    assert.throws(() => resolve(raw(1), { bets: BETS, config: CONFIG }), RangeError);
    assert.throws(() => resolve(raw(-0.1), { bets: BETS, config: CONFIG }), RangeError);
  });

  it('rejette des bets qui ne sont pas un tableau', () => {
    assert.throws(
      () => resolve(raw(0.1), { bets: { type: 'mise', amount: 10 }, config: CONFIG }),
      TypeError,
    );
  });

  it('exige la table de gains injectée dans config.payouts', () => {
    assert.throws(() => resolve(raw(0.1), { bets: BETS }), TypeError);
    assert.throws(() => resolve(raw(0.1), { bets: BETS, config: {} }), TypeError);
    assert.throws(
      () => resolve(raw(0.1), { bets: BETS, config: { payouts: { bands: [] } } }),
      TypeError,
    );
  });

  it('rejette une table de gains mal formée', () => {
    const malformed = (bands) =>
      assert.throws(() => resolve(raw(0.1), { bets: BETS, config: { payouts: { bands } } }), TypeError);

    malformed([{ max: 0.5, outcome: 'win', multiplier: 2 }]); // no symbol
    malformed([{ max: 0.5, symbol: 'x', multiplier: 2 }]); // no outcome
    malformed([{ max: 0.5, symbol: 'x', outcome: 'maybe', multiplier: 2 }]); // bad outcome
    malformed([{ max: 0.5, symbol: 'x', outcome: 'win' }]); // no multiplier
    malformed([{ max: 0.5, symbol: 'x', outcome: 'win', multiplier: -1 }]); // negative
    malformed([{ max: 1.5, symbol: 'x', outcome: 'win', multiplier: 2 }]); // max > 1
    malformed([
      { max: 0.8, symbol: 'b', outcome: 'win', multiplier: 2 },
      { max: 0.5, symbol: 'a', outcome: 'win', multiplier: 2 },
    ]); // not sorted
  });
});

describe('scratch resolve - interprétation du tirage', () => {
  it('retourne le gameResult de la bande correspondant à value', () => {
    const result = resolve(raw(0.1), { bets: BETS, config: CONFIG });
    assert.deepEqual(result, {
      outcome: 'loss',
      multiplier: 0,
      details: { symbol: 'rien', value: 0.1, stake: 10 },
    });
  });

  it('applique le multiplicateur de la bande gagnante', () => {
    const result = resolve(raw(0.6), { bets: BETS, config: CONFIG });
    assert.equal(result.outcome, 'win');
    assert.equal(result.multiplier, 2);
    assert.equal(result.details.symbol, 'petit');
  });

  it('place chaque frontière de bande du bon côté (max est exclusif)', () => {
    const symbolAt = (value) => resolve(raw(value), { bets: BETS, config: CONFIG }).details.symbol;

    assert.equal(symbolAt(0.4999), 'rien');
    assert.equal(symbolAt(0.5), 'petit');
    assert.equal(symbolAt(0.8), 'moyen');
    assert.equal(symbolAt(0.95), 'jackpot');
    assert.equal(symbolAt(0.999999), 'jackpot');
  });

  it('reste déterministe : même entrée, même sortie, aucun effet de bord', () => {
    const bets = [{ type: 'mise', amount: 10 }];
    const before = JSON.stringify(bets);
    const first = resolve(raw(0.3), { bets, config: CONFIG });
    const second = resolve(raw(0.3), { bets, config: CONFIG });

    assert.deepEqual(first, second);
    assert.equal(JSON.stringify(bets), before, 'bets ne doit pas être muté');
  });

  it('ne mute pas la table de gains injectée', () => {
    const before = JSON.stringify(CONFIG);
    resolve(raw(0.6), { bets: BETS, config: CONFIG });
    assert.equal(JSON.stringify(CONFIG), before, 'config ne doit pas être muté');
  });
});

describe('scratch resolve - cas limites', () => {
  it('mise nulle : la mise est réinjectée dans details', () => {
    const result = resolve(raw(0.6), {
      bets: [{ type: 'mise', amount: 0 }],
      config: CONFIG,
    });
    assert.equal(result.details.stake, 0);
    assert.equal(result.multiplier, 2);
  });

  it('mise nulle et perdante : outcome loss, multiplier 0', () => {
    const result = resolve(raw(0.1), {
      bets: [{ type: 'mise', amount: 0 }],
      config: CONFIG,
    });
    assert.equal(result.outcome, 'loss');
    assert.equal(result.multiplier, 0);
  });

  it('additionne les mises multiples pour la mise totale', () => {
    const result = resolve(raw(0.6), {
      bets: [
        { type: 'mise', amount: 10 },
        { type: 'bonus', amount: 5 },
      ],
      config: CONFIG,
    });
    assert.equal(result.details.stake, 15);
  });

  it('accepte un bets à un seul élément comme un tableau', () => {
    const result = resolve(raw(0.6), {
      bets: [{ type: 'mise', amount: 7 }],
      config: CONFIG,
    });
    assert.equal(result.details.stake, 7);
  });

  it('gère une table où toutes les bandes sont perdantes', () => {
    const losing = {
      payouts: { bands: [{ max: 1, symbol: 'rien', outcome: 'loss', multiplier: 0 }] },
    };
    const result = resolve(raw(0.99), { bets: BETS, config: losing });
    assert.equal(result.outcome, 'loss');
    assert.equal(result.multiplier, 0);
  });
});
