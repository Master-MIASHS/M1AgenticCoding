import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Collects every element of a React tree matching a predicate.
function findAll(node, predicate, found = []) {
  if (Array.isArray(node)) {
    node.forEach((child) => findAll(child, predicate, found));
  } else if (isValidElement(node)) {
    if (predicate(node)) found.push(node);
    findAll(node.props.children, predicate, found);
  }
  return found;
}

// Vite loads JSX and CSS using the project's existing toolchain.
test('GameCard renders playable and locked games', async (t) => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { default: GameCard } = await server.ssrLoadModule('/src/components/GameCard/GameCard.jsx');
    const render = (props) => renderToStaticMarkup(createElement(GameCard, props));

    await t.test('a playable card with href renders a link', () => {
      const html = render({ name: 'Slots', category: 'table', href: '#/game/slots' });
      assert.ok(html.includes('Slots'));
      assert.ok(html.includes('table'));
      assert.ok(html.includes('<a '));
      assert.ok(html.includes('href="#/game/slots"'));
      assert.ok(html.includes('aria-label="Jouer à Slots"'));
      assert.ok(!html.includes('disabled'));
      assert.ok(!html.includes('game-card--locked'));
    });

    await t.test('a playable card without href renders a button', () => {
      const html = render({ name: 'Dice' });
      assert.ok(html.includes('<button'));
      assert.ok(!html.includes('<a '));
      assert.ok(!html.includes('disabled'));
    });

    await t.test('a locked card shows the required level and is disabled', () => {
      const html = render({ name: 'Poker', locked: true, unlockLevel: 12, href: '#/game/poker' });
      assert.ok(html.includes('Niveau 12 requis'));
      assert.ok(html.includes('disabled'));
      assert.ok(html.includes('aria-disabled="true"'));
      assert.ok(html.includes('game-card--locked'));
      assert.ok(!html.includes('<a '));
      assert.ok(!html.includes('href='));
    });

    await t.test('a coming-soon card is disabled, says "Bientôt" and has no link', () => {
      const html = render({ name: 'Dés', comingSoon: true, href: '#/game/dice', onSelect: () => {} });
      assert.ok(html.includes('Bientôt'));
      assert.ok(html.includes('disabled'));
      assert.ok(html.includes('game-card--soon'));
      assert.ok(!html.includes('<a '));
      assert.ok(!html.includes('href='));
      assert.ok(!html.includes('Jouer'));
    });

    await t.test('a locked card stays locked even if marked coming soon', () => {
      const html = render({ name: 'Poker', locked: true, unlockLevel: 12, comingSoon: true });
      assert.ok(html.includes('Niveau 12 requis'));
      assert.ok(html.includes('game-card--locked'));
      assert.ok(!html.includes('Bientôt'));
    });

    await t.test('a locked card without a valid level says "Verrouillé"', () => {
      for (const unlockLevel of [undefined, null, 0, -1, NaN, '3']) {
        const html = render({ name: 'Poker', locked: true, unlockLevel });
        assert.ok(html.includes('Verrouillé'));
        assert.ok(!html.includes('requis'));
      }
    });

    await t.test('a missing name falls back to "Jeu"', () => {
      for (const name of [undefined, '', '   ', 42]) {
        assert.ok(render({ name }).includes('Jeu'));
      }
    });

    await t.test('a locked card never exposes a click handler', () => {
      const onSelect = () => {};
      const tree = GameCard({ name: 'Poker', locked: true, unlockLevel: 12, onSelect });
      const handlers = findAll(tree, (el) => el.props.onClick !== undefined);
      assert.equal(handlers.length, 0);
    });

    await t.test('a playable card passes onSelect to its action', () => {
      const onSelect = () => {};
      const tree = GameCard({ name: 'Dice', onSelect });
      const actions = findAll(tree, (el) => el.props.onClick === onSelect);
      assert.equal(actions.length, 1);
    });

    await t.test('adds a custom class', () => {
      assert.ok(render({ name: 'Slots', className: 'custom' }).includes('game-card custom'));
    });
  } finally {
    await server.close();
  }
});
