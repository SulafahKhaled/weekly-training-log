import confetti from 'canvas-confetti';

export function celebrate(colors = ['#7c93ff', '#49d6ac', '#f5ac3c']) {
  const defaults = { origin: { y: 0.7 }, colors, disableForReducedMotion: true };
  confetti({ ...defaults, particleCount: 60, spread: 65, startVelocity: 38 });
  setTimeout(() => confetti({ ...defaults, particleCount: 40, spread: 100, startVelocity: 28, scalar: 0.85 }), 150);
}
