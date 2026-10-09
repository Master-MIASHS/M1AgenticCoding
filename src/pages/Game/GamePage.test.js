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

    const WITH_UI = ['slots', 'roulette', 'wheel'];

    await t.test('every registered game shows its name', () => {
      assert.ok(GAME_REGISTRY.length > 0);
      for (const { id, name } of GAME_REGISTRY) {
        const html = render({ gameId: id });
        assert.ok(html.includes(name.replace(/'/g, '&#x27;')), `${id} should show ${name}`);
        assert.ok(!html.includes('Jeu introuvable'));
      }
    });

    await t.test('games without a UI keep the waiting message', () => {
      for (const { id } of GAME_REGISTRY.filter((g) => !WITH_UI.includes(g.id))) {
        const html = render({ gameId: id });
        assert.ok(html.includes('bientôt jouable'), `${id} is not playable yet`);
        assert.ok(!html.includes('Mode démonstration'));
      }
    });

    await t.test('games with a Groupe 3 UI display it in demonstration mode', () => {
      for (const id of WITH_UI) {
        const html = render({ gameId: id });
        assert.ok(html.includes('Mode démonstration'), `${id} is flagged as simulated`);
        assert.ok(!html.includes('bientôt jouable'));
        assert.ok(html.includes('<button'), `${id} renders its controls`);
      }
    });

    await t.test('an unknown, missing or invalid id shows "Jeu introuvable"', () => {
      for (const gameId of ['inconnu', '', undefined, null, 42]) {
        const html = render({ gameId });
        assert.ok(html.includes('Jeu introuvable'));
        assert.ok(!html.includes('bientôt jouable'));
        assert.ok(!html.includes('Mode démonstration'));
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
