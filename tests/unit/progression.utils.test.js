// Unit tests for the Progression screen pure helpers (no DOM needed).
// Covers the split between unlocked / locked games and the level progress
// computation, including the contract gaps (missing xp threshold).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  splitGamesByUnlock,
  getLevelProgress,
  formatNumber,
} from '../../src/pages/Progression/progression.utils.js';

const REGISTRY = [
  { id: 'slots', name: 'Slots', unlockLevel: 1, category: 'table' },
  { id: 'dice', name: 'Dice', unlockLevel: 1, category: 'dice' },
  { id: 'blackjack', name: 'Blackjack', unlockLevel: 3, category: 'table' },
  { id: 'poker', name: 'Poker', unlockLevel: 12, category: 'poker' },
];

describe('splitGamesByUnlock', () => {
  it('sépare les jeux en débloqués et verrouillés', () => {
    const { unlocked, locked } = splitGamesByUnlock(REGISTRY, ['slots', 'dice']);
    assert.deepEqual(unlocked.map((g) => g.id), ['slots', 'dice']);
    assert.deepEqual(locked.map((g) => g.id), ['blackjack', 'poker']);
  });

  it('trie les jeux verrouillés par niveau requis croissant', () => {
    const { locked } = splitGamesByUnlock(REGISTRY, ['poker']);
    assert.deepEqual(locked.map((g) => g.id), ['slots', 'dice', 'blackjack']);
  });

  it('conserve en débloqués les ids absents du registre', () => {
    const { unlocked } = splitGamesByUnlock(REGISTRY, ['ghost']);
    const ghost = unlocked.find((g) => g.id === 'ghost');
    assert.ok(ghost, 'l id inconnu doit rester visible');
    assert.equal(ghost.name, 'ghost');
  });

  it('gère une liste de déblocage absente ou invalide', () => {
    const { unlocked, locked } = splitGamesByUnlock(REGISTRY, null);
    assert.equal(unlocked.length, 0);
    assert.equal(locked.length, REGISTRY.length);
  });

  it('ignore les ids dupliqués dans la liste de déblocage', () => {
    const { unlocked } = splitGamesByUnlock(REGISTRY, ['slots', 'slots']);
    assert.equal(unlocked.filter((g) => g.id === 'slots').length, 1);
  });
});

describe('getLevelProgress', () => {
  it('calcule le pourcentage quand le seuil est exposé par le Core', () => {
    const { percent, threshold } = getLevelProgress({ xp: 250, xpForNextLevel: 500 });
    assert.equal(percent, 50);
    assert.equal(threshold, 500);
  });

  it('borne le pourcentage entre 0 et 100', () => {
    assert.equal(getLevelProgress({ xp: 900, xpForNextLevel: 500 }).percent, 100);
    assert.equal(getLevelProgress({ xp: -50, xpForNextLevel: 500 }).percent, 0);
  });

  it('renvoie une progression neutre quand le seuil est absent du contrat', () => {
    const { percent, threshold } = getLevelProgress({ xp: 120 });
    assert.equal(percent, null);
    assert.equal(threshold, null);
  });

  it('renvoie une progression neutre pour des valeurs invalides', () => {
    assert.equal(getLevelProgress({ xp: Number.NaN, xpForNextLevel: 100 }).percent, null);
    assert.equal(getLevelProgress({ xp: 10, xpForNextLevel: 0 }).percent, null);
    assert.equal(getLevelProgress({ xp: 10, xpForNextLevel: -5 }).percent, null);
    assert.equal(getLevelProgress(null).percent, null);
  });
});

describe('formatNumber', () => {
  it('formate les nombres au format français', () => {
    // Le séparateur de groupe varie selon la version d ICU (espace, NBSP, NBSP étroite).
    assert.match(formatNumber(2450), /^2[\u0020\u00A0\u202F]450$/);
  });

  it('renvoie un tiret pour les valeurs absentes ou invalides', () => {
    assert.equal(formatNumber(undefined), '—');
    assert.equal(formatNumber(null), '—');
    assert.equal(formatNumber('2450'), '—');
  });
});
