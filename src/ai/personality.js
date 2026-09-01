import { createRng, clamp } from '../core/rng.js';

// Cinq traits entre 0 et 1. Ils naissent du genome puis derivent lentement
// selon la maniere dont on s'occupe du monstre : c'est la part "elevage".

export const TRAITS = ['curiosity', 'sociability', 'greed', 'energy', 'shyness'];

export const TRAIT_LABELS = {
  curiosity: 'curieux',
  sociability: 'sociable',
  greed: 'gourmand',
  energy: 'énergique',
  shyness: 'timide'
};

export function createPersonality(seed) {
  const rng = createRng(seed + 42);
  const p = {};
  TRAITS.forEach((t) => {
    p[t] = 0.25 + rng() * 0.5;
  });
  return p;
}

// Derive bornee : on ne peut pas transformer completement un caractere,
// seulement l'infléchir. Les bornes evitent les monstres degeneres.
export function nudge(personality, trait, amount) {
  if (personality[trait] === undefined) return personality;
  personality[trait] = clamp(personality[trait] + amount, 0.05, 0.95);
  return personality;
}

export function dominantTrait(personality) {
  return TRAITS.reduce((best, t) => (personality[t] > personality[best] ? t : best), TRAITS[0]);
}

export function describe(personality) {
  const sorted = [...TRAITS].sort((a, b) => personality[b] - personality[a]);
  return `${TRAIT_LABELS[sorted[0]]} et plutôt ${TRAIT_LABELS[sorted[1]]}`;
}
