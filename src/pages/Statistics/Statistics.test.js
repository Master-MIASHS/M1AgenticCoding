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
      let stats = { totalPlays: 3, totalWagered: 60, totalWon: 70, activePlayers: 1 };
      export function setStatsError(error) { statsError = error; }
      export function setStats(value) { stats = value; }
      export function getState() { return { balance: 125, bestBalance: 900 }; }
      export function getGlobalStats() {
        if (statsError) throw statsError;
        return stats;
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
    const { setStatsError, setStats } = await server.ssrLoadModule('/src/services/coreService.js');
    const render = () => renderToStaticMarkup(createElement(Statistics));

    await t.test('shows the supplied global statistics when getGlobalStats succeeds', () => {
      setStatsError(null);
      setStats({ totalPlays: 3, totalWagered: 60, totalWon: 70, activePlayers: 1 });
      const html = render();
      assert.match(html, /<dt>Nombre total de parties<\/dt><dd>3<\/dd>/);
      assert.match(html, /<dt>Total des mises<\/dt><dd>60<\/dd>/);
      assert.match(html, /<dt>Total reversé \(mises incluses\)<\/dt><dd>70<\/dd>/);
      assert.match(html, /<dt>Joueurs actifs<\/dt><dd>1<\/dd>/);
      assert.doesNotMatch(html, /role="alert"/);
      assert.doesNotMatch(html, /Statistiques indisponibles pour le moment\./);
      assert.doesNotMatch(html, /Aucune partie n&#x27;est enregistrée/);
    });

    await t.test('explains local statistics and the scope of active players', () => {
      setStatsError(null);
      const html = render();
      assert.match(html, /Les statistiques sont calculées à partir de l&#x27;historique de vos parties enregistrées sur cet appareil\./);
      assert.match(html, /Statistiques de vos parties/);
      assert.match(html, /Le nombre de joueurs actifs correspond au profil local ayant enregistré au moins une partie \(0 ou 1\), et non au nombre de personnes connectées au casino\./);
      assert.doesNotMatch(html, /actuellement simulées|Statistiques globales du casino|Total des gains/);
    });

    await t.test('shows an empty history message and preserves zero counters', () => {
      setStatsError(null);
      setStats({ totalPlays: 0, totalWagered: 0, totalWon: 0, activePlayers: 0 });
      const html = render();
      assert.match(html, /Aucune partie n&#x27;est enregistrée dans votre historique pour le moment\./);
      assert.match(html, /<dt>Nombre total de parties<\/dt><dd>0<\/dd>/);
      assert.match(html, /<dt>Total des mises<\/dt><dd>0<\/dd>/);
      assert.match(html, /<dt>Total reversé \(mises incluses\)<\/dt><dd>0<\/dd>/);
      assert.match(html, /<dt>Joueurs actifs<\/dt><dd>0<\/dd>/);
      assert.doesNotMatch(html, /role="alert"/);
    });

    await t.test('shows an accessible error message when getGlobalStats throws', (subtest) => {
      setStatsError(new Error('historique invalide'));
      subtest.mock.method(console, 'error', () => {});
      const html = render();
      assert.match(html, /<p role="alert">Statistiques indisponibles pour le moment\.<\/p>/);
      assert.doesNotMatch(html, /Nombre total de parties|Total des mises|Total des gains|Joueurs actifs/);
      assert.doesNotMatch(html, /Total reversé|Aucune partie n&#x27;est enregistrée/);
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
