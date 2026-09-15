// ---------------------------------------------------------------------------
// Core - Storage / Save (mock)
// ---------------------------------------------------------------------------
// Exports and imports a save file with an integrity hash.
//
// NOTE: the integrity hash algorithm below is a DOCUMENTED PLACEHOLDER. The
// final algorithm is an open decision (see README - "Decisions techniques
// encore ouvertes"). It is intentionally dependency-free (no server, no
// external crypto library).
// ---------------------------------------------------------------------------

import { getState } from './state.js';

const SAVE_VERSION = 1;

/**
 * PLACEHOLDER integrity hash (FNV-1a, 32-bit). Deterministic and dependency-
 * free, but NOT cryptographically secure. To be replaced by the final
 * algorithm decided by the team.
 *
 * @param {string} input
 * @returns {string} hex digest.
 */
export function computeIntegrityHash(input) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Builds a save file content (JSON string) embedding the state and its
 * integrity hash.
 *
 * @returns {string} JSON string shaped as { version, hash, data }.
 */
export function exportSave() {
  const data = getState();
  const payload = JSON.stringify(data);
  return JSON.stringify({
    version: SAVE_VERSION,
    hash: computeIntegrityHash(payload),
    data,
  });
}

/**
 * Validates and reads a save file content.
 *
 * Recomputes the integrity hash and compares it with the stored one. Throws
 * if the save is invalid or corrupted / tampered with.
 *
 * @param {string} fileContent - JSON string produced by exportSave().
 * @returns {object} the parsed state data.
 * @throws {Error} if the content is invalid or the hash does not match.
 */
export function importSave(fileContent) {
  let parsed;
  try {
    parsed = JSON.parse(fileContent);
  } catch {
    throw new Error('importSave: invalid save content (not JSON).');
  }
  const { hash, data } = parsed;
  const expected = computeIntegrityHash(JSON.stringify(data));
  if (hash !== expected) {
    throw new Error('importSave: integrity check failed (corrupted save).');
  }
  return data;
}