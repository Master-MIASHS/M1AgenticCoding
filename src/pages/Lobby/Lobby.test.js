import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Vite loads JSX and CSS using the project's existing toolchain.
async function renderLobby() {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { default: Lobby } = await server.ssrLoadModule('/src/pages/Lobby/Lobby.jsx');
    const { GAME_REGISTRY } = await server.ssrLoadModule('/src/config/gameRegistry.js');
    const { GAME_UIS } = await server.ssrLoadModule('/src/pages/Game/GamePage.jsx');
    const { getUnlockedGames } = await server.ssrLoadModule('/src/services/coreService.js');
    return {
      html: renderToStaticMarkup(createElement(Lobby)),
      games: GAME_REGISTRY,
      screens: GAME_UIS,
      unlocked: getUnlockedGames(),
    };
  } finally {
    await server.close();
  }
}

test('Lobby lists every game of the registry with its game page link or lock', async () => {
  const { html, games } = await renderLobby();
  assert.ok(html.includes('Lobby'));
  assert.ok(!html.includes('placeholder'));
  for (const game of games) {
    assert.ok(html.includes(game.name.replace(/'/g, '&#x27;')), `${game.name} is displayed`);
  }
  const playable = html.match(/href="#\/game\/[a-z-]+"/g) ?? [];
  const disabled = html.match(/aria-disabled="true"/g) ?? [];
  assert.equal(playable.length + disabled.length, games.length);
  assert.ok(playable.length >= 1, 'at least one game is playable');
});

test('Lobby shows "Bientôt" for an unlocked game without a screen, and French names', async () => {
  const { html, games, screens, unlocked } = await renderLobby();
  // Derived from the Core and from the games that have a screen, so the test does not
  // depend on which games Groupe 3 has delivered so far.
  const soon = games.filter((game) => unlocked.includes(game.id) && !screens[game.id]);
  const playable = games.filter((game) => unlocked.includes(game.id) && screens[game.id]);
  assert.equal(html.includes('Bientôt'), soon.length > 0);
  for (const game of playable) {
    assert.ok(html.includes(`href="#/game/${game.id}"`), `${game.id} links to its page`);
  }
  for (const game of soon) {
    assert.ok(!html.includes(`href="#/game/${game.id}"`), `${game.id} has no link yet`);
  }
  for (const english of ['Slots', 'Dice', 'Wheel', 'Scratch', 'Video Poker']) {
    assert.ok(!games.some((game) => game.name === english), `${english} is not a registry name`);
  }
  for (const game of games) {
    assert.ok(['hasard', 'cartes', 'adresse'].includes(game.category), `${game.id} has a game type`);
  }
});

test('Lobby shows the player summary', async () => {
  const { html } = await renderLobby();
  assert.ok(html.includes('Résumé du joueur'));
});
