// Test de conformité du contrat Cartes (docs/contracts/cards-contract.md, section 6).
// Groupe 1 - ticket #70.
// semer() est importé directement depuis src/core/rng.js : réservé aux tests,
// il n'est pas exposé via coreService (section 5 du contrat).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { melanger, semer } from '../../src/core/rng.js';
import {
  RANKS,
  SUITS,
  blackjackTotal,
  baccaratTotal,
  evaluatePokerHand,
} from '../../src/games/cardUtils.js';

function construirePaquet(deckCount) {
  const paquet = [];
  for (let d = 0; d < deckCount; d += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        paquet.push({ rank, suit });
      }
    }
  }
  return paquet;
}

function compterCartes(paquet) {
  const compte = new Map();
  for (const { rank, suit } of paquet) {
    const cle = `${rank}:${suit}`;
    compte.set(cle, (compte.get(cle) ?? 0) + 1);
  }
  return compte;
}

describe('contrat cartes : paquet mélangé par melanger()', () => {
  for (const deckCount of [1, 2]) {
    it(`paquet de ${deckCount} jeu(x) : 52 × ${deckCount} cartes, sans perte ni doublon`, () => {
      const paquet = construirePaquet(deckCount);
      const copie = structuredClone(paquet);
      const melange = melanger(paquet);

      assert.equal(melange.length, 52 * deckCount);
      const compte = compterCartes(melange);
      assert.equal(compte.size, 52);
      for (const n of compte.values()) {
        assert.equal(n, deckCount);
      }
      assert.deepEqual(paquet, copie); // liste d'origine intacte
    });
  }

  it('semer() rend melanger() reproductible', () => {
    const paquet = construirePaquet(1);
    semer('une-graine');
    try {
      const premier = melanger(paquet);
      semer('une-graine');
      const second = melanger(paquet);
      assert.deepEqual(premier, second);
    } finally {
      semer(null);
    }
  });
});

describe('contrat cartes : mains tirées passées aux fonctions du G2', () => {
  it('blackjackTotal / baccaratTotal / evaluatePokerHand sans TypeError', () => {
    semer('une-graine');
    try {
      for (const deckCount of [1, 2]) {
        const paquet = melanger(construirePaquet(deckCount));
        for (let i = 0; i + 5 <= paquet.length; i += 5) {
          const main = paquet.slice(i, i + 5);
          assert.doesNotThrow(() => blackjackTotal(main.slice(0, 2)));
          assert.doesNotThrow(() => baccaratTotal(main.slice(0, 3)));
          // Poker : 5 cartes distinctes exigées, donc paquet d'un seul jeu.
          if (deckCount === 1) {
            assert.doesNotThrow(() => evaluatePokerHand(main));
          }
        }
      }
    } finally {
      semer(null);
    }
  });
});
