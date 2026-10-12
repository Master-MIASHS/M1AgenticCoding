import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { submitProfile } from './createProfile.utils.js';

test('submitProfile forwards the pseudo and the birth date to the Core and reports success', () => {
  const calls = [];
  const result = submitProfile('alice', '2000-05-17', (infos) => {
    calls.push(infos);
    return { pseudo: 'alice' };
  });
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(calls, [{ pseudo: 'alice', dateNaissance: '2000-05-17' }]);
});

test('submitProfile requires a birth date and does not call the Core without it', () => {
  let called = false;
  for (const date of ['', '   ', undefined, null]) {
    const result = submitProfile('alice', date, () => {
      called = true;
    });
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('date de naissance'));
  }
  assert.equal(called, false);
});

test('submitProfile reports the error raised by the Core without deciding itself', () => {
  const result = submitProfile('', '2000-05-17', () => {
    throw new Error('le pseudo ne doit pas être vide');
  });
  assert.deepEqual(result, { ok: false, error: 'le pseudo ne doit pas être vide' });
  const minor = submitProfile('alice', '2015-01-01', () => {
    throw new Error('vous devez avoir 18 ans révolus');
  });
  assert.deepEqual(minor, { ok: false, error: 'vous devez avoir 18 ans révolus' });
  assert.deepEqual(
    submitProfile('x', '2000-05-17', () => {
      throw 'boom';
    }),
    { ok: false, error: 'Erreur inconnue.' },
  );
});

// Vite loads JSX and CSS using the project's existing toolchain.
test('CreateProfile shows labelled pseudo and birth date fields, and the skip button only when offered', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { default: CreateProfile } = await server.ssrLoadModule(
      '/src/pages/CreateProfile/CreateProfile.jsx',
    );
    const withSkip = renderToStaticMarkup(createElement(CreateProfile, { onSkip: () => {} }));
    assert.ok(withSkip.includes('Bienvenue'));
    assert.ok(withSkip.includes('for="create-profile-pseudo"'));
    assert.ok(withSkip.includes('id="create-profile-pseudo"'));
    assert.ok(withSkip.includes('for="create-profile-naissance"'));
    assert.ok(withSkip.includes('type="date"'));
    assert.ok(withSkip.includes('Créer mon profil'));
    assert.ok(withSkip.includes('Continuer sans profil'));
    assert.ok(!withSkip.includes('role="alert"'));
    assert.ok(!renderToStaticMarkup(createElement(CreateProfile)).includes('Continuer sans profil'));
  } finally {
    await server.close();
  }
});
