import { createRng, createLegacyRng } from '../core/rng.js';

// Les décors. Chacun definit son sol, sa couleur d'accent, la teinte qu'il
// donne a l'atmosphere et le nombre d'arbres plantes autour de l'aire de jeu.
//
// Le decor ne fixe PAS la lumiere : c'est le cycle jour/nuit qui la calcule.
// Un decor qui imposerait son ambiance donnerait un sous-bois nocturne en plein
// midi. Il ne fait que teinter le ciel et le brouillard de sa `mood`, a hauteur
// de `moodMix` — assez pour qu'on reconnaisse le lieu, pas assez pour nier
// l'heure qu'il est.

export const BIOMES = [
  {
    id: 'prairie',
    folder: 'prairie',
    name: 'Prairie',
    ground: 'assets/textures/ground/prairie.jpg',
    repeat: 3,
    accent: 0x6fe3c4,
    mood: 0x2f7a4a,
    moodMix: 0.16,
    decor: [
      // La maison est un repère : toujours au même endroit, jamais tirée au
      // hasard. C'est là que la créature va dormir.
      { model: 'maison', count: 1, radius: [6.4, 6.4], height: [2.4, 2.4], sway: 0, landmark: true, angle: -0.85 },
      // L'île dérive lentement dans le ciel. Elle donne au décor une profondeur
      // que le sol seul ne peut pas produire.
      { model: 'ile', count: 1, radius: [17, 17], height: [5.5, 5.5], altitude: [10, 10], orbit: 0.012, sway: 0 },
      { model: 'arbre', count: 5, radius: [7.5, 10], height: [3.6, 5.4], sway: 0.02 },
      { model: 'plante', count: 7, radius: [6.4, 8.6], height: [0.7, 1.2], sway: 0.045 },
      { model: 'champignon', count: 4, radius: [6.2, 8], height: [0.4, 0.7], sway: 0.008 }
    ]
  },
  {
    id: 'mousse',
    folder: 'mousse',
    name: 'Sous-bois',
    ground: 'assets/textures/ground/mousse.jpg',
    repeat: 3,
    accent: 0x59f0d6,
    mood: 0x1d6a68,
    moodMix: 0.26,
    decor: [
      // La maison est un repère : toujours au même endroit, jamais tirée au
      // hasard. C'est là que la créature va dormir.
      { model: 'chaumiere', count: 1, radius: [6.4, 6.4], height: [2.4, 2.4], sway: 0, landmark: true, angle: -0.85 },
      // L'île dérive lentement dans le ciel. Elle donne au décor une profondeur
      // que le sol seul ne peut pas produire.
      { model: 'ile', count: 1, radius: [17, 17], height: [5.5, 5.5], altitude: [10, 10], orbit: 0.012, sway: 0 },
      { model: 'arbre', count: 7, radius: [7, 9.6], height: [4, 6], sway: 0.022 },
      { model: 'champignon', count: 9, radius: [6, 8.4], height: [0.5, 1.1], sway: 0.01 },
      { model: 'plante', count: 6, radius: [6.2, 8.2], height: [0.8, 1.4], sway: 0.05 }
    ]
  },
  {
    id: 'roche',
    folder: 'roche',
    name: 'Éboulis',
    ground: 'assets/textures/ground/roche.jpg',
    repeat: 2.5,
    accent: 0xa98bff,
    mood: 0x5a3f7a,
    moodMix: 0.22,
    decor: [
      // La maison est un repère : toujours au même endroit, jamais tirée au
      // hasard. C'est là que la créature va dormir.
      { model: 'maison', count: 1, radius: [6.4, 6.4], height: [2.4, 2.4], sway: 0, landmark: true, angle: -0.85 },
      // L'île dérive lentement dans le ciel. Elle donne au décor une profondeur
      // que le sol seul ne peut pas produire.
      { model: 'ile', count: 1, radius: [17, 17], height: [5.5, 5.5], altitude: [10, 10], orbit: 0.012, sway: 0 },
      { model: 'arbre', count: 2, radius: [8, 10], height: [3.2, 4.4], sway: 0.018 },
      { model: 'champignon', count: 6, radius: [6.2, 8.6], height: [0.5, 0.9], sway: 0.008 },
      { model: 'plante', count: 3, radius: [6.4, 8], height: [0.6, 1], sway: 0.04 }
    ]
  },
  {
    id: 'terre',
    folder: 'terre',
    name: 'Terre sèche',
    ground: 'assets/textures/ground/terre.jpg',
    repeat: 3,
    accent: 0xffc48a,
    mood: 0x8a5a30,
    moodMix: 0.18,
    decor: [
      // La maison est un repère : toujours au même endroit, jamais tirée au
      // hasard. C'est là que la créature va dormir.
      { model: 'chaumiere', count: 1, radius: [6.4, 6.4], height: [2.4, 2.4], sway: 0, landmark: true, angle: -0.85 },
      // L'île dérive lentement dans le ciel. Elle donne au décor une profondeur
      // que le sol seul ne peut pas produire.
      { model: 'ile', count: 1, radius: [17, 17], height: [5.5, 5.5], altitude: [10, 10], orbit: 0.012, sway: 0 },
      { model: 'arbre', count: 3, radius: [7.6, 10], height: [3, 4.6], sway: 0.025 },
      { model: 'plante', count: 4, radius: [6.4, 8.4], height: [0.6, 1], sway: 0.05 },
      { model: 'champignon', count: 2, radius: [6.4, 8], height: [0.4, 0.6], sway: 0.008 }
    ]
  }
];

// Les modeles de decor disponibles. Chaque decor pioche dedans avec ses propres
// quantites, rayons, hauteurs et amplitudes de balancement.
// Les trois moments de la journée pour chaque décor. On ne teinte pas une
// silhouette : on fond une image dans l'autre, ce qui rend la lumière du matin
// et celle du couchant bien plus justes qu'un filtre appliqué à la même image.
export const HORIZON_MOMENTS = ['matin', 'midi', 'soir'];

export function horizonUrl(biome, moment, base = import.meta.env.BASE_URL || './') {
  return `${base}assets/horizons/horizon_${biome.folder || biome.id}_${moment}.png`;
}

export const DECOR_MODELS = {
  arbre: 'assets/models/decor/arbre.glb',
  maison: 'assets/models/decor/maison.glb',
  chaumiere: 'assets/models/decor/chaumiere.glb',
  ile: 'assets/models/decor/ile.glb',
  plante: 'assets/models/decor/plante.glb',
  champignon: 'assets/models/decor/champignon.glb'
};

const PREF_KEY = 'monstre.decor';

export function biomeById(id) {
  return BIOMES.find((b) => b.id === id) || BIOMES[0];
}

// Par defaut le decor decoule de la graine : chaque oeuf a son paysage.
export function pickBiome(seed) {
  const rng = createRng(seed + 8081);
  return BIOMES[Math.floor(rng() * BIOMES.length) % BIOMES.length];
}

// Tirage tel qu'il etait avant la correction du generateur. Sert uniquement a
// retrouver le paysage d'une creature nee avant : le sien ne doit pas changer
// parce qu'on a corrige un bug.
export function pickBiomeLegacy(seed) {
  const rng = createLegacyRng(seed + 8081);
  return BIOMES[Math.floor(rng() * BIOMES.length) % BIOMES.length];
}

export function loadBiomePreference() {
  try {
    return localStorage.getItem(PREF_KEY) || 'auto';
  } catch {
    return 'auto';
  }
}

export function saveBiomePreference(value) {
  try {
    if (value && value !== 'auto') localStorage.setItem(PREF_KEY, value);
    else localStorage.removeItem(PREF_KEY);
  } catch {
    /* stockage indisponible */
  }
}

// Le paysage est enregistre dans la sauvegarde : une fois attribue, il ne bouge
// plus. On ne le recalcule que pour une creature qui n'en a pas encore.
export function resolveBiome(pet) {
  const pref = loadBiomePreference();
  if (pref !== 'auto') return biomeById(pref);
  if (pet && pet.biome) return biomeById(pet.biome);
  return pickBiome(pet && pet.seed ? pet.seed : 1);
}
