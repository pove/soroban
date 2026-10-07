/**
 * localStorage wrapper that never throws: private browsing, disabled storage and corrupted JSON
 * all degrade to "nothing saved".
 */

function getStore() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Reads and parses a JSON value, or returns `fallback` when missing or unreadable. */
export function readJSON(key, fallback = null) {
  try {
    const raw = getStore()?.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** @returns {boolean} whether the value was stored */
export function writeJSON(key, value) {
  try {
    getStore()?.setItem(key, JSON.stringify(value));
    return getStore() !== null;
  } catch {
    return false;
  }
}

export function readString(key, fallback = null) {
  try {
    return getStore()?.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeString(key, value) {
  try {
    getStore()?.setItem(key, value);
  } catch {
    // ignore: persistence is best effort
  }
}
