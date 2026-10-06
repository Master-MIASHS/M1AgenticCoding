import test from 'node:test';
import assert from 'node:assert/strict';
import * as coreService from '../../../src/services/coreService.js';

test('Contrat d\'architecture : façade coreService (G5)', async (t) => {
  
  await t.test('Expose toutes les méthodes publiques requises par les groupes', () => {
    const expectedMethods = [
      'getState', 
      'play', 
      'getBalance', 
      'claimDailyBonus', 
      'requestLoan',
      'roll', 
      'tirageEntier', 
      'tirageAvecPoids', 
      'melanger',
      'exportSave', 
      'importSave',
      'getGlobalStats'
    ];
    
    for (const method of expectedMethods) {
      assert.equal(
        typeof coreService[method], 
        'function', 
        `La méthode publique ${method} doit être exportée par le coreService`
      );
    }
  });

  await t.test('Verrouillage de sécurité : n\'expose pas de fonctions internes', () => {
    assert.equal(
      coreService.semer, 
      undefined, 
      'Alerte de sécurité : la fonction "semer" (RNG) ne doit jamais fuiter dans la façade UI'
    );
  });

  await t.test('getState renvoie un instantané valide de l\'état', () => {
    const state = coreService.getState();
    assert.ok(state !== null && typeof state === 'object', 'L\'état retourné doit être un objet');
    assert.ok('balance' in state, 'L\'état doit contenir la clé balance');
    assert.ok('xp' in state, 'L\'état doit contenir la clé xp');
    assert.ok('level' in state, 'L\'état doit contenir la clé level');
    assert.ok('unlockedGames' in state, 'L\'état doit contenir les jeux débloqués');
  });

});