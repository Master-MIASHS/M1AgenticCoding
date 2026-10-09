import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { submitProfile } from './createProfile.utils.js';

test('submitProfile forwards the typed pseudo to the Core and reports success', () => {
  const calls = [];
  const result = submitProfile('alice', (infos) => {
    calls.push(infos);
    return { pseudo: 'alice' };
  });
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(calls, [{ pseudo: 'alice' }]);
});

test('submitProfile reports the error raised by the Core without deciding itself', () => {
  const result = submitProfile('', () => {
    throw new Error('le pseudo ne doit pas être vide');
  });
  assert.deepEqual(result, { ok: false, error: 'le pseudo ne doit pas être vide' });
  assert.deepEqual(
    submitProfile('x', () => {
      throw 'boom';
    }),
    { ok: false, error: 'Erreur inconnue.' },
  );
});

// Vite loads JSX and CSS using the project's existing toolchain.
test('CreateProfile shows a labelled pseudo field, and the skip button only when offered', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { default: CreateProfile } = await server.ssrLoadModule(
      '/src/pages/CreateProfile/CreateProfile.jsx',
    );
    const withSkip = renderToStaticMarkup(createElement(CreateProfile, { onSkip: () => {} }));
    assert.ok(withSkip.includes('Bienvenue'));
    assert.ok(withSkip.includes('for="create-profile-pseudo"'));
    assert.ok(withSkip.includes('id="create-profile-pseudo"'));
    assert.ok(withSkip.includes('Créer mon profil'));
    assert.ok(withSkip.includes('Continuer sans profil'));
    assert.ok(!withSkip.includes('role="alert"'));
    assert.ok(!renderToStaticMarkup(createElement(CreateProfile)).includes('Continuer sans profil'));
  } finally {
    await server.close();
  }
});
