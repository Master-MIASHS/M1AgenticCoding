import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as core from '../../src/core/core.js';
import * as coreService from '../../src/services/coreService.js';
import * as rng from '../../src/core/rng.js';

describe('API publique du RNG', () => {
  it('expose les trois fonctions du RNG sans intermédiaire métier', () => {
    for (const name of ['tirageEntier', 'tirageAvecPoids', 'melanger']) {
      assert.equal(typeof coreService[name], 'function');
      assert.equal(core[name], rng[name]);
      assert.equal(coreService[name], rng[name]);
    }
  });

  it('permet les tirages via la façade', () => {
    assert.equal(coreService.tirageEntier(4, 4), 4);
    assert.equal(coreService.tirageAvecPoids(['a', 'b'], [0, 1]), 'b');
    assert.throws(() => coreService.tirageEntier(5, 2));
    assert.throws(() => coreService.tirageAvecPoids(['a'], [0]));
  });

  it('mélange des objets sans modifier le tableau ni perdre leurs occurrences', () => {
    const card = { rank: 'A', suit: 'hearts' };
    const other = { rank: 'K', suit: 'spades' };
    const cards = [card, card, other];
    const original = [...cards];
    const result = coreService.melanger(cards);

    assert.notEqual(result, cards);
    assert.deepEqual(cards, original);
    assert.equal(result.length, cards.length);
    assert.equal(result.filter((item) => item === card).length, 2);
    assert.equal(result.filter((item) => item === other).length, 1);
    assert.throws(() => coreService.melanger(null));
  });

  it('garde semer hors des deux points d’accès publics', () => {
    assert.equal(Object.hasOwn(core, 'semer'), false);
    assert.equal(Object.hasOwn(coreService, 'semer'), false);
  });
});
