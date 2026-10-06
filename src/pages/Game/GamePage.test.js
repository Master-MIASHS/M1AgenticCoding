import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Vite loads JSX and CSS using the project's existing toolchain.
test('GamePage identifies a game from its id and handles unknown ids', async (t) => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { default: GamePage } = await server.ssrLoadModule('/src/pages/Game/GamePage.jsx');
    const { GAME_REGISTRY } = await server.ssrLoadModule('/src/config/gameRegistry.js');
    const render = (props) => renderToStaticMarkup(createElement(GamePage, props));

    await t.test('every registered game shows its name', () => {
      assert.ok(GAME_REGISTRY.length > 0);
      for (const { id, name } of GAME_REGISTRY) {
        const html = render({ gameId: id });
        assert.ok(html.includes(name), `${id} should show ${name}`);
        assert.ok(html.includes('bientôt jouable'));
        assert.ok(!html.includes('Jeu introuvable'));
      }
    });

    await t.test('an unknown, missing or invalid id shows "Jeu introuvable"', () => {
      for (const gameId of ['inconnu', '', undefined, null, 42]) {
        const html = render({ gameId });
        assert.ok(html.includes('Jeu introuvable'));
        assert.ok(!html.includes('bientôt jouable'));
      }
      assert.ok(render({}).includes('Jeu introuvable'));
    });

    await t.test('always offers a way back to the lobby', () => {
      for (const gameId of ['slots', 'inconnu']) {
        assert.ok(render({ gameId }).includes('href="#/"'));
      }
    });
  } finally {
    await server.close();
  }
});
