import { createRng } from '../core/rng.js';

// Catalogue des especes. Chaque espece a son oeuf et un modele par stade de vie.
// Un stade sans modele propre reprend celui du stade precedent, ce qui permet
// d'ajouter une espece avec un seul modele et de l'etoffer plus tard.
//
// Pour ajouter une espece : depose tes .glb dans public/assets/models/<id>/ et
// ajoute une entree ici. Rien d'autre a modifier.

export const SPECIES = [
  {
    id: 'gigglehorn',
    name: 'Gigglehorn',
    folder: 'gigglehorn',
    egg: 'oeuf.glb',
    stages: {
      baby: 'jeune.glb'
    }
  },
  {
    id: 'moonberry',
    name: 'Moonberry',
    folder: 'moonberry',
    egg: 'oeuf.glb',
    stages: {
      baby: 'jeune.glb',
      teen: 'vieux.glb'
    }
  }
];

const ORDER = ['baby', 'child', 'teen', 'adult'];

export function speciesById(id) {
  return SPECIES.find((s) => s.id === id) || SPECIES[0];
}

// L'espece decoule de la graine : le meme oeuf donnera toujours la meme
// creature, et la sauvegarde reste reconstructible.
export function pickSpecies(seed) {
  const rng = createRng(seed + 31337);
  return SPECIES[Math.floor(rng() * SPECIES.length) % SPECIES.length];
}

export function eggUrl(species, base = import.meta.env.BASE_URL || './') {
  return `${base}assets/models/${species.folder}/${species.egg}`;
}

// Remonte la liste des stades jusqu'a en trouver un qui a un modele.
export function stageUrl(species, stage, base = import.meta.env.BASE_URL || './') {
  const start = Math.max(0, ORDER.indexOf(stage));
  for (let i = start; i >= 0; i -= 1) {
    const file = species.stages[ORDER[i]];
    if (file) return `${base}assets/models/${species.folder}/${file}`;
  }
  return null;
}
