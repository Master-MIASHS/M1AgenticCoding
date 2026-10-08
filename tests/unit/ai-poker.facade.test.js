// Tests de l'IA du poker exposée par la façade du Core (Groupe 1, #196) :
// le G2 l'appelle via coreService, sans pouvoir injecter de configuration.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../src/services/coreService.js';

const payload = {
  stage: 'flop',
  communityCards: [{ rank: 'A', suit: 'hearts' }],
  pot: 150,
  currentBet: 20,
  minRaise: 40,
  playerState: { chips: 400, currentContribution: 20 },
  aiState: { hand: [{ rank: 'K', suit: 'spades' }], chips: 380, currentContribution: 10 },
  availableActions: ['fold', 'call', 'raise'],
  aiHandStrength: 0.5,
};

describe('choisirAction via coreService', () => {
  it('est exposée et renvoie une action permise', () => {
    assert.strictEqual(typeof coreService.choisirAction, 'function');
    const decision = coreService.choisirAction(payload);
    assert.ok(payload.availableActions.includes(decision.type));
  });

  it('ignore une configuration injectée par l’appelant', () => {
    // Config incomplète : si la façade la transmettait, validerConfig lèverait
    // une erreur. L’absence d’erreur prouve qu’elle est ignorée.
    const configInjectee = { config: { seuils: { moyenne: 0.3, forte: 0.7 } } };
    for (let i = 0; i < 200; i += 1) {
      assert.doesNotThrow(() => coreService.choisirAction(payload, configInjectee));
    }
  });
});
