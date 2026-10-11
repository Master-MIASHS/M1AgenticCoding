// getBadges() via la façade du Core : badges du joueur à partir de l'état
// (Groupe 1, #272).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../src/services/coreService.js';
import { updateState } from '../../src/core/state.js';

describe('getBadges via coreService', () => {
  it('renvoie les badges de la configuration, non obtenus au départ', () => {
    assert.deepStrictEqual(coreService.getBadges(), [
      { id: 'parties-1000', nom: '1000 parties jouées', obtenu: false, actuel: 0, seuil: 1000 },
      { id: 'faillites-5', nom: 'A survécu à la faillite 5 fois', obtenu: false, actuel: 0, seuil: 5 },
    ]);
  });

  it('suit l’historique et le compteur de faillites de l’état', () => {
    // Simule ce que play() enregistrera (#131).
    updateState((etat) => ({
      ...etat,
      history: [{ gameId: 'slots' }, { gameId: 'dice' }, { gameId: 'slots' }],
      faillites: 5,
    }));
    const [parties, faillites] = coreService.getBadges();
    assert.strictEqual(parties.actuel, 3);
    assert.strictEqual(parties.obtenu, false);
    assert.strictEqual(faillites.obtenu, true);
  });

  it('n’accepte aucune définition injectée par l’appelant', () => {
    const autres = [{ id: 'x', nom: 'X', compteur: 'partiesJouees', seuil: 1 }];
    assert.deepStrictEqual(coreService.getBadges(autres).map((b) => b.id), ['parties-1000', 'faillites-5']);
  });
});
