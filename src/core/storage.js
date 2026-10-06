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

import { getState, restoreState } from './state.js';

const SAVE_VERSION = 1;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

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
 * Validates a save file and restores its state.
 *
 * Validates the version and integrity hash before restoring the state to
 * memory and localStorage. Invalid saves leave the current state unchanged.
 *
 * @param {string} fileContent - JSON string produced by exportSave().
 * @returns {object} independent copy of the restored state.
 * @throws {Error} if the save is invalid, corrupted, or cannot be persisted.
 */
export function importSave(fileContent) {
  let parsed;
  try {
    parsed = JSON.parse(fileContent);
  } catch {
    throw new Error('importSave: invalid save content (not JSON).');
  }

  if (!isRecord(parsed) || parsed.version !== SAVE_VERSION) {
    throw new Error('importSave: unsupported or invalid save version.');
  }

  const { hash, data } = parsed;
  if (typeof hash !== 'string' || !isRecord(data)) {
    throw new Error('importSave: invalid save state.');
  }

  const expected = computeIntegrityHash(JSON.stringify(data));
  if (hash !== expected) {
    throw new Error('importSave: integrity check failed (corrupted save).');
  }

  return restoreState(data);
}
