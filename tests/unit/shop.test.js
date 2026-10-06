// Tests unitaires de la boutique côté Core (Groupe 1, tâche n°37, #205).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { SHOP_CONFIG } from '../../src/core/config/shop.config.js';

describe('shop.config', () => {
  it('fournit un catalogue vide par défaut (contenu de la boutique non décidé)', () => {
    assert.deepStrictEqual(SHOP_CONFIG.catalogue, []);
  });

  it('ne peut pas être modifiée par erreur', () => {
    assert.ok(Object.isFrozen(SHOP_CONFIG));
    assert.ok(Object.isFrozen(SHOP_CONFIG.catalogue));
  });
});
