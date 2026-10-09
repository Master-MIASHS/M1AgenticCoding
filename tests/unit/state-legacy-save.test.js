// #253 : une sauvegarde sans pseudo reste une partie existante.
// Chaque processus charge toute la façade après installation du stockage.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const coreURL = new URL('../../src/services/coreService.js', import.meta.url).href;
const legacyState = {
  balance: 1000,
  bestBalance: 1000,
  xp: 0,
  level: 1,
  unlockedGames: ['slots', 'dice'],
  history: [],
  role: 'player',
};

describe('sauvegardes existantes sans pseudo au démarrage (#253)', () => {
  for (const [name, changes] of [
    ['capital et record inférieurs au défaut', { balance: 500, bestBalance: 500 }],
    ['dépense sans XP ni historique', { balance: 900 }],
    ['solde nul avec jeu acquis', { balance: 0, unlockedGames: ['slots', 'dice', 'scratch'] }],
    ['achat conservé avec solde revenu au défaut', { ownedItemIds: ['article'] }],
  ]) {
    it(`conserve la partie et refuse son remplacement : ${name}`, () => {
      const expected = { ...legacyState, ...changes };
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
        import assert from 'node:assert/strict';
        const expected = ${JSON.stringify(expected)};
        const normalizedExpected = { ...expected, settledRoundIds: [] };
        // Conserver aussi les octets : aucune réécriture implicite au démarrage.
        const original = JSON.stringify(expected, null, 2);
        let saved = original;
        let writes = 0;
        const warnings = [];
        console.warn = (...args) => warnings.push(args);
        globalThis.localStorage = {
          getItem: (key) => key === 'casino_state' ? saved : null,
          setItem(key, value) {
            assert.equal(key, 'casino_state');
            saved = value;
            writes++;
          },
        };
        const core = await import(${JSON.stringify(coreURL)});
        assert.deepEqual(core.getState(), normalizedExpected);
        assert.equal(core.getBalance(), expected.balance);
        assert.equal(writes, 0);
        assert.deepEqual(warnings, []);
        assert.equal(saved, original);

        // Un formulaire G4 ne doit pas réinitialiser les acquis de cette partie.
        assert.throws(() => core.creerProfil({ pseudo: 'Nouveau' }), /creerProfil/);
        assert.deepEqual(core.getState(), normalizedExpected);
        assert.equal(writes, 0);
        assert.equal(saved, original);
      `], { encoding: 'utf8', timeout: 10000 });
      assert.ifError(result.error);
      assert.equal(result.status, 0, result.stderr || result.stdout);
    });
  }
});
