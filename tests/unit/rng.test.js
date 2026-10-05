// Unit tests - Core RNG (src/core/rng.js)
// Verifies the absolute rules around randomness:
//  - roll() produces RAW values only: it never decides a win or a loss.
//  - The contract { gameId, value, nonce } is stable for all games.
// Tests unitaires pour /src/core/rng.js (Groupe 1 - RNG et melange).
// Couvre : les sequences reproductibles via semer(), et l'integrite de
// melanger() (aucun element perdu ou duplique).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { semer, roll, tirageEntier, tirageAvecPoids, melanger } from '../../src/core/rng.js';

test('roll returns the documented contract { gameId, value, nonce }', () => {
  const r = roll('slots', {});
  assert.equal(r.gameId, 'slots');
  assert.equal(typeof r.value, 'number');
  assert.equal(typeof r.nonce, 'number');
  assert.deepEqual(Object.keys(r).sort(), ['gameId', 'nonce', 'value']);
});

test('roll value is a raw float in [0, 1)', () => {
  for (let i = 0; i < 100; i += 1) {
    const { value } = roll('dice');
    assert.ok(Number.isFinite(value), 'value must be finite');
    assert.ok(value >= 0 && value < 1, `value out of range: ${value}`);
  }
});

test('roll nonce is an integer in [0, 1000000)', () => {
  for (let i = 0; i < 100; i += 1) {
    const { nonce } = roll('blackjack');
    assert.ok(Number.isInteger(nonce), 'nonce must be an integer');
    assert.ok(nonce >= 0 && nonce < 1000000, `nonce out of range: ${nonce}`);
  }
});

test('roll propagates the requesting gameId', () => {
  for (const gameId of ['slots', 'roulette', 'video-poker']) {
    assert.equal(roll(gameId).gameId, gameId);
  }
});

test('roll never decides a win or a loss (no verdict field)', () => {
  const r = roll('slots');
  assert.ok(!('win' in r), 'roll must not return a win field');
  assert.ok(!('loss' in r), 'roll must not return a loss field');
  assert.ok(!('won' in r), 'roll must not return a won field');
  assert.ok(!('result' in r), 'roll must not return a result field');
});

test('consecutive rolls differ (raw randomness)', () => {
  const a = roll('plinko');
  const b = roll('plinko');
  assert.notDeepEqual([a.value, a.nonce], [b.value, b.nonce]);
});

test('semer() rend roll() reproductible', () => {
  semer('graine-test-1');
  const a = [roll('x'), roll('x'), roll('x')];
  semer('graine-test-1');
  const b = [roll('x'), roll('x'), roll('x')];
  semer(null);

  assert.deepEqual(
    a.map((r) => r.value),
    b.map((r) => r.value),
  );
});

test('semer() avec la meme graine apres semer(null) redonne la meme sequence', () => {
  semer('meme-graine');
  const premier = roll('x').value;
  semer(null);
  semer('meme-graine');
  const deuxieme = roll('x').value;
  semer(null);

  assert.equal(premier, deuxieme);
});

test('tirageEntier() reste dans les bornes incluses et rend un entier', () => {
  semer('graine-entier');
  for (let i = 0; i < 200; i += 1) {
    const n = tirageEntier(3, 7);
    assert.ok(Number.isInteger(n));
    assert.ok(n >= 3 && n <= 7);
  }
  semer(null);
});

test('tirageEntier() rejette des bornes invalides', () => {
  assert.throws(() => tirageEntier(5, 2));
  assert.throws(() => tirageEntier(1.5, 2));
});

test('tirageAvecPoids() ne renvoie que des elements de la liste donnee', () => {
  semer('graine-poids');
  const elements = ['a', 'b', 'c'];
  const poids = [1, 0, 9];
  for (let i = 0; i < 100; i += 1) {
    assert.ok(elements.includes(tirageAvecPoids(elements, poids)));
  }
  semer(null);
});

test('tirageAvecPoids() ne renvoie jamais un element de poids nul', () => {
  semer('graine-poids-nul');
  for (let i = 0; i < 500; i += 1) {
    assert.equal(tirageAvecPoids(['a', 'b', 'c'], [0, 1, 0]), 'b');
  }
  semer(null);
});

test('tirageAvecPoids() rejette une entree invalide ou mal alignee', () => {
  assert.throws(() => tirageAvecPoids(['a', 'b'], [1]));
  assert.throws(() => tirageAvecPoids([], []));
  assert.throws(() => tirageAvecPoids(['a'], [0]));
  assert.throws(() => tirageAvecPoids(['a', 'b'], [-1, 2]));
});

test('melanger() renvoie une permutation : aucun element perdu ou duplique', () => {
  const paquet = Array.from({ length: 52 }, (_, i) => i);
  const melange = melanger(paquet);

  assert.equal(melange.length, paquet.length);
  assert.deepEqual([...melange].sort((x, y) => x - y), paquet);
});

test('melanger() ne modifie pas le tableau d\'origine', () => {
  const original = [1, 2, 3, 4, 5];
  const copie = [...original];
  melanger(original);
  assert.deepEqual(original, copie);
});

test('melanger() est reproductible avec la meme graine', () => {
  const paquet = Array.from({ length: 52 }, (_, i) => i);

  semer('graine-melange');
  const a = melanger(paquet);
  semer('graine-melange');
  const b = melanger(paquet);
  semer(null);

  assert.deepEqual(a, b);
});

test('melanger() rejette une entree qui n\'est pas un tableau', () => {
  assert.throws(() => melanger('pas-un-tableau'));
});
