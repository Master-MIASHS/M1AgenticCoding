// Le Core se charge même si l'accès à localStorage lève une erreur
// (cookies bloqués, certains modes privés) : relecture G5 de #262.

import { it } from 'node:test';
import assert from 'node:assert/strict';

it('importe la façade du Core sans planter quand localStorage lève une SecurityError', async () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new Error('SecurityError'); },
  });
  const original = console.warn;
  console.warn = () => {};
  try {
    const coreService = await import('../../src/services/coreService.js');
    assert.strictEqual(coreService.getStartingCapital(), 1000);
    assert.strictEqual(coreService.getMultiplicateurBonus('gains'), 1);
    assert.deepStrictEqual(coreService.getEvenementsBonus(), []);
  } finally {
    console.warn = original;
    delete globalThis.localStorage;
  }
});
