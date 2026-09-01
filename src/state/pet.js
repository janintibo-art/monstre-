import { createNeeds, decayNeeds, wellbeing } from '../ai/needs.js';
import { createPersonality } from '../ai/personality.js';
import { createMemory, ensureMemory, consolidate } from '../ai/memory.js';
import { createGenome } from '../game/monster.js';
import { pickSpecies } from '../game/species.js';

export const SAVE_VERSION = 3;

// Seuils de croissance, en "secondes de bien-etre" : un monstre neglige
// grandit moins vite qu'un monstre choye. La croissance n'est pas qu'un timer.
export const STAGE_THRESHOLDS = [
  { stage: 'baby', growth: 0 },
  { stage: 'child', growth: 45 * 60 },
  { stage: 'teen', growth: 4 * 3600 },
  { stage: 'adult', growth: 16 * 3600 }
];

export function stageFor(growth) {
  let stage = 'baby';
  STAGE_THRESHOLDS.forEach((s) => {
    if (growth >= s.growth) stage = s.stage;
  });
  return stage;
}

export const STAGE_LABELS = {
  egg: 'incubation',
  baby: 'nouveau-né',
  child: 'jeune',
  teen: 'adolescent',
  adult: 'adulte'
};

export function createPet(seed = Date.now() >>> 0) {
  return {
    version: SAVE_VERSION,
    seed,
    name: 'Œuf',
    stage: 'egg',
    hatched: false,
    hatchProgress: 0,
    taps: 0,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    age: 0,
    growth: 0,
    species: pickSpecies(seed).id,
    genome: createGenome(seed),
    needs: createNeeds(),
    personality: createPersonality(seed),
    memory: createMemory()
  };
}

// Fait avancer la simulation de dtSeconds. Utilise aussi pour rattraper le
// temps ecoule pendant que l'application etait fermee.
// Complete une memoire ancienne et efface ce qui est tombe dans l'oubli.
export function refreshMemory(pet) {
  pet.memory = ensureMemory(pet.memory);
  consolidate(pet.memory);
  return pet;
}

export function advance(pet, dtSeconds, { asleep = false } = {}) {
  if (!pet.hatched) {
    // L'oeuf mûrit tout seul en deux minutes et demie. Le stimuler va bien plus
    // vite : une dizaine de tapes suffisent.
    pet.hatchProgress = Math.min(1, pet.hatchProgress + dtSeconds / 150);
    pet.age += dtSeconds;
    return pet;
  }
  pet.age += dtSeconds;
  decayNeeds(pet.needs, dtSeconds, pet.personality, { asleep });
  pet.growth += dtSeconds * (wellbeing(pet.needs) / 100);
  const next = stageFor(pet.growth);
  if (next !== pet.stage) pet.stage = next;
  return pet;
}

export function hatch(pet, name) {
  pet.hatched = true;
  pet.hatchProgress = 1;
  pet.stage = 'baby';
  pet.name = name || 'Nyx';
  pet.growth = 0;
  return pet;
}
