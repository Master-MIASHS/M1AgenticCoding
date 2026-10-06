// Tests unitaires de l'IA des bots du poker (Groupe 1, tâche n°32, #196).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { AI_POKER_CONFIG } from '../../src/core/config/ai.config.js';
import { niveauDeForce, actionsCandidates } from '../../src/core/ai/poker.js';

const NIVEAUX = ['faible', 'moyenne', 'forte'];
const ACTIONS = ['fold', 'check', 'call', 'raise'];

describe('ai.config', () => {
  it('fournit des seuils, des poids pour chaque niveau et action, et des tailles de relance', () => {
    const { seuils, poidsActions, relance, ordreDeRepli } = AI_POKER_CONFIG;
    assert.ok(seuils.moyenne >= 0 && seuils.moyenne <= seuils.forte && seuils.forte <= 1);
    for (const niveau of NIVEAUX) {
      for (const action of ACTIONS) {
        const poids = poidsActions[niveau][action];
        assert.ok(Number.isFinite(poids) && poids >= 0, `${niveau}.${action}`);
      }
      assert.strictEqual(relance.poids[niveau].length, relance.multiplicateurs.length);
    }
    assert.ok(relance.multiplicateurs.every((m) => Number.isFinite(m) && m >= 1));
    assert.deepStrictEqual([...ordreDeRepli].sort(), [...ACTIONS].sort());
  });

  it('ne peut pas être modifiée par erreur', () => {
    assert.ok(Object.isFrozen(AI_POKER_CONFIG));
    assert.ok(Object.isFrozen(AI_POKER_CONFIG.seuils));
    assert.ok(Object.isFrozen(AI_POKER_CONFIG.poidsActions.faible));
    assert.ok(Object.isFrozen(AI_POKER_CONFIG.relance.multiplicateurs));
    assert.ok(Object.isFrozen(AI_POKER_CONFIG.relance.poids.forte));
    assert.ok(Object.isFrozen(AI_POKER_CONFIG.ordreDeRepli));
  });
});

describe('niveauDeForce', () => {
  const config = { ...AI_POKER_CONFIG, seuils: { moyenne: 0.4, forte: 0.8 } };

  it('classe une force selon les seuils de la config', () => {
    assert.strictEqual(niveauDeForce(0, config), 'faible');
    assert.strictEqual(niveauDeForce(0.39, config), 'faible');
    assert.strictEqual(niveauDeForce(0.4, config), 'moyenne');
    assert.strictEqual(niveauDeForce(0.79, config), 'moyenne');
    assert.strictEqual(niveauDeForce(0.8, config), 'forte');
    assert.strictEqual(niveauDeForce(1, config), 'forte');
  });

  it('utilise la config par défaut si aucune n’est fournie', () => {
    assert.strictEqual(niveauDeForce(AI_POKER_CONFIG.seuils.forte), 'forte');
  });

  it('rejette une force hors de [0, 1] ou non numérique', () => {
    for (const force of [-0.1, 1.1, NaN, Infinity, '0.5', null, undefined]) {
      assert.throws(() => niveauDeForce(force, config), /force/, String(force));
    }
  });
});

/**
 * Construit une situation de jeu valide (contrat G2, discussion #9), modifiable.
 * @param {object} [changements] - Champs à remplacer.
 * @returns {object} Situation de test.
 */
function situation(changements = {}) {
  return {
    stage: 'flop',
    communityCards: [
      { rank: 'A', suit: 'hearts' },
      { rank: '7', suit: 'clubs' },
      { rank: '2', suit: 'spades' },
    ],
    pot: 150,
    currentBet: 20,
    minRaise: 40,
    playerState: { chips: 400, currentContribution: 20 },
    aiState: {
      hand: [{ rank: 'K', suit: 'spades' }, { rank: 'J', suit: 'clubs' }],
      chips: 380,
      currentContribution: 10,
    },
    availableActions: ['fold', 'call', 'raise'],
    ...changements,
  };
}

describe('actionsCandidates', () => {
  it('garde les actions possibles dans l’ordre reçu', () => {
    assert.deepStrictEqual(actionsCandidates(situation()), ['fold', 'call', 'raise']);
  });

  it('ne garde jamais fold quand check est possible', () => {
    const s = situation({ availableActions: ['fold', 'check', 'raise'] });
    assert.deepStrictEqual(actionsCandidates(s), ['check', 'raise']);
  });

  it('retire raise si les jetons du bot sont sous minRaise', () => {
    const s = situation({ aiState: { ...situation().aiState, chips: 39 } });
    assert.deepStrictEqual(actionsCandidates(s), ['fold', 'call']);
    const juste = situation({ aiState: { ...situation().aiState, chips: 40 } });
    assert.deepStrictEqual(actionsCandidates(juste), ['fold', 'call', 'raise']);
  });

  it('rejette une situation invalide', () => {
    const invalides = [
      null,
      [],
      situation({ availableActions: [] }),
      situation({ availableActions: 'call' }),
      situation({ availableActions: ['call', 'allin'] }),
      situation({ aiState: null }),
      situation({ aiState: { chips: -1 } }),
      situation({ aiState: { chips: Infinity } }),
      situation({ minRaise: 0 }),
      situation({ minRaise: '40' }),
    ];
    for (const s of invalides) {
      assert.throws(() => actionsCandidates(s), /actionsCandidates/);
    }
  });

  it('ne vérifie minRaise que si raise est possible', () => {
    const s = situation({ minRaise: undefined, availableActions: ['fold', 'call'] });
    assert.deepStrictEqual(actionsCandidates(s), ['fold', 'call']);
  });

  it('lève une erreur si aucune action ne reste jouable', () => {
    const s = situation({ availableActions: ['raise'], aiState: { chips: 10 } });
    assert.throws(() => actionsCandidates(s), /aucune action/);
  });
});
