import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Vite loads JSX and CSS using the project's existing toolchain.
test('NotFound explains the error and links back to the home page', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { default: NotFound } = await server.ssrLoadModule('/src/pages/NotFound/NotFound.jsx');
    const html = renderToStaticMarkup(createElement(NotFound));
    assert.ok(html.includes('Page introuvable'));
    assert.ok(html.includes('href="#/"'));
    assert.ok(!html.includes('placeholder'));
  } finally {
    await server.close();
  }
});
