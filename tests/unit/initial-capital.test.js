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
