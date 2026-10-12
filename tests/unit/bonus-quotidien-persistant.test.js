// Bonus quotidien : la date de réclamation est lue et écrite dans l'état
// (Groupe 1, #348), pour que le délai survive au rechargement de la page.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { claimDailyBonus, getState } from '../../src/services/coreService.js';
import { updateState } from '../../src/core/state.js';
import { DAILY_BONUS_CONFIG } from '../../src/core/config/economy.config.js';

const HEURE = 3_600_000;

/**
 * Met le solde à 0 et règle la date de la dernière réclamation dans l'état,
 * comme le ferait une sauvegarde rechargée.
 * @param {number|undefined} lastDailyBonusClaimAt - Date en ms, ou undefined.
 * @returns {void}
 */
function soldeNulAvecDate(lastDailyBonusClaimAt) {
  updateState((etat) => {
    const suivant = { ...etat, balance: 0 };
    if (lastDailyBonusClaimAt === undefined) delete suivant.lastDailyBonusClaimAt;
    else suivant.lastDailyBonusClaimAt = lastDailyBonusClaimAt;
    return suivant;
  });
}

describe('bonus quotidien : date enregistrée dans l’état (#348)', () => {
  it('refuse le bonus si l’état enregistré indique une réclamation il y a 1 h', () => {
    soldeNulAvecDate(Date.now() - HEURE);
    const resultat = claimDailyBonus();
    assert.strictEqual(resultat.claimed, false);
    assert.strictEqual(resultat.reason, 'cooldown');
    assert.strictEqual(getState().balance, 0);
  });

  it('accorde le bonus si la réclamation enregistrée date de plus de 24 h, et écrit la date', () => {
    soldeNulAvecDate(Date.now() - DAILY_BONUS_CONFIG.cooldownMs - HEURE);
    const avant = Date.now();
    const resultat = claimDailyBonus();
    assert.strictEqual(resultat.claimed, true);
    const etat = getState();
    assert.strictEqual(etat.balance, DAILY_BONUS_CONFIG.amount);
    assert.ok(etat.lastDailyBonusClaimAt >= avant && etat.lastDailyBonusClaimAt <= Date.now());
  });

  it('refuse ensuite une nouvelle réclamation pendant le délai', () => {
    soldeNulAvecDate(getState().lastDailyBonusClaimAt);
    assert.strictEqual(claimDailyBonus().reason, 'cooldown');
  });

  it('lit une sauvegarde sans le champ comme « jamais réclamé »', () => {
    soldeNulAvecDate(undefined);
    assert.strictEqual(claimDailyBonus().claimed, true);
    assert.ok(Number.isSafeInteger(getState().lastDailyBonusClaimAt));
  });
});
