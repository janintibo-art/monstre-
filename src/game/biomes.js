import { createRng } from '../core/rng.js';

// Les décors. Chacun definit son sol, l'ambiance lumineuse qui va avec et le
// nombre d'arbres plantes autour de l'aire de jeu.
//
// La lumiere compte autant que la texture : une prairie verte sous la meme
// lumiere bleutee qu'un sol rocheux violet paraitrait fausse. Chaque decor
// reteinte donc le ciel, le brouillard et la lampe d'appoint.

export const BIOMES = [
  {
    id: 'prairie',
    name: 'Prairie',
    ground: 'assets/textures/ground/prairie.jpg',
    repeat: 3,
    sky: ['#20406a', '#0a1620'],
    fog: 0x0c1a20,
    hemiSky: 0xbfe9ff,
    hemiGround: 0x2f5a34,
    key: 0xfff3dc,
    rim: 0x6fe3c4,
    ring: 0x9dffd0,
    trees: 7
  },
  {
    id: 'mousse',
    name: 'Sous-bois',
    ground: 'assets/textures/ground/mousse.jpg',
    repeat: 3,
    sky: ['#123a4a', '#06131c'],
    fog: 0x08171f,
    hemiSky: 0x8ff0e0,
    hemiGround: 0x1d4a48,
    key: 0xe8fff6,
    rim: 0x59f0d6,
    ring: 0x7dffe8,
    trees: 9
  },
  {
    id: 'roche',
    name: 'Éboulis',
    ground: 'assets/textures/ground/roche.jpg',
    repeat: 2.5,
    sky: ['#2a2350', '#0d0a1c'],
    fog: 0x120e26,
    hemiSky: 0xd0b6ff,
    hemiGround: 0x4a3358,
    key: 0xffe6f2,
    rim: 0xa98bff,
    ring: 0xc9a8ff,
    trees: 3
  },
  {
    id: 'terre',
    name: 'Terre sèche',
    ground: 'assets/textures/ground/terre.jpg',
    repeat: 3,
    sky: ['#3a3050', '#14101c'],
    fog: 0x1a1420,
    hemiSky: 0xffe0b0,
    hemiGround: 0x5a4028,
    key: 0xfff0d0,
    rim: 0x6fe3c4,
    ring: 0x9fe8d0,
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
