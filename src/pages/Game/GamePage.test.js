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

    const WITH_UI = ['slots', 'roulette', 'wheel', 'plinko', 'dice'];
    const ALL = GAME_REGISTRY.map((g) => g.id);

    await t.test('every registered game shows its name', () => {
      assert.ok(GAME_REGISTRY.length > 0);
      for (const { id, name } of GAME_REGISTRY) {
        const html = render({ gameId: id, unlockedGames: ALL });
        assert.ok(html.includes(name.replace(/'/g, '&#x27;')), `${id} should show ${name}`);
        assert.ok(!html.includes('Jeu introuvable'));
      }
    });

    await t.test('unlocked games without a UI keep the waiting message', () => {
      for (const { id } of GAME_REGISTRY.filter((g) => !WITH_UI.includes(g.id))) {
        const html = render({ gameId: id, unlockedGames: ALL });
        assert.ok(html.includes('bientôt jouable'), `${id} is not playable yet`);
        assert.ok(!html.includes('Mode démonstration'));
      }
    });

    // Games plugged into the Core (gameRuntime.js) are played for real.
    const PLUGGED = ['slots', 'roulette'];

    await t.test('games with a Groupe 3 UI display it, in demo mode unless plugged', () => {
      for (const id of WITH_UI) {
        const html = render({ gameId: id, unlockedGames: ALL });
        assert.equal(
          html.includes('Mode démonstration'),
          !PLUGGED.includes(id),
          `${id}: demo banner only when the game is not plugged into the Core`
        );
        assert.ok(!html.includes('bientôt jouable'));
        assert.ok(!html.includes('Jeu verrouillé'));
        assert.ok(html.includes('<button'), `${id} renders its controls`);
      }
    });

    await t.test('a locked game does not open from its URL', () => {
      const unlocked = ['slots', 'dice'];
      for (const id of WITH_UI.filter((game) => !unlocked.includes(game))) {
        const html = render({ gameId: id, unlockedGames: unlocked });
        const { unlockLevel } = GAME_REGISTRY.find((g) => g.id === id);
        assert.ok(html.includes('Jeu verrouillé'), `${id} is locked`);
        assert.ok(html.includes(`niveau ${unlockLevel} requis`));
        assert.ok(!html.includes('Mode démonstration'));
        assert.ok(!html.includes('<button'), `${id} does not mount its UI`);
      }
      const slots = render({ gameId: 'slots', unlockedGames: unlocked });
      assert.ok(!slots.includes('Jeu verrouillé'), 'an unlocked game opens');
      assert.ok(slots.includes('<button'), 'an unlocked game mounts its UI');
    });

    await t.test('with an empty unlocked list every game is locked', () => {
      for (const { id } of GAME_REGISTRY) {
        assert.ok(render({ gameId: id, unlockedGames: [] }).includes('Jeu verrouillé'));
      }
    });

    await t.test('an unknown, missing or invalid id shows "Jeu introuvable"', () => {
      for (const gameId of ['inconnu', '', undefined, null, 42]) {
        const html = render({ gameId, unlockedGames: ALL });
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
