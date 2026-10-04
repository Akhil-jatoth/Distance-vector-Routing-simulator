/**
 * Deterministic pseudo-random number generator (Mulberry32).
 * Provides repeatable pseudo-random numbers in [0, 1) given a specific seed.
 *
 * @param {number|string} [seed=1] - Numeric or string seed.
 * @returns {() => number} Random generator function returning a float in [0, 1).
 */
export function createRandom(seed = 1) {
  let s = 0;
  if (typeof seed === 'string') {
    for (let i = 0; i < seed.length; i++) {
      s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    }
  } else {
    s = (Number(seed) || 1) >>> 0;
  }
  if (s === 0) s = 1;

  return function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
