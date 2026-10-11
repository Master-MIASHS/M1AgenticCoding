import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, getGameConfig, setGameConfig } from '../../src/core/config/games.config.js';

describe('configuration des jeux (#231)', () => {
  beforeEach(() => setGameConfig('roulette', { probabilities: {}, multipliers: {} }));

  it('renvoie deux sections vides indépendantes pour un jeu non configuré', () => {
    const first = getGameConfig('scratch');
    const second = getGameConfig('scratch');
    assert.deepEqual(first, { probabilities: {}, multipliers: {} });
    assert.notEqual(first, second);
    assert.notEqual(first.probabilities, second.probabilities);
    assert.notEqual(first.multipliers, second.multipliers);
  });

  it('rejette les identifiants inconnus et propriétés héritées en lecture et écriture', () => {
    for (const id of ['inconnu', '', '__proto__', 'constructor', 'toString', null, undefined, 1]) {
      assert.throws(() => getGameConfig(id), /jeu inconnu/);
      assert.throws(() => setGameConfig(id, {}), /jeu inconnu/);
    }
  });

  it('conserve le résultat public du setter et les nombres sans normalisation', () => {
    assert.deepEqual(setGameConfig('roulette', { probabilities: { red: 12.5, black: 0 }, multipliers: { red: 2.75 } }), { ok: true, gameId: 'roulette' });
    assert.deepEqual(getGameConfig('roulette'), { probabilities: { red: 12.5, black: 0 }, multipliers: { red: 2.75 } });
  });

  it('conserve une section omise et remplace entièrement celle fournie', () => {
    setGameConfig('roulette', { probabilities: { red: 1, black: 2 }, multipliers: { red: 3 } });
    setGameConfig('roulette', { probabilities: { green: 4 } });
    assert.deepEqual(getGameConfig('roulette'), { probabilities: { green: 4 }, multipliers: { red: 3 } });
    setGameConfig('roulette', { multipliers: { black: 5 } });
    assert.deepEqual(getGameConfig('roulette'), { probabilities: { green: 4 }, multipliers: { black: 5 } });
  });

  it('vide une section avec {} sans toucher à l’autre', () => {
    setGameConfig('roulette', { probabilities: { red: 1 }, multipliers: { red: 2 } });
    setGameConfig('roulette', { probabilities: {} });
    assert.deepEqual(getGameConfig('roulette'), { probabilities: {}, multipliers: { red: 2 } });
  });

  it('un payload vide, omis ou undefined garde les données existantes', () => {
    setGameConfig('roulette', { multipliers: { red: 2 } });
    const before = getGameConfig('roulette');
    for (const payload of [{}, undefined]) {
      setGameConfig('roulette', payload);
      assert.deepEqual(getGameConfig('roulette'), before);
    }
    setGameConfig('roulette');
    assert.deepEqual(getGameConfig('roulette'), before);
  });

  it('copie les données fournies au setter', () => {
    const input = { probabilities: { red: 1 }, multipliers: { red: 2 } };
    setGameConfig('roulette', input);
    input.probabilities.red = 99;
    input.multipliers.green = 99;
    assert.deepEqual(getGameConfig('roulette'), { probabilities: { red: 1 }, multipliers: { red: 2 } });
  });

  it('isole profondément chaque lecture du stockage et des autres lectures', () => {
    setGameConfig('roulette', { probabilities: { red: 1 }, multipliers: { red: 2 } });
    const first = getGameConfig('roulette');
    first.probabilities.red = 99;
    first.multipliers = {};
    assert.deepEqual(getGameConfig('roulette'), { probabilities: { red: 1 }, multipliers: { red: 2 } });
  });

  it('accepte des entrées gelées ou sans prototype sans les modifier', () => {
    const table = Object.freeze(Object.assign(Object.create(null), { red: 1 }));
    const input = Object.freeze({ probabilities: table });
    setGameConfig('roulette', input);
    assert.deepEqual(getGameConfig('roulette').probabilities, { red: 1 });
    assert.equal(table.red, 1);
  });

  it('rejette les formes invalides de payload et de sections', () => {
    for (const value of [null, [], 'x', 1, true, new Date(), new Map()]) {
      assert.throws(() => setGameConfig('roulette', value), TypeError);
      assert.throws(() => setGameConfig('roulette', { probabilities: value }), TypeError);
      assert.throws(() => setGameConfig('roulette', { multipliers: value }), TypeError);
    }
    assert.throws(() => setGameConfig('roulette', { probabilities: undefined }), TypeError);
    assert.throws(() => setGameConfig('roulette', { multipliers: undefined }), TypeError);
  });

  it('rejette les champs inconnus dont ceux de l’extension séparée', () => {
    for (const key of ['paytable', 'segments', 'weights', 'unlockLevel', 'extra']) {
      assert.throws(() => setGameConfig('roulette', { [key]: {} }), TypeError);
    }
  });

  it('rejette les nombres négatifs ou non finis dans les deux sections', () => {
    for (const section of ['probabilities', 'multipliers']) {
      for (const value of [-1, NaN, Infinity, -Infinity]) {
        assert.throws(() => setGameConfig('roulette', { [section]: { red: value } }), RangeError);
      }
    }
  });

  it('rejette les valeurs non numériques, imbriquées et cycliques', () => {
    const cycle = {}; cycle.self = cycle;
    for (const section of ['probabilities', 'multipliers']) {
      for (const value of ['1', null, undefined, true, {}, [], cycle, 1n, () => 1]) {
        assert.throws(() => setGameConfig('roulette', { [section]: { red: value } }), TypeError);
      }
    }
  });

  it('conserve les deux sections quand une mise à jour est partiellement invalide', () => {
    setGameConfig('roulette', { probabilities: { red: 1 }, multipliers: { red: 2 } });
    const before = getGameConfig('roulette');
    assert.throws(() => setGameConfig('roulette', { probabilities: { black: 3 }, multipliers: { red: -1 } }), RangeError);
    assert.deepEqual(getGameConfig('roulette'), before);
    assert.throws(() => setGameConfig('roulette', { probabilities: { black: 3 }, unknown: {} }), TypeError);
    assert.deepEqual(getGameConfig('roulette'), before);
  });

  it('rejette les accesseurs sans les exécuter', () => {
    let calls = 0;
    const input = Object.defineProperty({}, 'probabilities', { enumerable: true, get() { calls += 1; return {}; } });
    const table = Object.defineProperty({}, 'red', { enumerable: true, get() { calls += 1; return 1; } });
    assert.throws(() => setGameConfig('roulette', input), TypeError);
    assert.throws(() => setGameConfig('roulette', { probabilities: table }), TypeError);
    assert.equal(calls, 0);
  });

  it('rejette les propriétés symboles et non énumérables', () => {
    const symbol = { [Symbol('extra')]: 1 };
    const hidden = Object.defineProperty({}, 'red', { value: 1 });
    for (const input of [symbol, hidden]) {
      assert.throws(() => setGameConfig('roulette', input), TypeError);
      assert.throws(() => setGameConfig('roulette', { multipliers: input }), TypeError);
    }
  });

  it('copie __proto__ comme donnée sans polluer le prototype', () => {
    const table = JSON.parse('{"__proto__": 2, "constructor": 3}');
    setGameConfig('roulette', { multipliers: table });
    const result = getGameConfig('roulette').multipliers;
    assert.equal(Object.getPrototypeOf(result), Object.prototype);
    assert.equal(Object.hasOwn(result, '__proto__'), true);
    assert.equal(result.__proto__, 2);
    assert.equal(result.constructor, 3);
  });

  it('gèle le catalogue et chaque entrée sans changer les défauts', () => {
    assert.ok(Object.isFrozen(GAMES));
    for (const game of Object.values(GAMES)) assert.ok(Object.isFrozen(game));
    assert.throws(() => { GAMES.roulette.unlockLevel = 1; }, TypeError);
    assert.throws(() => { GAMES.nouveau = {}; }, TypeError);
    assert.equal(GAMES.roulette.unlockLevel, 5);
  });
});
