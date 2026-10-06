// Tests unitaires pour /src/core/rng.js (Groupe 1 - RNG et melange).
// Couvre : les sequences reproductibles via semer(), et l'integrite de
// melanger() (aucun element perdu ou duplique).

import { describe, it, test } from 'node:test';
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
  // Poids nuls en premiere ET en derniere position : ce sont les deux cas
  // limites (hasard exactement egal a 0, et filet de securite des arrondis).
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

// Validation numérique (#162) : défauts signalés dans #115 et #156.
describe('tirageAvecPoids : validation numérique des poids', () => {
  it('rejette des poids qui ne sont pas des nombres (chaîne, booléen, null, objet)', () => {
    for (const poids of [['1', '2'], ['1', 2], [true, 1], [null, 1], [{}, 1]]) {
      assert.throws(() => tirageAvecPoids(['a', 'b'], poids), /poids/);
    }
  });

  it('rejette des poids infinis ou NaN', () => {
    for (const poids of [[Infinity, 1], [-Infinity, 1], [NaN, 1]]) {
      assert.throws(() => tirageAvecPoids(['a', 'b'], poids), /poids/);
    }
  });
});
