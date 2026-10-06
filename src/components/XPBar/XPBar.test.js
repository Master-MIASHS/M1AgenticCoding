import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Vite loads JSX and CSS using the project's existing toolchain.
 test('XPBar renders supplied values and handles unavailable progress', async (t) => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { default: XPBar } = await server.ssrLoadModule('/src/components/XPBar/XPBar.jsx');
    const render = (props) => renderToStaticMarkup(createElement(XPBar, props));
    for (const [xp, expected] of [[0, 0], [750, 75], [1000, 100], [1500, 100]]) {
      await t.test(`XP ${xp} produces ${expected}%`, () => {
        const html = render({ xp, xpForNextLevel: 1000, level: 3 });
        assert.ok(html.includes(`aria-valuenow="${expected}"`));
        assert.ok(html.includes(`width:${expected}%`));
        assert.ok(html.includes('Niv. 3'));
        assert.ok(html.includes(xp.toLocaleString('fr-FR')));
      });
    }
    for (const props of [{}, { xp: 750 }, { xp: 0, xpForNextLevel: 0 },
      { xp: -1, xpForNextLevel: 1000 }, { xp: NaN, xpForNextLevel: 1000 },
      { xp: 750, xpForNextLevel: Infinity }, { xp: '750', xpForNextLevel: 1000 }]) {
      const html = render(props);
      assert.ok(html.includes('Progression indisponible'));
      assert.ok(!html.includes('aria-valuenow='));
      assert.ok(!html.includes('xp-bar__fill'));
      assert.ok(!html.includes('Niv.'));
    }
    assert.ok(render({ xp: 1, xpForNextLevel: 2, className: 'custom' }).includes('xp-bar custom'));
  } finally {
    await server.close();
  }
});
