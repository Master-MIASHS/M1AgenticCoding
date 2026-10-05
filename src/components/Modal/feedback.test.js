import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('feedback components: presentation and close callback', async (t) => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const load = async (name) => (await server.ssrLoadModule(`/src/components/${name}/${name}.jsx`)).default;
    const [Loader, Notification, Modal] = await Promise.all(['Loader', 'Notification', 'Modal'].map(load));
    const render = (Component, props) => renderToStaticMarkup(createElement(Component, props));
    await t.test('loader keeps an accessible label even when visually hidden', () => {
      const html = render(Loader, { label: 'Patientez', showLabel: false, size: 'sm' });
      assert.match(html, /role="status"/);
      assert.match(html, /ui-loader__sr-only">Patientez/);
      assert.match(html, /ui-loader--sm/);
      assert.match(render(Loader, { label: '', size: 'invalid' }), /Chargement/);
      assert.match(render(Loader, { size: 'invalid' }), /ui-loader--md/);
    });
    await t.test('notifications expose their severity without relying on color', () => {
      for (const type of ['info', 'success', 'warning', 'error']) {
        const html = render(Notification, { type, children: '<script>unsafe</script>' });
        assert.match(html, new RegExp(`role="${type === 'error' ? 'alert' : 'status'}"`));
        assert.ok(!html.includes('<script>'));
        assert.ok(!html.includes('<button'));
      }
      assert.match(render(Notification, { type: 'unknown', children: 'Hello' }), /Information/);
    });
    await t.test('notification close delegates to the caller', () => {
      let calls = 0;
      const tree = Notification({ children: 'Hello', onClose: () => { calls += 1; } });
      tree.props.children[1].props.onClick();
      assert.equal(calls, 1);
      assert.match(render(Notification, { onClose: () => {} }), /Fermer la notification/);
    });
    await t.test('closed modal hides children; open modal has a named heading', () => {
      const closed = render(Modal, { isOpen: false, title: 'Confirmation', children: 'Secret', onClose: () => {} });
      assert.ok(!closed.includes('Secret'));
      const opened = render(Modal, { isOpen: true, title: 'Confirmation', children: 'Contenu', onClose: () => {} });
      const id = opened.match(/aria-labelledby="([^"]+)"/)[1];
      assert.ok(opened.includes(`id="${id}"`));
      assert.match(opened, /Fermer la fenêtre/);
      assert.match(opened, /Contenu/);
    });
  } finally { await server.close(); }
});
