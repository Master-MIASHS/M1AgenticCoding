import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Vite loads JSX and CSS using the project's existing toolchain.
test('BalanceDisplay renders the supplied balance and handles invalid values', async (t) => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { default: BalanceDisplay } = await server.ssrLoadModule(
      '/src/components/BalanceDisplay/BalanceDisplay.jsx',
    );
    const render = (props) => renderToStaticMarkup(createElement(BalanceDisplay, props));
    const text = (html) => html.replace(/<[^>]+>/g, '');

    await t.test('shows the balance with the default label', () => {
      assert.equal(text(render({ balance: 0 })), 'Solde 0');
      assert.equal(text(render({ balance: 1000 })), `Solde ${(1000).toLocaleString('fr-FR')}`);
    });

    await t.test('formats large balances in French', () => {
      assert.equal(text(render({ balance: 5000 })), `Solde ${(5000).toLocaleString('fr-FR')}`);
    });

    await t.test('keeps at most two decimals and shows negative balances', () => {
      assert.equal(text(render({ balance: 12.345 })), `Solde ${(12.345).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}`);
      assert.equal(text(render({ balance: -50 })), `Solde ${(-50).toLocaleString('fr-FR')}`);
    });

    await t.test('adds no currency symbol', () => {
      assert.ok(!/[€$£]/.test(render({ balance: 100 })));
    });

    await t.test('uses a custom label', () => {
      assert.equal(text(render({ balance: 10, label: 'Votre solde' })), 'Votre solde 10');
    });

    await t.test('falls back to a dash for absent or invalid balances', () => {
      for (const balance of [undefined, null, NaN, Infinity, '100']) {
        assert.equal(text(render({ balance })), 'Solde —');
      }
      assert.equal(text(render({})), 'Solde —');
    });

    await t.test('adds a custom class', () => {
      assert.ok(render({ balance: 1, className: 'custom' }).includes('balance-display custom'));
    });
  } finally {
    await server.close();
  }
});
