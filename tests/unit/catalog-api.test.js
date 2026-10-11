import { it } from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../../src/services/coreService.js';

it('expose le catalogue par identifiant avec ses niveaux par défaut (#158)', () => {
  assert.ok(core.GAMES);
  assert.ok(Object.keys(core.GAMES).length > 0);
  for (const [id, game] of Object.entries(core.GAMES)) {
    assert.equal(game.id, id);
    assert.equal(typeof game.name, 'string');
    assert.ok(game.name.length > 0);
    assert.ok(Number.isInteger(game.unlockLevel) && game.unlockLevel >= 1);
    assert.deepEqual(core.getGameConfig(id), { probabilities: {}, multipliers: {} });
  }
});

it('interdit de modifier le catalogue ou ses entrées depuis la façade (#158)', () => {
  assert.ok(Object.isFrozen(core.GAMES));
  const before = JSON.stringify(core.GAMES);
  for (const game of Object.values(core.GAMES)) {
    assert.ok(Object.isFrozen(game));
    assert.throws(() => { game.unlockLevel = 99; }, TypeError);
  }
  assert.throws(() => { core.GAMES.inconnu = { id: 'inconnu' }; }, TypeError);
  assert.throws(() => { delete core.GAMES.slots; }, TypeError);
  assert.equal(JSON.stringify(core.GAMES), before);
});
