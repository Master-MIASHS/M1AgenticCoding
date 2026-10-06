// Tests unitaires de l'IA des bots du poker (Groupe 1, tâche n°32, #196).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { AI_POKER_CONFIG } from '../../src/core/config/ai.config.js';
import { niveauDeForce } from '../../src/core/ai/poker.js';

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
