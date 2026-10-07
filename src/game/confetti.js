/**
 * Celebration effects (canvas-confetti). Each effect is a list of timed bursts, so adding or
 * tweaking one means editing data, not control flow. Two effects (rain, tornado) emit bursts
 * every animation frame and are described as small loops.
 */
import confetti from 'canvas-confetti';

export const SURPRISE_POOL = [2, 3, 4, 5, 6, 7, 8, 9, 10];

const RAINBOW = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
const GREENS = ['#8bc34a', '#4caf50', '#cddc39'];
const GOLDS = ['#ffd700', '#ffed4e', '#fff44f'];
const FLAT = (...shapes) => Object.fromEntries(shapes.map((shape) => [shape, { flat: true }]));

/** Emoji particles for a given power multiplier. */
function createShapes(power) {
  const emoji = (text, scalar) => confetti.shapeFromText({ text, scalar: scalar * power });
  return {
    dinosaur: emoji('🦕', 5),
    trex: emoji('🦖', 5),
    star: emoji('⭐', 4),
    rocket: emoji('🚀', 4),
    rainbow: emoji('🌈', 4),
    pizza: emoji('🍕', 4),
    unicorn: emoji('🦄', 5),
  };
}

/**
 * Burst lists per effect number. `delay` (ms) is consumed by the scheduler, the rest goes to
 * canvas-confetti. `n(count)` applies the power multiplier to particle counts.
 */
const BURSTS = {
  1: ({ n, p }) => [
    { particleCount: n(30), spread: 50, origin: { y: 0.7 }, scalar: 0.8 * p, gravity: 1.2 },
  ],

  2: ({ n, p }) => [
    {
      particleCount: n(100),
      spread: 70,
      origin: { y: 0.8 },
      scalar: p,
      colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42'],
    },
  ],

  3: ({ n, p, s }) => [
    {
      particleCount: n(120),
      spread: 360,
      origin: { y: 0.6 },
      scalar: 1.5 * p,
      shapes: [s.star],
      shapeOptions: FLAT(s.star),
      colors: GOLDS,
      ticks: 300,
      gravity: 0.6,
      drift: 2,
    },
  ],

  4: ({ n, p, s }) => [
    {
      particleCount: n(60),
      spread: 120,
      origin: { y: 0.6 },
      scalar: 2 * p,
      shapes: [s.dinosaur, s.trex],
      shapeOptions: FLAT(s.dinosaur, s.trex),
      colors: GREENS,
      gravity: 0.8,
      ticks: 400,
    },
    {
      delay: 200,
      particleCount: n(40),
      spread: 100,
      origin: { y: 0.3, x: 0.5 },
      shapes: [s.dinosaur, s.trex],
      shapeOptions: FLAT(s.dinosaur, s.trex),
      scalar: 1.5 * p,
      gravity: 0.9,
    },
  ],

  5: ({ n, p }) =>
    RAINBOW.map((color, i) => ({
      delay: i * 80,
      particleCount: n(50),
      spread: 60,
      origin: { y: 0.7, x: i * 0.15 + 0.05 },
      colors: [color],
      scalar: 1.3 * p,
      angle: 90,
      gravity: 1,
    })),

  8: ({ n, p, s }) => [
    {
      particleCount: n(20),
      spread: 200,
      origin: { y: 0.7, x: 0.5 },
      gravity: 0.7,
      scalar: 3 * p,
      startVelocity: 65,
      shapes: [s.dinosaur, s.trex, s.star, s.rocket],
      shapeOptions: FLAT(s.dinosaur, s.trex, s.star, s.rocket),
      colors: RAINBOW,
      ticks: 400,
      drift: 3,
    },
    {
      delay: 100,
      particleCount: n(20),
      spread: 150,
      origin: { y: 0.1, x: 0.5 },
      gravity: 0.6,
      scalar: 6 * p,
      shapes: [s.dinosaur, s.trex],
      shapeOptions: FLAT(s.dinosaur, s.trex),
      colors: [...GREENS, '#ffeb3b'],
      ticks: 500,
    },
    {
      delay: 200,
      particleCount: n(10),
      spread: 120,
      origin: { y: 0.9, x: 0.1 },
      angle: 60,
      scalar: 5 * p,
      shapes: [s.rocket, s.star],
      shapeOptions: FLAT(s.rocket, s.star),
      colors: ['#ff6b6b', '#ffd93d', '#6bcf7f'],
      startVelocity: 60,
    },
    {
      delay: 300,
      particleCount: n(10),
      spread: 120,
      origin: { y: 0.9, x: 0.9 },
      angle: 120,
      scalar: 6 * p,
      shapes: [s.rocket, s.star],
      shapeOptions: FLAT(s.rocket, s.star),
      colors: ['#ff6b6b', '#ffd93d', '#6bcf7f'],
      startVelocity: 60,
    },
    {
      delay: 400,
      particleCount: n(10),
      spread: 360,
      origin: { y: 0.5, x: 0.5 },
      gravity: 0.5,
      scalar: 7 * p,
      shapes: [s.star],
      shapeOptions: FLAT(s.star),
      colors: [...GOLDS, '#ff69b4'],
      ticks: 450,
      startVelocity: 40,
    },
  ],

  9: ({ n, p, s }) => [
    {
      particleCount: n(80),
      spread: 180,
      origin: { y: 0.5, x: 0.5 },
      gravity: 0.8,
      scalar: 2 * p,
      startVelocity: 50,
      shapes: [s.pizza, s.unicorn, s.rainbow],
      shapeOptions: FLAT(s.pizza, s.unicorn, s.rainbow),
      colors: ['#ff69b4', '#ff1493', '#00bfff', '#7fff00'],
      ticks: 350,
    },
    {
      delay: 120,
      particleCount: n(25),
      spread: 100,
      origin: { y: 0.8, x: 0.2 },
      angle: 45,
      scalar: 1.5 * p,
      colors: RAINBOW,
    },
    {
      delay: 240,
      particleCount: n(25),
      spread: 100,
      origin: { y: 0.8, x: 0.8 },
      angle: 135,
      scalar: 1.5 * p,
      colors: RAINBOW,
    },
  ],

  10: ({ n, p, s }) => [
    {
      particleCount: n(150),
      spread: 200,
      origin: { y: 0.7, x: 0.5 },
      gravity: 0.7,
      scalar: 3 * p,
      startVelocity: 65,
      shapes: [s.dinosaur, s.trex, s.star, s.rocket],
      shapeOptions: FLAT(s.dinosaur, s.trex, s.star, s.rocket),
      colors: RAINBOW,
      ticks: 400,
      drift: 3,
    },
    {
      delay: 100,
      particleCount: n(80),
      spread: 150,
      origin: { y: 0.1, x: 0.5 },
      gravity: 0.6,
      scalar: 2.5 * p,
      shapes: [s.dinosaur, s.trex],
      shapeOptions: FLAT(s.dinosaur, s.trex),
      colors: [...GREENS, '#ffeb3b'],
      ticks: 500,
    },
    {
      delay: 200,
      particleCount: n(70),
      spread: 120,
      origin: { y: 0.9, x: 0.1 },
      angle: 60,
      scalar: 2.2 * p,
      shapes: [s.rocket, s.star],
      shapeOptions: FLAT(s.rocket, s.star),
      colors: ['#ff6b6b', '#ffd93d', '#6bcf7f'],
      startVelocity: 60,
    },
    {
      delay: 300,
      particleCount: n(70),
      spread: 120,
      origin: { y: 0.9, x: 0.9 },
      angle: 120,
      scalar: 2.2 * p,
      shapes: [s.rocket, s.star],
      shapeOptions: FLAT(s.rocket, s.star),
      colors: ['#ff6b6b', '#ffd93d', '#6bcf7f'],
      startVelocity: 60,
    },
    {
      delay: 400,
      particleCount: n(100),
      spread: 360,
      origin: { y: 0.5, x: 0.5 },
      gravity: 0.5,
      scalar: 2.8 * p,
      shapes: [s.star],
      shapeOptions: FLAT(s.star),
      colors: [...GOLDS, '#ff69b4'],
      ticks: 450,
      startVelocity: 40,
    },
  ],
};

/** Effects that emit a burst on every animation frame for a fixed duration. */
const LOOPS = {
  6: {
    // rain
    duration: 3000,
    burst: ({ n, p }) => ({
      particleCount: n(3),
      angle: 90,
      spread: 30,
      origin: { x: Math.random(), y: 0 },
      colors: ['#87ceeb', '#4682b4', '#1e90ff'],
      gravity: 1.5,
      scalar: 0.8 * p,
      ticks: 400,
      decay: 0.92,
    }),
  },
  7: {
    // tornado
    duration: 2000,
    burst: ({ n, p }, frame) => ({
      particleCount: n(5),
      spread: 360,
      origin: { x: 0.5 + Math.cos(frame * 0.3) * 0.3, y: 0.5 + Math.sin(frame * 0.3) * 0.3 },
      startVelocity: 25 * p,
      gravity: 0.5,
      scalar: 1.2 * p,
      colors: ['#9c27b0', '#e91e63', '#f44336'],
      ticks: 200,
    }),
  },
};

/**
 * Plans what the "surprise" mode launches: either one boosted effect or a combo of 2-3 different
 * effects 400 ms apart. Pure, so the randomness can be injected.
 * @returns {{ effect: number, power: number, delay: number }[]}
 */
export function planSurprise(rng = Math.random) {
  const pickEffect = () => SURPRISE_POOL[Math.floor(rng() * SURPRISE_POOL.length)];

  if (rng() <= 0.5) return [{ effect: pickEffect(), power: 1.5, delay: 0 }];

  const count = Math.floor(rng() * 2) + 2;
  const chosen = [];
  while (chosen.length < count) {
    const effect = pickEffect();
    if (!chosen.includes(effect)) chosen.push(effect);
  }
  return chosen.map((effect, i) => ({ effect, power: 1, delay: i * 400 }));
}

function launchEffect(effect, power = 1) {
  const ctx = { p: power, n: (count) => Math.floor(count * power), s: createShapes(power) };

  const loop = LOOPS[effect];
  if (loop) {
    const end = Date.now() + loop.duration;
    let frame = 0;
    const tick = () => {
      confetti(loop.burst(ctx, frame++));
      if (Date.now() < end) requestAnimationFrame(tick);
    };
    tick();
    return;
  }

  for (const { delay = 0, ...options } of BURSTS[effect]?.(ctx) ?? []) {
    if (delay > 0) setTimeout(() => confetti(options), delay);
    else confetti(options);
  }
}

/**
 * Runs the celebration for a confetti mode ('0'-'10' or 'surprise'). Mode '0' is the sad
 * "no confetti" option.
 */
export function celebrate(mode, rng = Math.random) {
  if (mode === 'surprise') {
    for (const { effect, power, delay } of planSurprise(rng)) {
      if (delay > 0) setTimeout(() => launchEffect(effect, power), delay);
      else launchEffect(effect, power);
    }
    return;
  }
  const effect = Number.parseInt(mode, 10);
  if (effect > 0) launchEffect(effect);
}
