// Unit tests - architecture rules (static scan of /src)
// Enforces two absolute rules of AGENTS.md that are easy to break silently:
//  1. No Math.random() outside the Core RNG (src/core/rng.js).
//  2. No direct import of /src/core/* outside the Core itself and the
//     official facade (src/services/coreService.js).
//
// The scan is deliberately more permissive than the ESLint patterns (which
// only catch "src/core/*" and "../core/*"): it detects any path segment
// "core" in an import specifier, e.g. "../../core/state.js".

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_DIR = join(fileURLToPath(new URL('.', import.meta.url)), '../../src');

function listSourceFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      listSourceFiles(full, acc);
    } else if (/\.(js|jsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

const FILES = listSourceFiles(SRC_DIR);
const IMPORT_RE = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g;

function toPosix(path) {
  return path.split('\\').join('/');
}

function coreImportSpecifiers(content) {
  const found = [];
  for (const match of content.matchAll(IMPORT_RE)) {
    const spec = match[1];
    if (/^\.?\.?(\/|\.\/)?core(\/|$)|(^|\/)core(\/|$)/.test(spec)) {
      found.push(spec);
    }
  }
  return found;
}

test('the scan finds source files under /src', () => {
  assert.ok(FILES.length > 0, 'the scan must find at least one file under /src');
});

test('no Math.random() outside the Core RNG (absolute rule)', () => {
  const offenders = [];
  for (const file of FILES) {
    const rel = toPosix(relative(SRC_DIR, file));
    if (rel === 'core/rng.js') continue;
    const content = readFileSync(file, 'utf8');
    const codeWithoutComments = content
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^[ \t]*\/\/.*$/gm, '');
    if (codeWithoutComments.includes('Math.random(')) {
      offenders.push(rel);
    }
  }
  assert.deepEqual(offenders, [], `Math.random() found in: ${offenders.join(', ')}`);
});

test('no direct Core import outside the Core and the coreService facade', () => {
  const offenders = [];
  for (const file of FILES) {
    const rel = toPosix(relative(SRC_DIR, file));
    if (rel.startsWith('core/') || rel === 'services/coreService.js') continue;
    const content = readFileSync(file, 'utf8');
    const specs = coreImportSpecifiers(content);
    if (specs.length > 0) {
      offenders.push(`${rel} (${specs.join(', ')})`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `direct Core imports found in: ${offenders.join('; ')}`,
  );
});
