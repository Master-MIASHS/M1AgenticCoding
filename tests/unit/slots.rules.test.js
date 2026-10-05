// Unit tests for the Slots rules (Groupe 2 - issue #31).
//
// Contract under test: resolve(raw, { bets, config }) returns a gameResult
// { outcome, multiplier, details }.
//
// HYPOTHESIS (to confirm with the G2 integration referent): the Core's roll()
// only exposes a single float (value) and ignores params, so the three reels of
// Slots are read from raw.values - an array of three floats in [0, 1). The shape
// of the raw rolls is an open question: see issue #73 and issue #27 (RNG, G1).
//
// The reel distribution and the paytable are NOT defined by the project yet, so
// both are INJECTED through config (AGENTS.md rule 4). The tables below are test
// fixtures, not game decisions.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { resolve, getReels, getTotalStake } from '../../src/games/slots/rules.js';

/**
 * Test-only reel -> symbol distribution, four exclusive bands over [0, 1).
 * A reel falls in a band when it is strictly lower than that band's `max`.
 */
const SYMBOLS = {
  bands: [
    { max: 0.4, symbol: 'A' },
    { max: 0.7, symbol: 'B' },
    { max: 0.9, symbol: 'C' },
    { max: 1, symbol: 'D' },
  ],
};

/** Test-only paytable, keyed by the three symbols concatenated. */
const PAYOUTS = {
  AAA: { outcome: 'win', multiplier: 50 },
  BBB: { outcome: 'win', multiplier: 25 },
  CCC: { outcome: 'win', multiplier: 10 },
  DDD: { outcome: 'win', multiplier: 10 },
  ABA: { outcome: 'win', multiplier: 5 },
  AAB: { outcome: 'win', multiplier: 3 },
  ABC: { outcome: 'win', multiplier: 1 },
  ABD: { outcome: 'loss', multiplier: 0 },
};

/** Builds a valid raw roll for Slots. @param {[number, number, number]} values */
const raw = (values) => ({ gameId: 'slots', values, nonce: 7 });

/** Single-bet options, as the orchestrator always sends an array. */
const BETS = [{ type: 'mise', amount: 20 }];

/** @param {object} [overrides] */
const config = (overrides = {}) => ({ symbols: SYMBOLS, payouts: PAYOUTS, ...overrides });

describe('slots getReels', () => {
  it('retourne les trois valeurs de raw.values', () => {
    assert.deepEqual(getReels(raw([0.1, 0.5, 0.95])), [0.1, 0.5, 0.95]);
  });

  it('exige exactement trois rouleaux', () => {
    assert.throws(() => getReels(raw([0.1, 0.5])), RangeError);
    assert.throws(() => getReels(raw([0.1, 0.5, 0.9, 0.2])), RangeError);
  });

  it('rejette un raw sans values numérique', () => {
    assert.throws(() => getReels({ gameId: 'slots', value: 0.1 }), TypeError);
    assert.throws(() => getReels({ gameId: 'slots', values: ['a', 'b', 'c'] }), TypeError);
    assert.throws(() => getReels({ gameId: 'slots', values: [] }), TypeError);
    assert.throws(() => getReels(null), TypeError);
  });

  it('rejette un rouleau hors de [0, 1)', () => {
    assert.throws(() => getReels(raw([0.1, 0.5, 1.4])), RangeError);
    assert.throws(() => getReels(raw([0.1, 0.5, 1])), RangeError);
  });
});

describe('slots getTotalStake', () => {
  it('additionne les montants d\'un tableau de mises', () => {
    assert.equal(
      getTotalStake([
        { type: 'mise', amount: 20 },
        { type: 'bonus', amount: 5 },
      ]),
      25,
    );
  });

  it('retourne 0 pour un tableau vide', () => {
    assert.equal(getTotalStake([]), 0);
  });

  it('rejette des bets qui ne sont pas un tableau', () => {
    assert.throws(() => getTotalStake(20), TypeError);
    assert.throws(() => getTotalStake([{ type: 'mise' }]), TypeError);
  });
});

describe('slots resolve - validation des entrées', () => {
  it('exige la distribution des symboles injectée dans config.symbols', () => {
    assert.throws(() => resolve(raw([0.1, 0.5, 0.95]), { bets: BETS, config: {} }), TypeError);
    assert.throws(
      () => resolve(raw([0.1, 0.5, 0.95]), { bets: BETS, config: config({ symbols: undefined }) }),
      TypeError,
    );
  });

  it('exige la table de gains injectée dans config.payouts', () => {
    assert.throws(() => resolve(raw([0.1, 0.5, 0.95]), { bets: BETS }), TypeError);
    assert.throws(
      () => resolve(raw([0.1, 0.5, 0.95]), { bets: BETS, config: config({ payouts: undefined }) }),
      TypeError,
    );
  });

  it('rejette des bets qui ne sont pas un tableau', () => {
    assert.throws(() => resolve(raw([0.1, 0.5, 0.95]), { bets: 20, config: config() }), TypeError);
  });

  it('rejette une distribution de symboles mal formée', () => {
    const malformed = (symbols) =>
      assert.throws(
        () => resolve(raw([0.1, 0.5, 0.95]), { bets: BETS, config: config({ symbols }) }),
        TypeError,
      );

    malformed({ bands: [] });
    malformed({ bands: [{ max: 0.4 }] }); // no symbol
    malformed({ bands: [{ max: 0.4, symbol: '' }] }); // empty symbol
    malformed({ bands: [{ max: 1.4, symbol: 'A' }] }); // max > 1
    malformed({
      bands: [
        { max: 0.7, symbol: 'B' },
        { max: 0.4, symbol: 'A' },
      ],
    }); // not sorted
  });

  it('rejette une table de gains mal formée', () => {
    const malformed = (payouts) =>
      assert.throws(
        () => resolve(raw([0.1, 0.5, 0.95]), { bets: BETS, config: config({ payouts }) }),
        TypeError,
      );

    malformed([]);
    malformed({ AAA: { outcome: 'maybe', multiplier: 2 } });
    malformed({ AAA: { outcome: 'win' } }); // no multiplier
    malformed({ AAA: { outcome: 'win', multiplier: -1 } });
    malformed({ AAA: { multiplier: 2 } }); // no outcome
  });

  it('rejette une combinaison absente de la table de gains', () => {
    // 0.1 -> A, 0.5 -> B, 0.8 -> C gives "ABC", which IS in the fixture, so a
    // combination genuinely missing from the table ("BAA") is used instead.
    const result = resolve(raw([0.1, 0.5, 0.8]), { bets: BETS, config: config() });
    assert.equal(result.details.combination, 'ABC', 'la combinaison témoin doit exister');

    assert.throws(
      () => resolve(raw([0.5, 0.1, 0.1]), { bets: BETS, config: config() }),
      TypeError,
      'BAA est absent de la fixture, resolve doit le refuser',
    );
  });
});

describe('slots resolve - interprétation des rouleaux', () => {
  it('convertit chaque rouleau en symbole via config.symbols', () => {
    const result = resolve(raw([0.1, 0.5, 0.8]), { bets: BETS, config: config() });
    assert.deepEqual(result.details.symbols, ['A', 'B', 'C']);
    assert.equal(result.details.combination, 'ABC');
  });

  it('applique le multiplicateur de la combinaison gagnante', () => {
    const result = resolve(raw([0.1, 0.1, 0.1]), { bets: BETS, config: config() });
    assert.equal(result.details.combination, 'AAA');
    assert.equal(result.outcome, 'win');
    assert.equal(result.multiplier, 50);
  });

  it('retourne loss / multiplier 0 pour une combinaison perdante', () => {
    const result = resolve(raw([0.1, 0.5, 0.95]), { bets: BETS, config: config() });
    assert.equal(result.details.combination, 'ABD');
    assert.equal(result.outcome, 'loss');
    assert.equal(result.multiplier, 0);
  });

  it('place chaque frontière de symbole du bon côté (max est exclusif)', () => {
    // Les trois rouleaux valent la même valeur : AAA, BBB, CCC et DDD existent
    // tous dans la fixture, donc seule la conversion valeur -> symbole est testée.
    const symbolAt = (value) =>
      resolve(raw([value, value, value]), { bets: BETS, config: config() }).details.symbols[0];

    assert.equal(symbolAt(0.3999), 'A');
    assert.equal(symbolAt(0.4), 'B');
    assert.equal(symbolAt(0.7), 'C');
    assert.equal(symbolAt(0.999999), 'D');
  });

  it('conserve la valeur brute des rouleaux dans details', () => {
    const result = resolve(raw([0.1, 0.5, 0.95]), { bets: BETS, config: config() });
    assert.deepEqual(result.details.reels, [0.1, 0.5, 0.95]);
  });

  it('reste déterministe : même entrée, même sortie, aucun effet de bord', () => {
    const bets = [{ type: 'mise', amount: 20 }];
    const before = JSON.stringify(bets);
    const first = resolve(raw([0.1, 0.1, 0.1]), { bets, config: config() });
    const second = resolve(raw([0.1, 0.1, 0.1]), { bets, config: config() });

    assert.deepEqual(first, second);
    assert.equal(JSON.stringify(bets), before, 'bets ne doit pas être muté');
  });

  it('ne mute pas la configuration injectée', () => {
    const injected = config();
    const before = JSON.stringify(injected);
    resolve(raw([0.1, 0.5, 0.95]), { bets: BETS, config: injected });
    assert.equal(JSON.stringify(injected), before, 'config ne doit pas être muté');
  });
});

describe('slots resolve - cas limites', () => {
  it('mise nulle : la mise est réinjectée dans details', () => {
    const result = resolve(raw([0.1, 0.1, 0.1]), {
      bets: [{ type: 'mise', amount: 0 }],
      config: config(),
    });
    assert.equal(result.details.stake, 0);
    assert.equal(result.multiplier, 50);
  });

  it('mise nulle et perdante : outcome loss, multiplier 0', () => {
    const result = resolve(raw([0.1, 0.5, 0.95]), {
      bets: [{ type: 'mise', amount: 0 }],
      config: config(),
    });
    assert.equal(result.outcome, 'loss');
    assert.equal(result.multiplier, 0);
  });

  it('additionne les mises multiples pour la mise totale', () => {
    const result = resolve(raw([0.1, 0.1, 0.1]), {
      bets: [
        { type: 'mise', amount: 20 },
        { type: 'bonus', amount: 5 },
      ],
      config: config(),
    });
    assert.equal(result.details.stake, 25);
  });

  it('accepte un bets à un seul élément comme un tableau', () => {
    const result = resolve(raw([0.1, 0.1, 0.1]), {
      bets: [{ type: 'mise', amount: 8 }],
      config: config(),
    });
    assert.equal(result.details.stake, 8);
  });

  it('gère une table où toutes les combinaisons sont perdantes', () => {
    const losing = config({
      payouts: { AAA: { outcome: 'loss', multiplier: 0 } },
    });
    const result = resolve(raw([0.1, 0.1, 0.1]), { bets: BETS, config: losing });
    assert.equal(result.outcome, 'loss');
    assert.equal(result.multiplier, 0);
  });
});
