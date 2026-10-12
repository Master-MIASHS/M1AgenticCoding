// Tests de l'administration du Core (#322) : ajustement du solde par l'admin
// et rôle admin en mode dev, sur un faux état injecté.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  TYPE_AJUSTEMENT_ADMIN,
  estAjustementAdmin,
  createAdministration,
} from '../../src/core/admin.js';

describe('estAjustementAdmin', () => {
  it('reconnaît une entrée d’ajustement de l’admin', () => {
    assert.equal(TYPE_AJUSTEMENT_ADMIN, 'ADMIN_ADJUSTMENT');
    assert.equal(estAjustementAdmin({ type: 'ADMIN_ADJUSTMENT', amount: 10 }), true);
  });

  it('ne confond pas une partie avec un ajustement', () => {
    assert.equal(estAjustementAdmin({ gameId: 'slots', bet: 10, payout: 0 }), false);
    assert.equal(estAjustementAdmin(null), false);
    assert.equal(estAjustementAdmin('ADMIN_ADJUSTMENT'), false);
  });
});

/**
 * Faux état partagé : même interface que state.js (copies, écriture atomique).
 * @param {object} [initial] - Champs de l'état de départ.
 * @returns {{ getState: function(): object, updateState: function(function): object,
 *   ecritures: function(): number }} Faux état.
 */
function fauxEtat(initial = {}) {
  let etat = {
    balance: 400,
    bestBalance: 1000,
    xp: 30,
    level: 1,
    unlockedGames: ['slots', 'dice'],
    history: [],
    role: 'admin',
    ...initial,
  };
  let nombreEcritures = 0;
  return {
    getState: () => structuredClone(etat),
    updateState: (calcul) => {
      const suivant = structuredClone(calcul(structuredClone(etat)));
      etat = suivant;
      nombreEcritures += 1;
      return structuredClone(etat);
    },
    ecritures: () => nombreEcritures,
  };
}

const INSTANT = Date.UTC(2026, 9, 10, 18, 0, 0);

/**
 * Crée l'administration sur un faux état, horloge fixe et mode dev choisi.
 * @param {object} etat - Faux état de fauxEtat().
 * @param {boolean} [dev] - Valeur du mode dev.
 * @returns {object} Administration.
 */
function administration(etat, dev = false) {
  return createAdministration({
    updateState: etat.updateState,
    maintenant: () => INSTANT,
    estModeDev: () => dev,
  });
}

describe('ajusterSolde', () => {
  it('ajoute des jetons et trace l’ajustement dans l’historique', () => {
    const etat = fauxEtat();
    const entree = administration(etat).ajusterSolde(150);

    assert.deepEqual(entree, {
      type: 'ADMIN_ADJUSTMENT',
      amount: 150,
      balanceBefore: 400,
      balanceAfter: 550,
      adjustedAt: '2026-10-10T18:00:00.000Z',
    });
    assert.equal(etat.getState().balance, 550);
    assert.deepEqual(etat.getState().history, [entree]);
  });

  it('retire des jetons sans baisser le meilleur solde', () => {
    const etat = fauxEtat();
    administration(etat).ajusterSolde(-400);

    assert.equal(etat.getState().balance, 0);
    assert.equal(etat.getState().bestBalance, 1000);
  });

  it('remonte le meilleur solde quand le nouveau solde le dépasse', () => {
    const etat = fauxEtat();
    administration(etat).ajusterSolde(900.5);

    assert.equal(etat.getState().balance, 1300.5);
    assert.equal(etat.getState().bestBalance, 1300.5);
  });

  it('arrondit le solde au centime', () => {
    const etat = fauxEtat({ balance: 0.1 });
    const entree = administration(etat).ajusterSolde(0.2);

    assert.equal(entree.balanceAfter, 0.3);
    assert.equal(etat.getState().balance, 0.3);
  });

  it('ne touche ni à l’XP, ni au niveau, ni aux jeux débloqués', () => {
    const etat = fauxEtat();
    administration(etat).ajusterSolde(50);

    const { xp, level, unlockedGames, role } = etat.getState();
    assert.deepEqual({ xp, level, unlockedGames, role }, {
      xp: 30, level: 1, unlockedGames: ['slots', 'dice'], role: 'admin',
    });
  });

  it('refuse un retrait qui ferait passer le solde sous 0, sans rien modifier', () => {
    const etat = fauxEtat();
    const avant = etat.getState();

    assert.throws(() => administration(etat).ajusterSolde(-400.01), RangeError);
    assert.deepEqual(etat.getState(), avant);
  });

  it('refuse un joueur qui n’est pas admin, sans rien modifier', () => {
    const etat = fauxEtat({ role: 'player' });
    const avant = etat.getState();

    assert.throws(() => administration(etat).ajusterSolde(100), /permission refusée/);
    assert.deepEqual(etat.getState(), avant);
  });

  it('refuse un montant nul, non fini, non numérique ou plus fin que le centime', () => {
    const etat = fauxEtat();
    for (const montant of [0, NaN, Infinity, -Infinity, '100', null, undefined, 1.005]) {
      assert.throws(() => administration(etat).ajusterSolde(montant), TypeError, String(montant));
    }
    assert.equal(etat.ecritures(), 0);
  });
});

describe('activerRoleAdminDev', () => {
  it('passe le profil courant en admin en mode dev', () => {
    const etat = fauxEtat({ role: 'player' });

    assert.equal(administration(etat, true).activerRoleAdminDev(), 'admin');
    assert.equal(etat.getState().role, 'admin');
  });

  it('ne change rien d’autre que le rôle', () => {
    const etat = fauxEtat({ role: 'player' });
    const avant = etat.getState();
    administration(etat, true).activerRoleAdminDev();

    assert.deepEqual(etat.getState(), { ...avant, role: 'admin' });
  });

  it('refuse hors du mode dev, sans rien modifier', () => {
    const etat = fauxEtat({ role: 'player' });

    assert.throws(() => administration(etat, false).activerRoleAdminDev(), /mode développement/);
    assert.equal(etat.getState().role, 'player');
    assert.equal(etat.ecritures(), 0);
  });

  it('permet ensuite d’ajuster le solde', () => {
    const etat = fauxEtat({ role: 'player' });
    const admin = administration(etat, true);
    admin.activerRoleAdminDev();

    assert.equal(admin.ajusterSolde(100).balanceAfter, 500);
  });
});
