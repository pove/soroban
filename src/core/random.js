/**
 * Random helpers. Every function takes an injectable `rng` (a `() => number` in [0, 1)) so tests
 * can make results deterministic; production code uses `Math.random`.
 */

/** Integer in [lo, hi], both inclusive. */
export function randInt(lo, hi, rng = Math.random) {
  return Math.floor(rng() * (hi - lo + 1)) + lo;
}

/** Up to `count` distinct integers in [lo, hi] (fewer when the range is too small). */
export function uniqueInts(lo, hi, count, rng = Math.random) {
  const total = hi - lo + 1;
  const target = Math.min(count, total);
  const found = new Set();
  const maxAttempts = total * 3;
  for (let attempts = 0; found.size < target && attempts < maxAttempts; attempts++) {
    found.add(randInt(lo, hi, rng));
  }
  return [...found];
}

/** Picks one element of a non-empty array. */
export function pick(items, rng = Math.random) {
  return items[Math.floor(rng() * items.length)];
}

/** Small seedable PRNG (mulberry32) for reproducible sequences in tests and samples. */
export function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
