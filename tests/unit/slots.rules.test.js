// Unit tests for the Slots rules (Groupe 2 - issue #31).
//
// Contract under test: resolve(raw, { bets, config }) returns a gameResult
// { outcome, multiplier, details }.
//
// RAW SHAPE: roll() only exposes a single float, so the three reel symbols
// are produced by the game's own draw (src/games/slots/draw.js, contrat G2
// § 4.1, écart 8) and resolve() reads raw.symbols - three symbols, drawn
// elsewhere. The distribution itself is tested in slots.draw.test.js.
//
// OUTCOME: deduced from the multiplier (> 1 win, = 1 push, < 1 loss), exactly
// like the Core settlement: the config carries only the multiplier.
//
// The paytable is NOT defined by the project yet, so it is INJECTED through
// config.paytable (AGENTS.md rule 4). The table below is a test fixture, not
// a game decision.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { resolve, getReels, getTotalStake } from '../../src/games/slots/rules.js';

/** Test-only paytable, keyed by the three symbols concatenated. */
const PAYOUTS = {
  AAA: { multiplier: 50 },
  BBB: { multiplier: 25 },
  CCC: { multiplier: 10 },
  DDD: { multiplier: 10 },
  ABA: { multiplier: 5 },
  AAB: { multiplier: 3 },
  ABC: { multiplier: 1 },
  ABD: { multiplier: 0 },
};

/** Builds a valid raw draw for Slots. @param {[string, string, string]} symbols */
const raw = (symbols) => ({ gameId: 'slots', symbols, nonce: 7 });

/** Single-bet options, as the orchestrator always sends an array. */
const BETS = [{ type: 'mise', amount: 20 }];

/** @param {object} [overrides] */
const config = (overrides = {}) => ({ paytable: PAYOUTS, ...overrides });

describe('slots getReels', () => {
  it('retourne les trois symboles de raw.symbols', () => {
    assert.deepEqual(getReels(raw(['A', 'B', 'D'])), ['A', 'B', 'D']);
  });

  it('exige exactement trois rouleaux', () => {
    assert.throws(() => getReels(raw(['A', 'B'])), RangeError);
    assert.throws(() => getReels(raw(['A', 'B', 'C', 'D'])), RangeError);
  });

  it('rejette un raw sans symbols', () => {
    assert.throws(() => getReels({ gameId: 'slots', value: 0.1 }), TypeError);
    assert.throws(() => getReels({ gameId: 'slots', symbols: [] }), TypeError);
    assert.throws(() => getReels({ gameId: 'slots', symbols: 'ABC' }), TypeError);
    assert.throws(() => getReels(null), TypeError);
  });

  it('rejette un symbole qui n\'est pas une chaîne non vide', () => {
    assert.throws(() => getReels(raw(['A', 'B', 3])), TypeError);
    assert.throws(() => getReels(raw(['A', 'B', ''])), TypeError);
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
  it('exige la table de gains injectée dans config.paytable', () => {
    assert.throws(() => resolve(raw(['A', 'B', 'C']), { bets: BETS }), TypeError);
    assert.throws(
      () => resolve(raw(['A', 'B', 'C']), { bets: BETS, config: config({ paytable: undefined }) }),
      TypeError,
    );
  });

  it('rejette des bets qui ne sont pas un tableau', () => {
    assert.throws(() => resolve(raw(['A', 'B', 'C']), { bets: 20, config: config() }), TypeError);
  });

  it('rejette une table de gains mal formée', () => {
    const malformed = (paytable) =>
      assert.throws(
        () => resolve(raw(['A', 'B', 'C']), { bets: BETS, config: config({ paytable }) }),
        TypeError,
      );

    malformed([]);
    malformed({ AAA: { multiplier: 'x2' } }); // not a number
    malformed({ AAA: {} }); // no multiplier
    malformed({ AAA: { multiplier: -1 } }); // negative
  });

  it('rejette une combinaison absente de la table de gains', () => {
    // "BAA" is genuinely missing from the fixture, "ABC" is not.
    const result = resolve(raw(['A', 'B', 'C']), { bets: BETS, config: config() });
    assert.equal(result.details.combination, 'ABC', 'la combinaison témoin doit exister');

    assert.throws(
      () => resolve(raw(['B', 'A', 'A']), { bets: BETS, config: config() }),
      TypeError,
      'BAA est absent de la fixture, resolve doit le refuser',
    );
  });
});

describe('slots resolve - interprétation des rouleaux', () => {
  it('construit la combinaison à partir des trois symboles tirés', () => {
    const result = resolve(raw(['A', 'B', 'C']), { bets: BETS, config: config() });
    assert.deepEqual(result.details.symbols, ['A', 'B', 'C']);
    assert.equal(result.details.combination, 'ABC');
  });

  it('applique le multiplicateur de la combinaison gagnante', () => {
    const result = resolve(raw(['A', 'A', 'A']), { bets: BETS, config: config() });
    assert.equal(result.details.combination, 'AAA');
    assert.equal(result.outcome, 'win');
    assert.equal(result.multiplier, 50);
  });

  it('retourne loss / multiplier 0 pour une combinaison perdante', () => {
    const result = resolve(raw(['A', 'B', 'D']), { bets: BETS, config: config() });
    assert.equal(result.details.combination, 'ABD');
    assert.equal(result.outcome, 'loss');
    assert.equal(result.multiplier, 0);
  });

  it('reste déterministe : même entrée, même sortie, aucun effet de bord', () => {
    const bets = [{ type: 'mise', amount: 20 }];
    const before = JSON.stringify(bets);
    const first = resolve(raw(['A', 'A', 'A']), { bets, config: config() });
    const second = resolve(raw(['A', 'A', 'A']), { bets, config: config() });

    assert.deepEqual(first, second);
    assert.equal(JSON.stringify(bets), before, 'bets ne doit pas être muté');
  });

  it('ne mute pas la configuration injectée', () => {
    const injected = config();
    const before = JSON.stringify(injected);
    resolve(raw(['A', 'B', 'D']), { bets: BETS, config: injected });
    assert.equal(JSON.stringify(injected), before, 'config ne doit pas être muté');
  });
});

describe('slots resolve - outcome déduit du multiplicateur (economy.js)', () => {
  it('multiplier > 1 => win', () => {
    const result = resolve(raw(['A', 'A', 'A']), { bets: BETS, config: config() });
    assert.equal(result.multiplier, 50);
    assert.equal(result.outcome, 'win');
  });

  it('multiplier = 1 => push', () => {
    const result = resolve(raw(['A', 'B', 'C']), { bets: BETS, config: config() });
    assert.equal(result.multiplier, 1);
    assert.equal(result.outcome, 'push');
  });

  it('multiplier < 1 => loss', () => {
    const result = resolve(raw(['A', 'B', 'D']), { bets: BETS, config: config() });
    assert.equal(result.multiplier, 0);
    assert.equal(result.outcome, 'loss');
  });

  it('ignore un éventuel outcome porté par la config (jamais cru)', () => {
    // Un ancien champ `outcome` en contradiction avec le multiplicateur ne
    // doit pas faire échouer le règlement : seul le multiplicateur compte.
    const legacy = config({
      paytable: {
        AAA: { outcome: 'win', multiplier: 0 }, // incohérent : -> loss déduit
        BBB: { outcome: 'loss', multiplier: 5 }, // incohérent : -> win déduit
      },
    });

    const lost = resolve(raw(['A', 'A', 'A']), { bets: BETS, config: legacy });
    assert.equal(lost.outcome, 'loss');
    assert.equal(lost.multiplier, 0);

    const won = resolve(raw(['B', 'B', 'B']), { bets: BETS, config: legacy });
    assert.equal(won.outcome, 'win');
    assert.equal(won.multiplier, 5);
  });
});

describe('slots resolve - cas limites', () => {
  it('mise nulle : la mise est réinjectée dans details', () => {
    const result = resolve(raw(['A', 'A', 'A']), {
      bets: [{ type: 'mise', amount: 0 }],
      config: config(),
    });
    assert.equal(result.details.stake, 0);
    assert.equal(result.multiplier, 50);
  });

  it('mise nulle et perdante : outcome loss, multiplier 0', () => {
    const result = resolve(raw(['A', 'B', 'D']), {
      bets: [{ type: 'mise', amount: 0 }],
      config: config(),
    });
    assert.equal(result.outcome, 'loss');
    assert.equal(result.multiplier, 0);
  });

  it('additionne les mises multiples pour la mise totale', () => {
    const result = resolve(raw(['A', 'A', 'A']), {
      bets: [
        { type: 'mise', amount: 20 },
        { type: 'bonus', amount: 5 },
      ],
      config: config(),
    });
    assert.equal(result.details.stake, 25);
  });

  it('accepte un bets à un seul élément comme un tableau', () => {
    const result = resolve(raw(['A', 'A', 'A']), {
      bets: [{ type: 'mise', amount: 8 }],
      config: config(),
    });
    assert.equal(result.details.stake, 8);
  });

  it('gère une table où toutes les combinaisons sont perdantes', () => {
    const losing = config({ paytable: { AAA: { multiplier: 0 } } });
    const result = resolve(raw(['A', 'A', 'A']), { bets: BETS, config: losing });
    assert.equal(result.outcome, 'loss');
    assert.equal(result.multiplier, 0);
  });
});
