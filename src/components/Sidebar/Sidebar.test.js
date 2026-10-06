import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Vite loads JSX and CSS using the project's existing toolchain.
test('Sidebar renders the supplied links and ignores invalid input', async (t) => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { default: Sidebar } = await server.ssrLoadModule('/src/components/Sidebar/Sidebar.jsx');
    const render = (props) => renderToStaticMarkup(createElement(Sidebar, props));
    const items = [
      { path: '/profile', label: 'Mon profil', icon: '👤' },
      { path: '/progression', label: 'Ma progression' },
    ];

    await t.test('renders each label as a link built with getHref', () => {
      const html = render({ items, getHref: (path) => `#${path}` });
      assert.ok(html.includes('Mon profil'));
      assert.ok(html.includes('Ma progression'));
      assert.ok(html.includes('href="#/profile"'));
      assert.ok(html.includes('href="#/progression"'));
    });

    await t.test('uses the path as is without getHref, and an item href first', () => {
      assert.ok(render({ items }).includes('href="/profile"'));
      const html = render({
        items: [{ path: '/shop', label: 'Boutique', href: '/boutique' }],
        getHref: (path) => `#${path}`,
      });
      assert.ok(html.includes('href="/boutique"'));
      assert.ok(!html.includes('href="#/shop"'));
    });

    await t.test('marks only the current page with aria-current', () => {
      const html = render({ items, currentPath: '/progression' });
      assert.equal(html.match(/aria-current="page"/g).length, 1);
      assert.match(html, /aria-current="page"[^>]*>(?:<[^>]+>)*Ma progression/);
      assert.ok(!render({ items }).includes('aria-current'));
    });

    await t.test('renders nothing for an empty, missing or invalid list', () => {
      for (const value of [undefined, null, [], 'x', 42, {}]) {
        assert.equal(render({ items: value }), '');
      }
      assert.equal(render({}), '');
    });

    await t.test('ignores items without a path or a non-empty label', () => {
      const html = render({
        items: [
          null,
          'texte',
          {},
          { path: '/a' },
          { label: 'Sans chemin' },
          { path: '', label: 'Chemin vide' },
          { path: '/b', label: '   ' },
          { path: '/ok', label: 'Valide' },
        ],
      });
      assert.ok(html.includes('Valide'));
      assert.equal((html.match(/<li/g) || []).length, 1);
      assert.ok(!html.includes('Sans chemin'));
      assert.ok(!html.includes('Chemin vide'));
    });

    await t.test('has a closed toggle wired to the navigation', () => {
      const html = render({ items });
      assert.ok(html.includes('aria-expanded="false"'));
      const id = html.match(/aria-controls="([^"]+)"/)[1];
      assert.ok(html.includes(`id="${id}"`));
      assert.ok(!html.includes('sidebar__nav--open'));
    });

    await t.test('names the navigation and hides decorative icons', () => {
      assert.ok(render({ items }).includes('aria-label="Navigation latérale"'));
      assert.ok(render({ items, ariaLabel: 'Menu admin' }).includes('aria-label="Menu admin"'));
      assert.match(render({ items }), /aria-hidden="true">👤</);
    });

    await t.test('adds a custom class', () => {
      assert.ok(render({ items, className: 'custom' }).includes('sidebar custom'));
    });
  } finally {
    await server.close();
  }
});
