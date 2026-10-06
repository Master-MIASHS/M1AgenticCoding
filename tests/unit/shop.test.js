// Tests unitaires de la boutique côté Core (Groupe 1, tâche n°37, #205).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { SHOP_CONFIG } from '../../src/core/config/shop.config.js';
import { validerCatalogue } from '../../src/core/shop.js';

describe('shop.config', () => {
  it('fournit un catalogue vide par défaut (contenu de la boutique non décidé)', () => {
    assert.deepStrictEqual(SHOP_CONFIG.catalogue, []);
  });

  it('ne peut pas être modifiée par erreur', () => {
    assert.ok(Object.isFrozen(SHOP_CONFIG));
    assert.ok(Object.isFrozen(SHOP_CONFIG.catalogue));
  });
});

/**
 * Construit un article valide du catalogue, modifiable.
 * Articles de test uniquement : ils ne fixent pas le contenu de la boutique.
 * @param {object} [changements] - Champs à remplacer.
 * @returns {object} Article de test.
 */
function article(changements = {}) {
  return {
    id: 'article-test',
    name: 'Article de test',
    description: 'Article utilisé par les tests.',
    category: 'test',
    price: 200,
    available: true,
    ...changements,
  };
}

describe('validerCatalogue', () => {
  it('accepte un catalogue valide, vide ou avec un visuel facultatif', () => {
    assert.doesNotThrow(() => validerCatalogue([]));
    assert.doesNotThrow(() =>
      validerCatalogue([article(), article({ id: 'gratuit', price: 0, visual: '✦' })]),
    );
  });

  it('rejette un catalogue qui n’est pas un tableau', () => {
    for (const catalogue of [null, undefined, {}, 'catalogue']) {
      assert.throws(() => validerCatalogue(catalogue), /validerCatalogue/);
    }
  });

  it('rejette un article mal formé', () => {
    const invalides = [
      null,
      article({ id: '' }),
      article({ id: 42 }),
      article({ name: undefined }),
      article({ description: null }),
      article({ category: 3 }),
      article({ price: 1.5 }),
      article({ price: -1 }),
      article({ price: '200' }),
      article({ price: Infinity }),
      article({ available: 'oui' }),
      article({ visual: 7 }),
    ];
    for (const a of invalides) {
      assert.throws(() => validerCatalogue([a]), /validerCatalogue/, JSON.stringify(a));
    }
  });

  it('rejette deux articles de même identifiant', () => {
    assert.throws(
      () => validerCatalogue([article(), article({ name: 'Doublon' })]),
      /validerCatalogue : identifiant en double article-test/,
    );
  });
});
