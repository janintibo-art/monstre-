import { clamp } from '../core/rng.js';

// Les besoins vont de 0 (critique) a 100 (comble). Ils descendent tout seuls,
// a une vitesse modulee par la personnalite : un gourmand a faim plus vite.

export const NEEDS = ['hunger', 'energy', 'hygiene', 'fun', 'affection'];

export const NEED_LABELS = {
  hunger: 'Faim',
  energy: 'Énergie',
  hygiene: 'Propreté',
  fun: 'Jeu',
  affection: 'Affection'
};

// Points perdus par minute reelle.
const BASE_DECAY = {
  hunger: 1.35,
  energy: 0.85,
  hygiene: 0.6,
  fun: 1.1,
  affection: 0.9
};

export function createNeeds() {
  return { hunger: 80, energy: 85, hygiene: 90, fun: 70, affection: 75 };
}

function decayRate(key, personality) {
  const base = BASE_DECAY[key];
  switch (key) {
    case 'hunger':
      return base * (0.7 + personality.greed * 0.8);
    case 'energy':
      return base * (0.7 + personality.energy * 0.8);
    case 'fun':
      return base * (0.6 + personality.curiosity * 0.9);
    case 'affection':
      return base * (0.6 + personality.sociability * 0.9);
    default:
      return base;
  }
}

// dt en secondes. asleep : le sommeil recharge l'energie au lieu de la vider.
export function decayNeeds(needs, dtSeconds, personality, { asleep = false } = {}) {
  const minutes = dtSeconds / 60;
  NEEDS.forEach((key) => {
    if (key === 'energy' && asleep) {
      needs.energy = clamp(needs.energy + minutes * 9, 0, 100);
      return;
    }
    needs[key] = clamp(needs[key] - decayRate(key, personality) * minutes, 0, 100);
  });
  return needs;
}

export function applyEffects(needs, effects = {}) {
  Object.keys(effects).forEach((key) => {
    if (needs[key] === undefined) return;
    needs[key] = clamp(needs[key] + effects[key], 0, 100);
  });
  return needs;
}

export function lowestNeed(needs) {
  return NEEDS.reduce((worst, key) => (needs[key] < needs[worst] ? key : worst), NEEDS[0]);
}

export function wellbeing(needs) {
  return NEEDS.reduce((sum, key) => sum + needs[key], 0) / NEEDS.length;
}
