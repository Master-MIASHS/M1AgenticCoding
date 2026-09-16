// Tests unitaires pour /src/core/rng.js (Groupe 1 - RNG et melange).
// Couvre : les sequences reproductibles via semer(), et l'integrite de
// melanger() (aucun element perdu ou duplique).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { semer, roll, tirageEntier, tirageAvecPoids, melanger } from '../../src/core/rng.js';

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

test('semer(null) redonne un hasard non deterministe', () => {
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
