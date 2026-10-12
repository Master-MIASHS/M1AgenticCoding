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

      const WITH_UI = [
        'slots',
        'roulette',
        'wheel',
        'plinko',
        'dice',
        'scratch',
        'blackjack',
        'video-poker',
        'memory',
        'quiz',
        'bingo',
        'baccarat',
        'poker',
      ];
      const ALL = GAME_REGISTRY.map((g) => g.id);

      await t.test('every registered game shows its name', () => {
        assert.ok(GAME_REGISTRY.length > 0);
        for (const { id, name } of GAME_REGISTRY) {
          const html = render({ gameId: id, unlockedGames: ALL });
          assert.ok(html.includes(name.replace(/'/g, '&#x27;')), `${id} should show ${name}`);
          assert.ok(!html.includes('Jeu introuvable'));
        }
      });

      await t.test('every registered game has a UI, none is left "coming soon"', () => {
        assert.deepEqual([...WITH_UI].sort(), [...ALL].sort());
        for (const id of ALL) {
          const html = render({ gameId: id, unlockedGames: ALL });
          assert.ok(!html.includes('bientôt jouable'), `${id} is available`);
          assert.ok(!html.includes('indisponible'), `${id} is plugged into the Core`);
        }
      });

      await t.test('games with a Groupe 3 UI display it, plugged into the Core (no demo mode)', () => {
        for (const id of WITH_UI) {
          const html = render({ gameId: id, unlockedGames: ALL });
          assert.ok(!html.includes('Mode démonstration'), `${id}: no demo banner`);
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
        assert.ok(!render({ gameId: 'dice', unlockedGames: unlocked }).includes('Jeu verrouillé'));
      });

      await t.test('without an explicit list the lock follows the Core (level 1 at start)', () => {
        // Guards against the lock disappearing when the default is lost.
        const locked = render({ gameId: 'roulette' });
        assert.ok(locked.includes('Jeu verrouillé'), 'roulette (level 5) is locked at level 1');
        assert.ok(!locked.includes('<button'), 'a locked game does not mount its UI');
        const open = render({ gameId: 'slots' });
        assert.ok(!open.includes('Jeu verrouillé'), 'slots (level 1) opens');
      });

      await t.test('an unusable unlocked list locks the game', () => {
        for (const unlockedGames of [null, 'slots', 42, {}]) {
          assert.ok(render({ gameId: 'slots', unlockedGames }).includes('Jeu verrouillé'));
        }
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
