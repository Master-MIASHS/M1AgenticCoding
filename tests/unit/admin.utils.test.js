// Unit tests for the Admin screen pure helpers (no DOM needed).
// Covers the games-list normalization, the Core fallback selectors, the raw
// JSON config parsing, and the display shaping of the global stats.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  gamesToDisplayList,
  pickGamesList,
  pickGetGameConfig,
  parseConfigJson,
  buildGameConfig,
  configForDisplay,
  statsToDisplay,
  formatNumber,
} from '../../src/pages/Admin/admin.utils.js';

const CORE_GAMES = {
  slots: { id: 'slots', name: 'Slots', unlockLevel: 1 },
  dice: { id: 'dice', name: 'Dice', unlockLevel: 1 },
  blackjack: { id: 'blackjack', name: 'Blackjack', unlockLevel: 3 },
  poker: { id: 'poker', name: 'Poker', unlockLevel: 12 },
};

const REGISTRY = [
  { id: 'slots', name: 'Slots', unlockLevel: 1, category: 'table' },
  { id: 'dice', name: 'Dice', unlockLevel: 1, category: 'dice' },
  { id: 'poker', name: 'Poker', unlockLevel: 12, category: 'poker' },
];

describe('gamesToDisplayList', () => {
  it('accepte la carte objet du Core GAMES', () => {
    const list = gamesToDisplayList(CORE_GAMES);
    assert.deepEqual(
      list.map((g) => g.id),
      ['slots', 'dice', 'blackjack', 'poker']
    );
  });

  it('accepte un tableau de jeux (registre applicatif)', () => {
    const list = gamesToDisplayList(REGISTRY);
    assert.equal(list.length, 3);
    assert.deepEqual(list[0], { id: 'slots', name: 'Slots', unlockLevel: 1 });
  });

  it('trie par niveau de déblocage croissant', () => {
    const list = gamesToDisplayList(CORE_GAMES);
    assert.deepEqual(
      list.map((g) => g.unlockLevel),
      [1, 1, 3, 12]
    );
  });

  it('normalise les entrées (id manquant, doublons, valeur invalide)', () => {
    const list = gamesToDisplayList([
      { id: 'a', name: 'A', unlockLevel: 2 },
      { id: 'a', name: 'A dupliqué', unlockLevel: 9 },
      { name: 'Sans id' },
      null,
      42,
    ]);
    assert.deepEqual(
      list.map((g) => g.id),
      ['a']
    );
  });

  it('renvoie une liste vide pour une source absente ou invalide', () => {
    assert.deepEqual(gamesToDisplayList(undefined), []);
    assert.deepEqual(gamesToDisplayList(null), []);
    assert.deepEqual(gamesToDisplayList('non'), []);
  });

  it("remplace le nom absent par l'id et le niveau absent par null", () => {
    const list = gamesToDisplayList({ ghost: { id: 'ghost' } });
    assert.deepEqual(list[0], { id: 'ghost', name: 'ghost', unlockLevel: null });
  });
});

describe('pickGamesList', () => {
  it('utilise la liste du Core quand elle est exposée', () => {
    const { list, source } = pickGamesList(CORE_GAMES, REGISTRY);
    assert.equal(source, 'core');
    assert.equal(list.length, 4);
  });

  it("bascule sur le registre applicatif quand le Core n'expose pas GAMES", () => {
    const { list, source } = pickGamesList(undefined, REGISTRY);
    assert.equal(source, 'registry');
    assert.deepEqual(
      list.map((g) => g.id),
      ['slots', 'dice', 'poker']
    );
  });
});

describe('pickGetGameConfig', () => {
  it('utilise la fonction du Core quand elle est exposée', () => {
    const real = (id) => ({ id, probabilities: {}, multipliers: {} });
    const { fn, available } = pickGetGameConfig(real);
    assert.equal(available, true);
    assert.equal(fn, real);
  });

  it('renvoie un stub clairement indisponible sinon', () => {
    const { fn, available } = pickGetGameConfig(undefined);
    assert.equal(available, false);
    assert.deepEqual(fn('slots'), { probabilities: {}, multipliers: {}, exposed: false });
  });
});

describe('parseConfigJson', () => {
  it('accepte un objet JSON valide', () => {
    const { ok, value } = parseConfigJson('{"red": 0.4}');
    assert.equal(ok, true);
    assert.deepEqual(value, { red: 0.4 });
  });

  it('traite la chaîne vide comme un objet vide', () => {
    assert.deepEqual(parseConfigJson(''), { ok: true, value: {}, error: null });
    assert.deepEqual(parseConfigJson('   '), { ok: true, value: {}, error: null });
  });

  it('rejette un JSON invalide', () => {
    const { ok, error } = parseConfigJson('{oops}');
    assert.equal(ok, false);
    assert.ok(error);
  });

  it("rejette un JSON qui n'est pas un objet (tableau, scalaire, null)", () => {
    assert.equal(parseConfigJson('[1, 2]').ok, false);
    assert.equal(parseConfigJson('42').ok, false);
    assert.equal(parseConfigJson('null').ok, false);
  });
});

describe('buildGameConfig', () => {
  it('construit la config quand les deux champs sont valides', () => {
    const { ok, config } = buildGameConfig('{"a": 0.5}', '{"win": 2}');
    assert.equal(ok, true);
    assert.deepEqual(config, { probabilities: { a: 0.5 }, multipliers: { win: 2 } });
  });

  it("signale d'abord le champ fautif (probabilités)", () => {
    const { ok, error } = buildGameConfig('{bad}', '{"win": 2}');
    assert.equal(ok, false);
    assert.match(error, /^Probabilités/);
  });

  it('signale ensuite le champ fautif (multiplicateurs)', () => {
    const { ok, error } = buildGameConfig('{"a": 0.5}', '[1]');
    assert.equal(ok, false);
    assert.match(error, /^Multiplicateurs/);
  });

  it('admet des champs vides (config vide)', () => {
    const { ok, config } = buildGameConfig('', '');
    assert.equal(ok, true);
    assert.deepEqual(config, { probabilities: {}, multipliers: {} });
  });
});

describe('configForDisplay', () => {
  it('sérrialise la config stockée en JSON lisible', () => {
    const { probabilitiesJson, multipliersJson } = configForDisplay({
      probabilities: { red: 0.4 },
      multipliers: { win: 2 },
    });
    assert.deepEqual(JSON.parse(probabilitiesJson), { red: 0.4 });
    assert.deepEqual(JSON.parse(multipliersJson), { win: 2 });
  });

  it('gère une config absente ou partiellement manquante', () => {
    const empty = configForDisplay(undefined);
    assert.equal(empty.probabilitiesJson, '{}');
    assert.equal(empty.multipliersJson, '{}');

    const partial = configForDisplay({ probabilities: { red: 0.4 } });
    assert.deepEqual(JSON.parse(partial.multipliersJson), {});
  });
});

describe('statsToDisplay', () => {
  it('expose les quatre statistiques du Core', () => {
    const rows = statsToDisplay({
      totalPlays: 10,
      totalWagered: 500,
      totalWon: 300,
      activePlayers: 7,
    });
    assert.deepEqual(
      rows.map((r) => [r.key, r.value]),
      [
        ['totalPlays', 10],
        ['totalWagered', 500],
        ['totalWon', 300],
        ['activePlayers', 7],
      ]
    );
  });

  it('dégrade les valeurs absentes ou invalides à 0', () => {
    const rows = statsToDisplay({ totalPlays: 'x', activePlayers: 3 });
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    assert.equal(byKey.totalPlays, 0);
    assert.equal(byKey.activePlayers, 3);
    assert.equal(byKey.totalWagered, 0);
  });

  it('gère des stats absentes', () => {
    const rows = statsToDisplay(null);
    assert.equal(rows.length, 4);
    assert.ok(rows.every((r) => r.value === 0));
  });
});

describe('formatNumber', () => {
  it('formate les nombres au format français', () => {
    assert.equal(formatNumber(0), '0');
    // Le séparateur de groupe varie selon la version d ICU.
    assert.match(formatNumber(2450), /^2[\u0020\u00A0\u202F]450$/);
  });

  it('renvoie un tiret pour les valeurs absentes ou invalides', () => {
    assert.equal(formatNumber(undefined), '—');
    assert.equal(formatNumber(null), '—');
    assert.equal(formatNumber('2450'), '—');
  });
});
