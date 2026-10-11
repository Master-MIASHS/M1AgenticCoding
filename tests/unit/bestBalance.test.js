import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBestBalance } from '../../src/core/bestBalance.js';

describe('Calcul pur du meilleur solde', () => {
  it('augmente le record quand le nouveau solde le dépasse', () => {
    assert.equal(calculateBestBalance(1000, 1250), 1250);
  });

  it('conserve le record après une perte ou une faillite', () => {
    assert.equal(calculateBestBalance(1250, 500), 1250);
    assert.equal(calculateBestBalance(1250, 0), 1250);
  });

  it('conserve un record égal au nouveau solde et accepte zéro', () => {
    assert.equal(calculateBestBalance(1000, 1000), 1000);
    assert.equal(calculateBestBalance(0, 0), 0);
    assert.equal(calculateBestBalance(0, 10), 10);
  });

  it('préserve les montants fractionnaires sans les arrondir', () => {
    assert.equal(calculateBestBalance(1000.25, 1000.5), 1000.5);
    assert.equal(calculateBestBalance(1000.5, 1000.25), 1000.5);
  });

  it('reste compatible avec les nombres finis acceptés par le state', () => {
    assert.equal(calculateBestBalance(1000, -10), 1000);
    assert.equal(calculateBestBalance(-20, -10), -10);
    assert.equal(calculateBestBalance(0, Number.MAX_VALUE), Number.MAX_VALUE);
  });

  it('conserve le plus haut solde sur une succession de règlements', () => {
    let bestBalance = 1000;
    for (const [balance, expected] of [[1500, 1500], [800, 1500],
      [0, 1500], [2000, 2000], [1000, 2000]]) {
      bestBalance = calculateBestBalance(bestBalance, balance);
      assert.equal(bestBalance, expected);
    }
  });

  for (const [name, position] of [['previousBestBalance', 0], ['newBalance', 1]]) {
    it(`rejette les valeurs invalides pour ${name}, même si l'autre montant est supérieur`, () => {
      for (const invalid of [NaN, Infinity, -Infinity, '1000', null, undefined,
        true, {}, [], 1000n, new Number(1000)]) {
        const values = [2000, 2000];
        values[position] = invalid;
        assert.throws(() => calculateBestBalance(...values), {
          name: 'TypeError',
          message: `bestBalance: ${name} must be a finite number.`,
        });
      }
    });
  }
});
