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
    trees: 7
  },
  {
    id: 'mousse',
    name: 'Sous-bois',
    ground: 'assets/textures/ground/mousse.jpg',
    repeat: 3,
    accent: 0x59f0d6,
    mood: 0x1d6a68,
    moodMix: 0.26,
    trees: 9
  },
  {
    id: 'roche',
    name: 'Éboulis',
    ground: 'assets/textures/ground/roche.jpg',
    repeat: 2.5,
    accent: 0xa98bff,
    mood: 0x5a3f7a,
    moodMix: 0.22,
    trees: 3
  },
  {
    id: 'terre',
    name: 'Terre sèche',
    ground: 'assets/textures/ground/terre.jpg',
    repeat: 3,
    accent: 0xffc48a,
    mood: 0x8a5a30,
    moodMix: 0.18,
    trees: 4
  }
];

export const TREE_MODEL = 'assets/models/decor/arbre_1.glb';

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
