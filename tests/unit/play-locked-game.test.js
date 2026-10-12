// play() vérifie le déblocage côté Core (règle 5, #292) : un jeu verrouillé ou
// inconnu ne règle rien et n'écrit rien.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../src/services/coreService.js';

const WIN = { outcome: 'win', multiplier: 2 };

test('play() refuse un jeu verrouillé sans rien écrire', () => {
  assert.ok(!coreService.getUnlockedGames().includes('poker'));
  const before = structuredClone(coreService.getState());
  assert.throws(() => coreService.play('poker', 10, WIN, { roundId: 'poker-1' }), RangeError);
  assert.deepEqual(coreService.getState(), before);
});

test('play() refuse un jeu inconnu ou un identifiant invalide', () => {
  const before = structuredClone(coreService.getState());
  for (const id of ['inconnu', '__proto__', '', undefined, null, 42]) {
    assert.throws(() => coreService.play(id, 10, WIN, { roundId: 'x-1' }), RangeError);
  }
  assert.deepEqual(coreService.getState(), before);
});

test('play() règle un jeu débloqué, et un roundId ne règle jamais deux fois', () => {
  const first = coreService.play('slots', 10, WIN, { roundId: 'slots-1' });
  assert.equal(first.newBalance, coreService.getBalance());
  const again = coreService.play('slots', 10, WIN, { roundId: 'slots-1' });
  assert.deepEqual(again, { success: false, reason: 'already_settled' });
  assert.equal(coreService.getState().history.length, 1);
});
