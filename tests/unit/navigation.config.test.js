// Unit tests - navigation configuration (src/config/navigation.config.js)
// Verifies the declarative route list: item shape, unique ids / paths, and
// the presence of all core pages.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { NAV_ITEMS, NOT_FOUND_PATH } from '../../src/config/navigation.config.js';

test('NAV_ITEMS is a non-empty list', () => {
  assert.ok(Array.isArray(NAV_ITEMS));
  assert.ok(NAV_ITEMS.length > 0);
});

test('every navigation item has { id, path, label }', () => {
  for (const item of NAV_ITEMS) {
    assert.equal(typeof item.id, 'string');
    assert.ok(item.id.length > 0);
    assert.equal(typeof item.path, 'string');
    assert.ok(item.path.startsWith('/'), `path must start with "/": ${item.path}`);
    assert.equal(typeof item.label, 'string');
    assert.ok(item.label.length > 0);
  }
});

test('navigation ids are unique', () => {
  const ids = NAV_ITEMS.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('navigation paths are unique', () => {
  const paths = NAV_ITEMS.map((item) => item.path);
  assert.equal(new Set(paths).size, paths.length);
});

test('the lobby is the home route', () => {
  const lobby = NAV_ITEMS.find((item) => item.id === 'lobby');
  assert.ok(lobby, 'lobby entry must exist');
  assert.equal(lobby.path, '/');
});

test('the core pages are all declared', () => {
  const ids = new Set(NAV_ITEMS.map((item) => item.id));
  const expected = ['game', 'profile', 'progression', 'leaderboard', 'shop', 'statistics', 'admin'];
  for (const id of expected) {
    assert.ok(ids.has(id), `missing navigation entry: ${id}`);
  }
});

test('NOT_FOUND_PATH is declared', () => {
  assert.equal(typeof NOT_FOUND_PATH, 'string');
  assert.ok(NOT_FOUND_PATH.length > 0);
});
