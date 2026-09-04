import { createRng } from '../core/rng.js';

// Catalogue des especes. Chaque espece a son oeuf et un modele par stade de vie.
// Un stade sans modele propre reprend celui du stade precedent, ce qui permet
// d'ajouter une espece avec un seul modele et de l'etoffer plus tard.
//
// Pour ajouter une espece : depose tes .glb dans public/assets/models/<id>/ et
// ajoute une entree ici. Rien d'autre a modifier.

// Tempéraments.
//
// Chaque espèce naît avec un penchant. Ce n'est pas un caractère figé — les
// traits continuent d'évoluer selon les soins — mais un point de départ : deux
// créatures élevées de la même façon ne se ressemblent pas si elles ne sont pas
// de la même espèce.
//
// Les valeurs sont des DÉCALAGES appliqués aux traits, entre -0,25 et +0,25.
// Au-delà, le tempérament écraserait tout ce que le joueur construit ensuite,
// et c'est l'inverse du but : on choisit un tempérament, on élève un caractère.
export const TEMPERAMENTS = {
  joyeux: {
    label: 'joyeux',
    phrase: 'Toujours de bonne humeur.',
    biais: { curiosity: 0.12, sociability: 0.22, energy: 0.15, shyness: -0.18 }
  },
  grognon: {
    label: 'grognon',
    phrase: 'Ronchonne pour la forme, mais reste.',
    biais: { sociability: -0.18, greed: 0.15, energy: -0.1, shyness: 0.08 }
  },
  timide: {
    label: 'timide',
    phrase: 'Met du temps à faire confiance.',
    biais: { shyness: 0.25, sociability: -0.12, curiosity: 0.08 }
  },
  curieux: {
    label: 'curieux',
    phrase: 'Veut tout inspecter.',
    biais: { curiosity: 0.25, energy: 0.12, shyness: -0.08 }
  },
  gourmand: {
    label: 'gourmand',
    phrase: 'Pense souvent à manger.',
    biais: { greed: 0.25, sociability: 0.1, energy: -0.08 }
  },
  calme: {
    label: 'calme',
    phrase: 'Ne s’agite jamais pour rien.',
    biais: { energy: -0.2, shyness: 0.05, sociability: 0.1 }
  },
  espiegle: {
    label: 'espiègle',
    phrase: 'Cherche toujours à jouer.',
    biais: { energy: 0.25, curiosity: 0.15, sociability: 0.12, shyness: -0.15 }
  },
  reveur: {
    label: 'rêveur',
    phrase: 'A la tête ailleurs.',
    biais: { curiosity: 0.15, energy: -0.15, shyness: 0.12 }
  }
};

export function temperamentOf(species) {
  return TEMPERAMENTS[species && species.temperament] || TEMPERAMENTS.joyeux;
}

export const SPECIES = [
  {
    id: 'gigglehorn',
    temperament: 'espiegle',
    name: 'Gigglehorn',
    folder: 'gigglehorn',
    egg: 'oeuf.glb',
    stages: {
      baby: 'jeune.glb'
    }
  },
  {
    id: 'moonberry',
    temperament: 'reveur',
    name: 'Moonberry',
    folder: 'moonberry',
    egg: 'oeuf.glb',
    stages: {
      baby: 'jeune.glb',
      teen: 'vieux.glb'
    }
  },
  {
    id: 'braisillon',
    temperament: 'curieux',
    name: 'Braisillon',
    folder: 'rouge',
    egg: 'oeuf.glb',
    stages: {
      baby: 'jeune.glb',
      teen: 'vieux.glb'
    }
  },
  {
    id: 'sylvanou',
    temperament: 'calme',
    name: 'Sylvanou',
    folder: 'vert',
    egg: 'oeuf.glb',
    stages: {
      baby: 'jeune.glb',
      teen: 'vieux.glb'
    }
  },
  {
    id: 'ondinelle',
    temperament: 'timide',
    name: 'Ondinelle',
    folder: 'bleu',
    egg: 'oeuf.glb',
    stages: {
      baby: 'jeune.glb',
      teen: 'vieux.glb'
    }
  },
  {
    id: 'gemmelin',
    temperament: 'grognon',
    name: 'Gemmelin',
    folder: 'gemmelin',
    egg: 'oeuf.glb',
    stages: { baby: 'jeune.glb', teen: 'vieux.glb' }
  },
  {
    id: 'bouffenuage',
    temperament: 'joyeux',
    name: 'Bouffenuage',
    folder: 'bouffenuage',
    egg: 'oeuf.glb',
    stages: { baby: 'jeune.glb', teen: 'vieux.glb' }
  },
  {
    id: 'nocturnelle',
    temperament: 'reveur',
    name: 'Nocturnelle',
    folder: 'nocturnelle',
    egg: 'oeuf.glb',
    stages: { baby: 'jeune.glb', teen: 'vieux.glb' }
  },
  {
    id: 'scarabin',
    temperament: 'grognon',
    name: 'Scarabin',
    folder: 'scarabin',
    egg: 'oeuf.glb',
    stages: { baby: 'jeune.glb', teen: 'vieux.glb' }
  },
  {
    id: 'champillon',
    temperament: 'gourmand',
    name: 'Champillon',
    folder: 'champillon',
    egg: 'oeuf.glb',
    stages: { baby: 'jeune.glb', teen: 'vieux.glb' }
  },
  {
    id: 'etincelou',
    temperament: 'espiegle',
    name: 'Étincelou',
    folder: 'etincelou',
    egg: 'oeuf.glb',
    stages: { baby: 'jeune.glb', teen: 'vieux.glb' }
  }
];

const ORDER = ['baby', 'child', 'teen', 'adult'];

// Repli permissif : une sauvegarde abîmée ne doit pas laisser une créature sans
// modèle. Pour VÉRIFIER qu'un identifiant existe, utiliser `especeConnue` :
// celle-ci renvoie toujours quelque chose, elle ne dit donc jamais non.
export function speciesById(id) {
  return SPECIES.find((s) => s.id === id) || SPECIES[0];
}

export function especeConnue(id) {
  return SPECIES.some((s) => s.id === id);
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
