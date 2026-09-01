import { createRng } from '../core/rng.js';

// Le genome : ce que la graine determine de l'apparence. Module pur, sans
// dependance au rendu, pour que la couche d'etat reste testable sans Three.js.
// Meme graine, meme genome, toujours.

export function createGenome(seed) {
  const rng = createRng(seed);
  return {
    seed,
    hue: rng(),
    saturation: 0.42 + rng() * 0.3,
    horns: Math.floor(rng() * 3), // 0, 1 ou 2 cornes
    ears: rng() > 0.45,
    tailSegments: 3 + Math.floor(rng() * 3),
    spots: 3 + Math.floor(rng() * 5),
    stubby: rng() > 0.5
  };
}
