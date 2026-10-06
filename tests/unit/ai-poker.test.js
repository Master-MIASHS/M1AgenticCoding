// Tests unitaires de l'IA des bots du poker (Groupe 1, tâche n°32, #196).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { AI_POKER_CONFIG } from '../../src/core/config/ai.config.js';
import { semer } from '../../src/core/rng.js';
import {
  niveauDeForce,
  actionsCandidates,
  montantDeRelance,
  deciderAction,
} from '../../src/core/ai/poker.js';

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

/**
 * Exécute un test avec une graine fixe, puis rétablit le hasard normal.
 * @param {string} graine - Graine du RNG.
 * @param {function(): void} test - Corps du test.
 */
function avecGraine(graine, test) {
  semer(graine);
  try {
    test();
  } finally {
    semer(null);
  }
}

/**
 * Config de test dont seul un multiplicateur de relance peut être tiré.
 * @param {number} index - Index du multiplicateur gardé.
 * @returns {object} Config de l'IA.
 */
function configRelanceUnique(index) {
  const poids = AI_POKER_CONFIG.relance.multiplicateurs.map((_, i) => (i === index ? 1 : 0));
  return {
    ...AI_POKER_CONFIG,
    relance: {
      multiplicateurs: AI_POKER_CONFIG.relance.multiplicateurs,
      poids: { faible: poids, moyenne: poids, forte: poids },
    },
  };
}

describe('montantDeRelance', () => {
  it('reste toujours entre minRaise et aiState.chips', () => {
    avecGraine('relance-bornes', () => {
      for (const niveau of NIVEAUX) {
        for (const chips of [40, 55, 100, 380]) {
          const s = situation({ aiState: { ...situation().aiState, chips } });
          for (let i = 0; i < 300; i += 1) {
            const montant = montantDeRelance(s, niveau);
            assert.ok(montant >= s.minRaise && montant <= chips, `${niveau} ${chips} ${montant}`);
          }
        }
      }
    });
  });

  it('vaut minRaise multiplié par le multiplicateur tiré dans la config', () => {
    const dernier = AI_POKER_CONFIG.relance.multiplicateurs.length - 1;
    const attendu = situation().minRaise * AI_POKER_CONFIG.relance.multiplicateurs[dernier];
    assert.strictEqual(montantDeRelance(situation(), 'forte', configRelanceUnique(dernier)), attendu);
  });

  it('est plafonné aux jetons du bot', () => {
    const dernier = AI_POKER_CONFIG.relance.multiplicateurs.length - 1;
    const s = situation({ aiState: { ...situation().aiState, chips: 50 } });
    assert.strictEqual(montantDeRelance(s, 'forte', configRelanceUnique(dernier)), 50);
  });

  it('rejette un niveau inconnu ou une relance impossible', () => {
    assert.throws(() => montantDeRelance(situation(), 'énorme'), /montantDeRelance/);
    const pauvre = situation({ aiState: { ...situation().aiState, chips: 39 } });
    assert.throws(() => montantDeRelance(pauvre, 'forte'), /montantDeRelance/);
    assert.throws(() => montantDeRelance(situation({ minRaise: 0 }), 'forte'), /montantDeRelance/);
  });
});

/**
 * Config de test avec les mêmes poids d'actions pour tous les niveaux.
 * @param {{ fold: number, check: number, call: number, raise: number }} poids
 * @returns {object} Config de l'IA.
 */
function configPoidsActions(poids) {
  return { ...AI_POKER_CONFIG, poidsActions: { faible: poids, moyenne: poids, forte: poids } };
}

describe('deciderAction', () => {
  const combinaisons = [
    ['fold', 'call', 'raise'],
    ['check', 'raise'],
    ['fold', 'check'],
    ['fold', 'call'],
    ['call'],
    ['check'],
  ];

  it('renvoie toujours une action de availableActions, avec un montant dans les bornes', () => {
    avecGraine('decision-legale', () => {
      for (const availableActions of combinaisons) {
        for (const force of [0, 0.2, 0.5, 0.9, 1]) {
          const s = situation({ availableActions });
          for (let i = 0; i < 100; i += 1) {
            const decision = deciderAction(force, s);
            assert.ok(availableActions.includes(decision.type), decision.type);
            if (decision.type === 'raise') {
              assert.ok(decision.amount >= s.minRaise && decision.amount <= s.aiState.chips);
            }
          }
        }
      }
    });
  });

  it('suit les poids de la config : une action de poids nul n’est jamais jouée', () => {
    const config = configPoidsActions({ fold: 0, check: 1, call: 1, raise: 0 });
    avecGraine('decision-poids', () => {
      for (let i = 0; i < 300; i += 1) {
        const decision = deciderAction(0.5, situation(), { config });
        assert.strictEqual(decision.type, 'call');
      }
    });
  });

  it('prend l’action de repli quand toutes les actions possibles ont un poids nul', () => {
    const config = configPoidsActions({ fold: 0, check: 0, call: 0, raise: 0 });
    assert.deepStrictEqual(deciderAction(0.5, situation(), { config }), { type: 'call' });
    const s = situation({ availableActions: ['fold', 'raise'] });
    assert.deepStrictEqual(deciderAction(0.5, s, { config }), { type: 'fold' });
  });

  it('ajoute un montant seulement pour une relance', () => {
    const relance = configPoidsActions({ fold: 0, check: 0, call: 0, raise: 1 });
    const decision = deciderAction(1, situation(), { config: relance });
    assert.strictEqual(decision.type, 'raise');
    assert.deepStrictEqual(Object.keys(decision).sort(), ['amount', 'type']);
    const suivre = configPoidsActions({ fold: 0, check: 0, call: 1, raise: 0 });
    assert.deepStrictEqual(deciderAction(1, situation(), { config: suivre }), { type: 'call' });
  });

  it('donne la même suite de décisions avec la même graine', () => {
    const jouer = () => {
      const decisions = [];
      avecGraine('decision-reproductible', () => {
        for (let i = 0; i < 50; i += 1) {
          decisions.push(deciderAction((i % 11) / 10, situation()));
        }
      });
      return decisions;
    };
    assert.deepStrictEqual(jouer(), jouer());
  });

  it('propage les erreurs de force et de situation', () => {
    assert.throws(() => deciderAction(2, situation()), /force/);
    assert.throws(() => deciderAction(0.5, situation({ availableActions: [] })), /availableActions/);
  });
});
