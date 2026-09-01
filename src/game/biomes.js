import { createRng } from '../core/rng.js';

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
    name: 'Prairie',
    ground: 'assets/textures/ground/prairie.jpg',
    repeat: 3,
    accent: 0x6fe3c4,
    mood: 0x2f7a4a,
    moodMix: 0.16,
    decor: [
      { model: 'arbre', count: 5, radius: [7.5, 10], height: [3.6, 5.4], sway: 0.02 },
      { model: 'plante', count: 7, radius: [6.4, 8.6], height: [0.7, 1.2], sway: 0.045 },
      { model: 'champignon', count: 4, radius: [6.2, 8], height: [0.4, 0.7], sway: 0.008 }
    ]
  },
  {
    id: 'mousse',
    name: 'Sous-bois',
    ground: 'assets/textures/ground/mousse.jpg',
    repeat: 3,
    accent: 0x59f0d6,
    mood: 0x1d6a68,
    moodMix: 0.26,
    decor: [
      { model: 'arbre', count: 7, radius: [7, 9.6], height: [4, 6], sway: 0.022 },
      { model: 'champignon', count: 9, radius: [6, 8.4], height: [0.5, 1.1], sway: 0.01 },
      { model: 'plante', count: 6, radius: [6.2, 8.2], height: [0.8, 1.4], sway: 0.05 }
    ]
  },
  {
    id: 'roche',
    name: 'Éboulis',
    ground: 'assets/textures/ground/roche.jpg',
    repeat: 2.5,
    accent: 0xa98bff,
    mood: 0x5a3f7a,
    moodMix: 0.22,
    decor: [
      { model: 'arbre', count: 2, radius: [8, 10], height: [3.2, 4.4], sway: 0.018 },
      { model: 'champignon', count: 6, radius: [6.2, 8.6], height: [0.5, 0.9], sway: 0.008 },
      { model: 'plante', count: 3, radius: [6.4, 8], height: [0.6, 1], sway: 0.04 }
    ]
  },
  {
    id: 'terre',
    name: 'Terre sèche',
    ground: 'assets/textures/ground/terre.jpg',
    repeat: 3,
    accent: 0xffc48a,
    mood: 0x8a5a30,
    moodMix: 0.18,
    decor: [
      { model: 'arbre', count: 3, radius: [7.6, 10], height: [3, 4.6], sway: 0.025 },
      { model: 'plante', count: 4, radius: [6.4, 8.4], height: [0.6, 1], sway: 0.05 },
      { model: 'champignon', count: 2, radius: [6.4, 8], height: [0.4, 0.6], sway: 0.008 }
    ]
  }
];

// Les modeles de decor disponibles. Chaque decor pioche dedans avec ses propres
// quantites, rayons, hauteurs et amplitudes de balancement.
export const DECOR_MODELS = {
  arbre: 'assets/models/decor/arbre.glb',
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

export function resolveBiome(seed) {
  const pref = loadBiomePreference();
  return pref === 'auto' ? pickBiome(seed) : biomeById(pref);
}
