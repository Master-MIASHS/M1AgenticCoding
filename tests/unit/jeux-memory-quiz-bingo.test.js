// Memory, Quiz et Bingo dans le catalogue du Core (Groupe 1, #318) : niveaux
// de déblocage d'AGENTS.md, identifiants de createGame (G2).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { GAMES, getGameConfig } from '../../src/core/config/games.config.js';

describe('GAMES : Memory, Quiz et Bingo (#318)', () => {
  it('contient les trois jeux avec les niveaux d’AGENTS.md', () => {
    assert.deepStrictEqual(GAMES.memory, { id: 'memory', name: 'Memory', unlockLevel: 8 });
    assert.deepStrictEqual(GAMES.quiz, { id: 'quiz', name: 'Quiz', unlockLevel: 9 });
    assert.deepStrictEqual(GAMES.bingo, { id: 'bingo', name: 'Bingo', unlockLevel: 10 });
  });

  it('couvre les 13 jeux d’AGENTS.md, triés par niveau de déblocage', () => {
    const niveaux = Object.values(GAMES).map((jeu) => jeu.unlockLevel);
    assert.strictEqual(niveaux.length, 13);
    assert.deepStrictEqual(niveaux, [...niveaux].sort((a, b) => a - b));
  });

  it('accepte leur identifiant dans getGameConfig, sans barème par défaut', () => {
    for (const id of ['memory', 'quiz', 'bingo']) {
      assert.doesNotThrow(() => getGameConfig(id), id);
      assert.ok(Object.isFrozen(GAMES[id]), id);
    }
  });
});
