import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../../src/services/coreService.js';
import { getState, restoreState } from '../../src/core/state.js';

// Seule la fixture de rôle utilise l'état interne ; toutes les opérations de
// configuration testées passent par la façade réellement consommée par G4.
describe('lecture publique de la configuration (#158)', () => {
  let initialState;
  beforeEach(() => {
    initialState = getState();
    restoreState({ ...initialState, role: 'admin' });
    core.setGameConfig('roulette', { probabilities: {}, multipliers: {} });
    restoreState({ ...initialState, role: 'player' });
  });
  afterEach(() => {
    restoreState({ ...initialState, role: 'admin' });
    core.setGameConfig('roulette', { probabilities: {}, multipliers: {} });
    restoreState(initialState);
  });

  it('permet au joueur de lire un jeu connu non configuré, sans modifier sa sauvegarde', () => {
    const save = core.exportSave();
    assert.deepEqual(core.getGameConfig('roulette'), { probabilities: {}, multipliers: {} });
    assert.equal(core.exportSave(), save);
  });

  it('lit les mises à jour admin et isole les deux sections des objets fournis et retournés', () => {
    restoreState({ ...initialState, role: 'admin' });
    const config = { probabilities: { red: 0.4 }, multipliers: { red: 2 } };
    core.setGameConfig('roulette', config);
    config.probabilities.red = 99;
    config.multipliers.red = 99;
    const first = core.getGameConfig('roulette');
    assert.deepEqual(first, { probabilities: { red: 0.4 }, multipliers: { red: 2 } });
    first.probabilities.red = 77;
    first.multipliers.red = 77;
    core.setGameConfig('roulette', { multipliers: { red: 3 } });
    assert.deepEqual(core.getGameConfig('roulette'), {
      probabilities: { red: 0.4 }, multipliers: { red: 3 },
    });
  });

  it('refuse les identifiants inconnus, invalides et hérités sans modifier l’état', () => {
    const save = core.exportSave();
    for (const id of ['inconnu', 'toString', '__proto__', '', null, undefined, 3]) {
      assert.throws(() => core.getGameConfig(id), /jeu inconnu/);
    }
    assert.equal(core.exportSave(), save);
  });

  it('garde les écritures réservées à l’admin même lorsque la lecture est publique', () => {
    const before = core.getGameConfig('roulette');
    assert.throws(() => core.setGameConfig('roulette', { multipliers: { red: 9 } }), /permission refusée/);
    assert.deepEqual(core.getGameConfig('roulette'), before);
  });
});
