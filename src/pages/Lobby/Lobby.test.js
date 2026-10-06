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
    return { html: renderToStaticMarkup(createElement(Lobby)), games: GAME_REGISTRY };
  } finally {
    await server.close();
  }
}

test('Lobby lists every game of the registry with its game page link or lock', async () => {
  const { html, games } = await renderLobby();
  assert.ok(html.includes('Lobby'));
  assert.ok(!html.includes('placeholder'));
  for (const game of games) {
    assert.ok(html.includes(game.name), `${game.name} is displayed`);
  }
  const playable = html.match(/href="#\/game\/[a-z-]+"/g) ?? [];
  const locked = html.match(/aria-disabled="true"/g) ?? [];
  assert.equal(playable.length + locked.length, games.length);
  assert.ok(playable.length >= 1, 'at least one game is playable');
});

test('Lobby shows the player summary', async () => {
  const { html } = await renderLobby();
  assert.ok(html.includes('Résumé du joueur'));
});
