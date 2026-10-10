import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const stateURL = new URL('../../src/core/state.js', import.meta.url).href;
const coreURL = new URL('../../src/services/coreService.js', import.meta.url).href;
const configURL = new URL('../../src/core/config/player.config.js', import.meta.url).href;
const legacy = { balance: 1000, bestBalance: 1000, xp: 0, level: 1,
  unlockedGames: ['slots', 'dice'], history: [], role: 'player' };

/** Charge configuration et état dans un processus neuf, sans cache partagé. */
function run(source, { capital = 500, saved = null } = {}) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    const values = new Map([
      ['casino_config_joueur', JSON.stringify({ capitalDeDepart: ${capital} })],
      ['casino_state', ${JSON.stringify(saved)}],
    ]);
    let writes = 0;
    let failWrite = false;
    globalThis.localStorage = {
      getItem: key => values.get(key) ?? null,
      setItem(key, value) {
        if (failWrite) throw Error('quota dépassé');
        values.set(key, value);
        if (key === 'casino_state') writes++;
      },
    };
    const state = await import(${JSON.stringify(stateURL)});
    const config = await import(${JSON.stringify(configURL)});
    const core = await import(${JSON.stringify(coreURL)});
    ${source}
  `], { encoding: 'utf8', timeout: 10000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

describe('capital initial effectif (#253)', () => {
  for (const capital of [500, 2500]) {
    it(`initialise les deux soldes à ${capital} sans écrire`, () => {
      run(`
        assert.equal(state.getState().balance, ${capital});
        assert.equal(state.getState().bestBalance, ${capital});
        assert.equal(writes, 0);
        assert.equal(values.get('casino_state'), null);
      `, { capital });
    });
  }

  it('conserve une ancienne sauvegarde malgré une autre configuration', () => {
    run(`
      assert.deepEqual(state.getState(), ${JSON.stringify(legacy)});
      assert.equal(writes, 0);
    `, { saved: JSON.stringify(legacy) });
  });
});

describe('première initialisation atomique interne (#253)', () => {
  it('initialise une fois avec un capital réduit, sans exposer l’opération à l’UI', () => {
    run(`
      assert.equal(core.initializePlayerState, undefined);
      const player = { ...state.getState(), balance: 250, bestBalance: 250, pseudo: 'Alice' };
      const result = state.initializePlayerState(player);
      assert.deepEqual(state.getState(), player);
      assert.deepEqual(JSON.parse(values.get('casino_state')), player);
      assert.equal(writes, 1);
      result.unlockedGames.push('poker');
      assert.deepEqual(state.getState(), player);
      assert.throws(() => state.initializePlayerState(player), /profil|partie/);
      assert.equal(writes, 1);
    `);
  });

  it('conserve l’état et le droit de réessayer après un échec de persistance', () => {
    run(`
      const before = state.getState();
      const player = { ...before, balance: 250, bestBalance: 250, pseudo: 'Alice' };
      failWrite = true;
      assert.throws(() => state.initializePlayerState(player), /quota/);
      assert.deepEqual(state.getState(), before);
      assert.equal(writes, 0);
      failWrite = false;
      state.initializePlayerState(player);
      assert.equal(writes, 1);
    `);
  });

  for (const method of ['updateState(s => s)', 'restoreState(state.getState())']) {
    it(`refuse de recréer un joueur après ${method}`, () => {
      run(`
        state.${method};
        const before = state.getState();
        assert.throws(() => state.initializePlayerState({ ...before, pseudo: 'Alice' }), /partie/);
        assert.deepEqual(state.getState(), before);
        assert.equal(writes, 1);
      `);
    });
  }

  it('refuse une première création imbriquée dans une mise à jour', () => {
    run(`
      const before = state.getState();
      assert.throws(() => state.updateState(s => {
        state.initializePlayerState({ ...s, pseudo: 'Alice' });
        return s;
      }), /écriture/);
      assert.deepEqual(state.getState(), before);
      assert.equal(writes, 0);
      state.initializePlayerState({ ...before, pseudo: 'Alice' });
      assert.equal(writes, 1);
    `);
  });

  it('valide le joueur initial avant toute écriture et permet la correction', () => {
    run(`
      const before = state.getState();
      for (const invalid of [
        { balance: 0, bestBalance: 0 }, { bestBalance: 999 }, { xp: 1 },
        { level: 2 }, { role: 'admin' }, { history: [{}] },
        { ownedItemIds: ['article'] }, { pseudo: '' },
      ]) {
        assert.throws(() => state.initializePlayerState({ ...before, pseudo: 'Alice', ...invalid }));
      }
      assert.deepEqual(state.getState(), before);
      assert.equal(writes, 0);
      state.initializePlayerState({ ...before, pseudo: 'Alice' });
      assert.equal(writes, 1);
    `);
  });
});
