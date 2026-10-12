import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// History and Leaderboard read the real Core (history from play(), bestBalance, badges).
test('History and Leaderboard display the real Core data', async (t) => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  try {
    const core = await server.ssrLoadModule('/src/services/coreService.js');
    const { default: History } = await server.ssrLoadModule('/src/pages/History/History.jsx');
    const { default: Leaderboard } = await server.ssrLoadModule('/src/pages/Leaderboard/Leaderboard.jsx');
    const render = (component) => renderToStaticMarkup(createElement(component));

    await t.test('empty history shows an empty state', () => {
      assert.ok(render(History).includes('Aucune partie jouée'));
      assert.ok(!render(History).includes('prochainement'));
    });

    await t.test('a settled round appears in the history table', () => {
      core.play('slots', 10, { outcome: 'win', multiplier: 3 }, { roundId: 'slots-history-1' });
      const html = render(History);
      assert.ok(html.includes('<table'));
      assert.ok(html.includes('slots'));
      assert.ok(html.includes('Gagné'));
    });

    await t.test('the leaderboard shows the best balance and a badges column', () => {
      core.play('slots', 10, { outcome: 'loss', multiplier: 0 }, { roundId: 'slots-history-2' });
      const { bestBalance, balance } = core.getState();
      assert.ok(bestBalance > balance, 'the best balance never goes down');
      const html = render(Leaderboard);
      assert.ok(html.includes('Meilleur solde'));
      assert.ok(html.includes('Badges'));
      assert.ok(html.includes(bestBalance.toLocaleString('fr-FR')));
    });
  } finally {
    await server.close();
  }
});
