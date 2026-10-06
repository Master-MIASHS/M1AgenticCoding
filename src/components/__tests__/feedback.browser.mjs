import assert from 'node:assert/strict';
const targets = await (await fetch('http://127.0.0.1:9223/json')).json();
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error ? p.reject(m.error) : p.resolve(m.result);
  }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const pause = () => new Promise((r) => setTimeout(r, 150));
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const key = async (key, code = key, modifiers = 0) => {
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key,
    code,
    modifiers,
    windowsVirtualKeyCode: key === 'Escape' ? 27 : 9,
  });
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key,
    code,
    modifiers,
    windowsVirtualKeyCode: key === 'Escape' ? 27 : 9,
  });
  await pause();
};
const click = async (selector) => {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  await pause();
};
const opening = async () => {
  await evaluate(
    "document.querySelector('#trigger').focus();document.querySelector('#trigger').click()"
  );
  await pause();
  assert.equal(await evaluate("document.querySelector('dialog').open"), true);
};
try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', {
    url: 'http://127.0.0.1:5173/src/components/__tests__/feedback.html',
  });
  for (let i = 0; i < 100; i++) {
    if (await evaluate("!!document.querySelector('#trigger')")) break;
    await pause();
  }
  await opening();
  assert.equal(
    await evaluate("document.querySelector('dialog').contains(document.activeElement)"),
    true
  );
  await key('Tab');
  assert.equal(await evaluate('document.activeElement.id'), 'field');
  await key('Tab');
  assert.equal(await evaluate('document.activeElement.id'), 'last');
  await key('Tab');
  // Chromium may focus the browser chrome at the end of the dialog cycle;
  // another Tab must return to the dialog, never to the outside trigger.
  if ((await evaluate('document.activeElement.tagName')) === 'BODY') await key('Tab');
  assert.equal(
    await evaluate("document.querySelector('dialog').contains(document.activeElement)"),
    true
  );
  await key('Tab', 'Tab', 8);
  assert.notEqual(await evaluate('document.activeElement.id'), 'trigger');
  await key('Escape');
  assert.equal(await evaluate("document.querySelector('dialog').open"), false);
  assert.equal(await evaluate('document.activeElement.id'), 'trigger');
  console.log('PASS opening, keyboard navigation, Escape, focus restoration (StrictMode)');
  await opening();
  await click('.ui-modal__close');
  assert.equal(await evaluate("document.querySelector('dialog').open"), false);
  const outside = async () => {
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: 1,
      y: 1,
      button: 'left',
      clickCount: 1,
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: 1,
      y: 1,
      button: 'left',
      clickCount: 1,
    });
    await pause();
  };
  await opening();
  await outside();
  assert.equal(await evaluate("document.querySelector('dialog').open"), true);
  await key('Escape');
  await click('#backdrop');
  await opening();
  await outside();
  assert.equal(await evaluate("document.querySelector('dialog').open"), false);
  console.log('PASS close button and optional backdrop');
  await click('.ui-notification__close');
  assert.equal(await evaluate("document.querySelectorAll('.ui-notification').length"), 4);
  assert.equal(
    await evaluate("document.querySelectorAll('.ui-notification [role=alert]').length"),
    1
  );
  console.log('PASS notifications and close interaction');
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  assert.equal(
    await evaluate("getComputedStyle(document.querySelector('.ui-loader__spinner')).animationName"),
    'none'
  );
  for (const width of [320, 390, 1280]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await opening();
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
    assert.equal(
      await evaluate("document.querySelector('dialog').getBoundingClientRect().width<=innerWidth"),
      true
    );
    await key('Escape');
  }
  console.log('PASS reduced motion and viewport overflow at 320/390/1280px');
  await click('#auto');
  assert.equal(await evaluate("document.body.textContent.includes('Automatique')"), true);
  await new Promise((r) => setTimeout(r, 1800));
  assert.equal(await evaluate("document.body.textContent.includes('Automatique')"), false);
  await evaluate("document.querySelector('#loading').focus()");
  await click('#loading');
  assert.equal(await evaluate("document.querySelector('.ui-loader__overlay').open"), true);
  await key('Escape');
  assert.equal(await evaluate("document.querySelector('.ui-loader__overlay').open"), true);
  await key('Tab');
  assert.notEqual(await evaluate('document.activeElement.id'), 'trigger');
  await new Promise((r) => setTimeout(r, 1600));
  assert.equal(await evaluate("!!document.querySelector('.ui-loader__overlay')"), false);
  assert.equal(await evaluate('document.activeElement.id'), 'loading');
  console.log('PASS autoClose and blocking overlay with focus restoration');
  assert.deepEqual(errors, []);
  console.log('PASS no browser runtime exceptions');
} finally {
  await send('Browser.close');
  ws.close();
}
