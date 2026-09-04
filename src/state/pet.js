import { createNeeds, decayNeeds, wellbeing } from '../ai/needs.js';
import { createPersonality } from '../ai/personality.js';
import { createMemory, ensureMemory, consolidate } from '../ai/memory.js';
import { createGenome } from '../ai/genome.js';
import { pickSpecies, especeConnue, speciesById, temperamentOf } from '../game/species.js';
import { pickBiome } from '../game/biomes.js';

export const SAVE_VERSION = 5;

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

// Applique les décalages du tempérament, en gardant chaque trait entre 0 et 1.
function appliquerTemperament(traits, species) {
  const biais = temperamentOf(species).biais;
  const sortie = { ...traits };
  Object.entries(biais).forEach(([trait, decalage]) => {
    if (sortie[trait] === undefined) return;
    sortie[trait] = Math.max(0.05, Math.min(0.95, sortie[trait] + decalage));
  });
  return sortie;
}

// `especeVoulue` vient de la boutique : quand le joueur a choisi son prochain
// œuf, on ne tire plus au sort. Sans choix, le hasard reprend la main.
export function createPet(seed = Date.now() >>> 0, especeVoulue = null) {
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
    species: especeConnue(especeVoulue) ? especeVoulue : pickSpecies(seed).id,
    biome: pickBiome(seed).id,
    genome: createGenome(seed),
    needs: createNeeds(),
    // Le caractère part du tirage, puis se décale selon le tempérament de
    // l'espèce. Ce n'est qu'un point de départ : les soins continuent de le
    // faire évoluer, sinon on ne choisirait pas un compagnon, on le
    // subirait.
    personality: appliquerTemperament(
      createPersonality(seed),
      especeConnue(especeVoulue) ? speciesById(especeVoulue) : pickSpecies(seed)
    ),
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

// `foyer` porte les apports des compagnons : voir src/state/compagnons.js.
export function advance(pet, dtSeconds, { asleep = false, foyer = null } = {}) {
  if (!pet.hatched) {
    // L'oeuf mûrit tout seul en deux minutes et demie. Le stimuler va bien plus
    // vite : une dizaine de tapes suffisent.
    pet.hatchProgress = Math.min(1, pet.hatchProgress + dtSeconds / 150);
    pet.age += dtSeconds;
    return pet;
  }
  pet.age += dtSeconds;
  decayNeeds(pet.needs, dtSeconds, pet.personality, { asleep, foyer });
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
