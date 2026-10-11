// Tests de l'âge minimum à la création du profil (Groupe 1, #339) : 18 ans
// révolus, demandé par le G5 (discussion #9, 11/10).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PROFIL_CONFIG } from '../../src/core/config/player.config.js';
import { verifierAgeMinimum, creerJoueur } from '../../src/core/player.js';

const MAINTENANT = new Date('2026-10-11T10:00:00.000Z');

describe('PROFIL_CONFIG', () => {
  it('fixe l’âge minimum à 18 ans, dans la configuration', () => {
    assert.strictEqual(PROFIL_CONFIG.ageMinimum, 18);
    assert.ok(Object.isFrozen(PROFIL_CONFIG));
  });
});

describe('verifierAgeMinimum', () => {
  it('accepte une personne qui a 18 ans aujourd’hui', () => {
    assert.doesNotThrow(() => verifierAgeMinimum('2008-10-11', MAINTENANT, 18));
  });

  it('refuse une personne qui aura 18 ans demain', () => {
    assert.throws(() => verifierAgeMinimum('2008-10-12', MAINTENANT, 18), /18 ans/);
  });

  it('accepte une personne nettement majeure et refuse un enfant', () => {
    assert.doesNotThrow(() => verifierAgeMinimum('1990-01-01', MAINTENANT, 18));
    assert.throws(() => verifierAgeMinimum('2015-06-01', MAINTENANT, 18), /18 ans/);
  });

  it('tient compte du mois : anniversaire du mois prochain pas encore passé', () => {
    assert.throws(() => verifierAgeMinimum('2008-11-01', MAINTENANT, 18), /18 ans/);
    assert.doesNotThrow(() => verifierAgeMinimum('2008-09-30', MAINTENANT, 18));
  });

  it('né un 29 février : 18 ans le 1er mars d’une année non bissextile', () => {
    assert.throws(() => verifierAgeMinimum('2008-02-29', new Date('2026-02-28T12:00:00.000Z'), 18), /18 ans/);
    assert.doesNotThrow(() => verifierAgeMinimum('2008-02-29', new Date('2026-03-01T00:00:00.000Z'), 18));
  });

  it('calcule sur la date UTC, comme la validation de la date', () => {
    // 2026-10-10T23:30 en UTC : la veille des 18 ans, même si l'heure locale
    // est déjà le 11.
    assert.throws(() => verifierAgeMinimum('2008-10-11', new Date('2026-10-10T23:30:00.000Z'), 18), /18 ans/);
  });

  it('refuse un âge minimum invalide', () => {
    for (const age of [-1, 1.5, NaN, '18', null]) {
      assert.throws(() => verifierAgeMinimum('1990-01-01', MAINTENANT, age), /âge minimum/, String(age));
    }
  });
});

describe('creerJoueur et âge minimum', () => {
  it('refuse de créer un joueur de moins de 18 ans', () => {
    assert.throws(
      () => creerJoueur({ pseudo: 'Léa', dateNaissance: '2010-04-02' }, { maintenant: MAINTENANT }),
      /18 ans/,
    );
  });

  it('crée un joueur majeur avec sa date de naissance', () => {
    const joueur = creerJoueur({ pseudo: 'Léa', dateNaissance: '2000-04-02' }, { maintenant: MAINTENANT });
    assert.strictEqual(joueur.birthDate, '2000-04-02');
  });

  it('crée toujours un joueur sans date de naissance (date facultative)', () => {
    const joueur = creerJoueur({ pseudo: 'Léa' }, { maintenant: MAINTENANT });
    assert.strictEqual(joueur.birthDate, null);
  });
});
