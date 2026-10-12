import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Replace only the public facade in this test's Vite server; no Core internals.
const coreServiceMock = {
  name: 'statistics-core-service-mock',
  enforce: 'pre',
  load(id) {
    if (!id.replaceAll('\\', '/').endsWith('/src/services/coreService.js')) return null;
    return `
      let statsError = null;
      export function setStatsError(error) { statsError = error; }
      export function getState() { return { balance: 125, bestBalance: 900 }; }
      export function getGlobalStats() {
        if (statsError) throw statsError;
        return { totalPlays: 3, totalWagered: 60, totalWon: 70, activePlayers: 1 };
      }
    `;
  },
};

// Vite loads JSX and CSS using the project's existing toolchain.
test('Statistics renders global statistics and preserves personal balances on failure', async (t) => {
  const server = await createServer({
    plugins: [coreServiceMock],
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
  });
  try {
    const { default: Statistics } = await server.ssrLoadModule('/src/pages/Statistics/Statistics.jsx');
    const { setStatsError } = await server.ssrLoadModule('/src/services/coreService.js');
    const render = () => renderToStaticMarkup(createElement(Statistics));

    await t.test('shows the supplied global statistics when getGlobalStats succeeds', () => {
      setStatsError(null);
      const html = render();
      assert.match(html, /<dt>Nombre total de parties<\/dt><dd>3<\/dd>/);
      assert.match(html, /<dt>Total des mises<\/dt><dd>60<\/dd>/);
      assert.match(html, /<dt>Total des gains<\/dt><dd>70<\/dd>/);
      assert.match(html, /<dt>Joueurs actifs<\/dt><dd>1<\/dd>/);
      assert.doesNotMatch(html, /role="alert"/);
      assert.doesNotMatch(html, /Statistiques indisponibles pour le moment\./);
    });

    await t.test('shows an accessible error message when getGlobalStats throws', (subtest) => {
      setStatsError(new Error('historique invalide'));
      subtest.mock.method(console, 'error', () => {});
      const html = render();
      assert.match(html, /<p role="alert">Statistiques indisponibles pour le moment\.<\/p>/);
      assert.doesNotMatch(html, /Nombre total de parties|Total des mises|Total des gains|Joueurs actifs/);
    });

    await t.test('keeps both personal balances when getGlobalStats throws', (subtest) => {
      setStatsError(new Error('historique invalide'));
      subtest.mock.method(console, 'error', () => {});
      const html = render();
      assert.match(html, /<dt>Solde actuel<\/dt><dd>125<\/dd>/);
      assert.match(html, /<dt>Meilleur solde<\/dt><dd>900<\/dd>/);
    });
  } finally {
    await server.close();
  }
});
