// Tests de l'administration du Core (#322) : ajustement du solde par l'admin
// et rôle admin en mode dev, sur un faux état injecté.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  TYPE_AJUSTEMENT_ADMIN,
  estAjustementAdmin,
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
