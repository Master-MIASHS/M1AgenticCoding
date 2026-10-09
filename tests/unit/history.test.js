import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHistoryEntry } from '../../src/core/history.js';

const entry = {
  roundId: 'wheel-round-opaque', gameId: 'wheel', bet: 10.25,
  outcome: 'win', payout: 20.5, netGain: 10.25,
  playedAt: '2026-10-07T15:00:00.000Z',
};

describe('Préparation pure de l’historique (#229)', () => {
  for (const [outcome, payout, netGain] of [
    ['win', 20.5, 10.25], ['loss', 0, -10.25], ['push', 10.25, 0],
  ]) {
    it(`conserve le règlement ${outcome} sans recalcul ni arrondi`, () => {
      const input = { ...entry, outcome, payout, netGain };
      assert.deepEqual(createHistoryEntry(input), input);
    });
  }

  it('préserve un gain net nul après arrondi, même pour win ou loss', () => {
    for (const outcome of ['win', 'loss']) {
      const input = { ...entry, bet: 0.001, payout: 0, netGain: 0, outcome };
      assert.deepEqual(createHistoryEntry(input), input);
    }
  });

  it('préserve aussi les décimales du montant reversé et du gain net', () => {
    const input = { ...entry, bet: 10.25, payout: 20.567, netGain: 10.317 };
    assert.deepEqual(createHistoryEntry(input), input);
  });

  it('refuse les montants incohérents sans modifier les données reçues', () => {
    for (const netGain of [500, -500]) {
      const input = Object.freeze({ ...entry, bet: 10, payout: 0, netGain });
      assert.throws(() => createHistoryEntry(input), RangeError);
      assert.equal(input.netGain, netGain);
    }
  });

  it('tolère un écart au plus égal à un centime sans arrondir les montants', () => {
    for (const netGain of [-0.01, 0.01]) {
      const input = { ...entry, bet: 1, payout: 1, netGain };
      assert.deepEqual(createHistoryEntry(input), input);
    }
    for (const netGain of [-0.010001, 0.010001]) {
      assert.throws(() => createHistoryEntry({ ...entry, bet: 1, payout: 1, netGain }),
        RangeError);
    }
  });

  it('refuse un écart non fini même lorsque les montants sont finis', () => {
    assert.throws(() => createHistoryEntry({ ...entry, bet: Number.MAX_VALUE,
      payout: 0, netGain: Number.MAX_VALUE }), RangeError);
  });

  it('retourne des objets indépendants sans modifier une entrée gelée', () => {
    const input = Object.freeze({ ...entry, details: { opaque: true } });
    const first = createHistoryEntry(input);
    const second = createHistoryEntry(input);
    assert.deepEqual(first, entry);
    assert.notEqual(first, input);
    assert.notEqual(first, second);
    first.netGain = 999;
    assert.equal(second.netGain, entry.netGain);
    assert.equal(input.netGain, entry.netGain);
  });

  it('préserve un roundId opaque sans imposer de générateur ni catalogue', () => {
    const input = { ...entry, roundId: 'custom/id:42', gameId: 'future-game' };
    assert.deepEqual(createHistoryEntry(input), input);
  });

  it('produit une entrée sérialisable fidèlement en JSON', () => {
    const result = createHistoryEntry(entry);
    assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  });

  it('conserve un roundId explicitement null pour les appels historiques', () => {
    const input = Object.freeze({ ...entry, roundId: null });
    const result = createHistoryEntry(input);
    assert.deepEqual(result, input);
    assert.notEqual(result, input);
    assert.equal(result.roundId, null);
    assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  });

  it('refuse les entrées absentes ou non objets', () => {
    for (const input of [undefined, null, [], 5, 'entry', true]) {
      assert.throws(() => createHistoryEntry(input), TypeError);
    }
  });

  for (const field of ['roundId', 'gameId']) {
    it(`refuse ${field} absent, vide ou non chaîne sans mutation`, () => {
      const invalidValues = [undefined, '', '  ', 12, {}, []];
      if (field === 'gameId') invalidValues.push(null);
      for (const value of invalidValues) {
        const input = { ...entry, [field]: value };
        const before = { ...input };
        assert.throws(() => createHistoryEntry(input), TypeError);
        assert.deepEqual(input, before);
      }
    });
  }

  it('ne transforme pas un roundId omis en null', () => {
    const input = { ...entry };
    delete input.roundId;
    assert.throws(() => createHistoryEntry(input), TypeError);
    assert.equal(Object.hasOwn(input, 'roundId'), false);
  });

  for (const field of ['bet', 'payout', 'netGain']) {
    it(`refuse ${field} non fini ou non numérique`, () => {
      for (const value of [undefined, null, '10', NaN, Infinity, -Infinity, true, 10n]) {
        assert.throws(() => createHistoryEntry({ ...entry, [field]: value }), TypeError);
      }
    });
  }

  it('refuse une mise non positive et un montant reversé négatif', () => {
    for (const bet of [0, -1]) {
      assert.throws(() => createHistoryEntry({ ...entry, bet }), RangeError);
    }
    assert.throws(() => createHistoryEntry({ ...entry, payout: -1 }), RangeError);
  });

  it('refuse un résultat hors du contrat G2', () => {
    for (const outcome of [undefined, null, 'draw', 'WIN', {}, 1]) {
      assert.throws(() => createHistoryEntry({ ...entry, outcome }), TypeError);
    }
  });

  it('refuse les dates impossibles ou non ISO UTC canoniques', () => {
    for (const playedAt of [undefined, null, 0, new Date(), '', 'invalid',
      '2026-02-30T00:00:00.000Z', '2026-10-07', '2026-10-07T17:00:00.000+02:00']) {
      assert.throws(() => createHistoryEntry({ ...entry, playedAt }), TypeError);
    }
  });
});
