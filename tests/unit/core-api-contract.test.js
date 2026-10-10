// Vérifie que le contrat de l'API publique du Core (docs/contracts/core-api.md,
// #267) reste fidèle à ce qu'expose coreService.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as coreService from '../../src/services/coreService.js';

const CONTRAT = readFileSync(new URL('../../docs/contracts/core-api.md', import.meta.url), 'utf8');

/**
 * Noms des fonctions d'une section du contrat : lignes de tableau qui
 * commencent par `nom(`.
 * @param {string} titre - Début du titre de la section (ex. '## 2.').
 * @returns {string[]} Noms des fonctions listées.
 */
function fonctionsDeLaSection(titre) {
  const debut = CONTRAT.indexOf(`\n${titre}`);
  assert.ok(debut >= 0, `section ${titre} absente du contrat`);
  const suite = CONTRAT.indexOf('\n## ', debut + 1);
  const section = CONTRAT.slice(debut, suite < 0 ? undefined : suite);
  return [...section.matchAll(/^\| `(\w+)\(/gm)].map((m) => m[1]);
}

const disponibles = fonctionsDeLaSection('## 2.');
const aVenir = fonctionsDeLaSection('## 10.');
const exposees = Object.keys(coreService).filter((nom) => typeof coreService[nom] === 'function');

describe('contrat de l’API du Core', () => {
  it('chaque fonction du § 2 existe dans coreService', () => {
    assert.ok(disponibles.length > 0);
    for (const nom of disponibles) {
      assert.strictEqual(typeof coreService[nom], 'function', `${nom} décrite mais absente de coreService`);
    }
  });

  it('chaque fonction exposée par coreService est listée dans le contrat (§ 2 ou § 10)', () => {
    for (const nom of exposees) {
      assert.ok(disponibles.includes(nom) || aVenir.includes(nom), `${nom} exposée mais absente du contrat`);
    }
  });

  it('chaque fonction disponible a sa propre section détaillée', () => {
    for (const nom of disponibles) {
      assert.ok(CONTRAT.includes("### `" + nom + "("), `${nom} sans section détaillée`);
    }
  });
});
