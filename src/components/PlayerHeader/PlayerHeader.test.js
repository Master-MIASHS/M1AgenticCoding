import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Vite loads JSX and CSS using the project's existing toolchain.
test('PlayerHeader assembles the common components and degrades per value', async (t) => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { default: PlayerHeader } = await server.ssrLoadModule(
      '/src/components/PlayerHeader/PlayerHeader.jsx',
    );
    const render = (props) => renderToStaticMarkup(createElement(PlayerHeader, props));
    const full = { pseudo: 'alice', level: 4, balance: 5000, xp: 750, xpForNextLevel: 1000 };

    await t.test('shows every supplied value', () => {
      const html = render(full);
      assert.ok(html.includes('alice'));
      assert.ok(html.includes('Niveau 4'));
      assert.ok(html.includes('Solde'));
      assert.ok(html.includes((5000).toLocaleString('fr-FR')));
      assert.ok(html.includes('aria-valuenow="75"'));
      assert.ok(!html.includes('Progression indisponible'));
    });

    await t.test('uses the first letter of the pseudo as avatar', () => {
      assert.match(render(full), /player-header__avatar[^>]*>A</);
      assert.match(render({ ...full, pseudo: 'émile' }), /player-header__avatar[^>]*>É</);
    });

    await t.test('falls back to a default pseudo', () => {
      for (const pseudo of [undefined, '', '   ', 42]) {
        assert.ok(render({ ...full, pseudo }).includes('Joueur Fantôme'));
      }
    });

    await t.test('a missing value only degrades its own part', () => {
      assert.ok(render({ ...full, level: undefined }).includes('Niveau —'));
      assert.ok(render({ ...full, balance: undefined }).includes('Solde'));
      assert.ok(render({ ...full, xpForNextLevel: undefined }).includes('Progression indisponible'));
      const empty = render({});
      assert.ok(empty.includes('Joueur Fantôme'));
      assert.ok(empty.includes('Niveau —'));
      assert.ok(empty.includes('Progression indisponible'));
    });

    await t.test('is labelled for assistive technology and accepts a class', () => {
      const html = render({ ...full, className: 'custom' });
      assert.ok(html.includes('aria-label="Résumé du joueur"'));
      assert.ok(html.includes('player-header custom'));
    });
  } finally {
    await server.close();
  }
});
