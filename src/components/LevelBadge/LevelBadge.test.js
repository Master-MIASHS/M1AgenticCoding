import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Vite loads JSX and CSS using the project's existing toolchain.
test('LevelBadge renders the supplied level and handles invalid values', async (t) => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { default: LevelBadge } = await server.ssrLoadModule(
      '/src/components/LevelBadge/LevelBadge.jsx',
    );
    const render = (props) => renderToStaticMarkup(createElement(LevelBadge, props));
    const text = (html) => html.replace(/<[^>]+>/g, '');

    await t.test('shows the level with the default label', () => {
      assert.equal(text(render({ level: 4 })), 'Niveau 4');
      assert.equal(text(render({ level: 0 })), 'Niveau 0');
    });

    await t.test('formats large levels in French', () => {
      assert.equal(text(render({ level: 1234 })), `Niveau ${(1234).toLocaleString('fr-FR')}`);
    });

    await t.test('uses a custom label', () => {
      assert.equal(text(render({ level: 4, label: 'Niv.' })), 'Niv. 4');
    });

    await t.test('falls back to a dash for absent or invalid levels', () => {
      for (const level of [undefined, null, -1, NaN, Infinity, '4']) {
        assert.equal(text(render({ level })), 'Niveau —');
      }
      assert.equal(text(render({})), 'Niveau —');
    });

    await t.test('adds a custom class', () => {
      assert.ok(render({ level: 1, className: 'custom' }).includes('level-badge custom'));
    });
  } finally {
    await server.close();
  }
});
