import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installEnv } from './_env.mjs';

installEnv();
const { createPet, advance, hatch, stageFor, STAGE_THRESHOLDS } = await import('../src/state/pet.js');
const { pickSpecies } = await import('../src/game/species.js');
const { pickBiome } = await import('../src/game/biomes.js');

test('la meme graine donne toujours la meme creature', () => {
  const a = createPet(2024);
  const b = createPet(2024);
  assert.deepEqual(a.genome, b.genome);
  assert.deepEqual(a.personality, b.personality);
  assert.equal(pickSpecies(2024).id, pickSpecies(2024).id);
  assert.equal(pickBiome(2024).id, pickBiome(2024).id);
});

test("l'oeuf murit seul et eclot au seuil exact", () => {
  const pet = createPet(1);
  advance(pet, 149);
  assert.ok(pet.hatchProgress < 1);
  advance(pet, 2);
  assert.equal(pet.hatchProgress, 1);
  assert.equal(pet.hatched, false, "advance ne fait pas eclore : c'est le jeu qui declenche");
  hatch(pet, 'Nyx');
  assert.equal(pet.hatched, true);
  assert.equal(pet.stage, 'baby');
  assert.equal(pet.growth, 0);
});

test('les stades sont atteints aux limites exactes', () => {
  STAGE_THRESHOLDS.forEach((s, i) => {
    assert.equal(stageFor(s.growth), s.stage);
    if (i > 0) assert.equal(stageFor(s.growth - 1), STAGE_THRESHOLDS[i - 1].stage);
  });
});

test('les besoins restent entre 0 et 100 apres douze heures', () => {
  const pet = hatch(createPet(5), 'Test');
  advance(pet, 12 * 3600);
  Object.values(pet.needs).forEach((v) => {
    assert.ok(v >= 0 && v <= 100 && Number.isFinite(v));
  });
});

test('dormir recharge l energie au lieu de la vider', () => {
  const pet = hatch(createPet(6), 'Test');
  pet.needs.energy = 40;
  advance(pet, 600, { asleep: true });
  assert.ok(pet.needs.energy > 40);
});

test('un monstre neglige grandit moins vite', () => {
  const happy = hatch(createPet(8), 'A');
  const sad = hatch(createPet(8), 'B');
  Object.keys(sad.needs).forEach((k) => {
    sad.needs[k] = 10;
  });
  advance(happy, 3600);
  advance(sad, 3600);
  assert.ok(happy.growth > sad.growth);
});

test('le tirage couvre tout le catalogue, pas deux entrées sur cinq', async () => {
  const { SPECIES, pickSpecies } = await import('../src/game/species.js');
  const { BIOMES, pickBiome } = await import('../src/game/biomes.js');

  // Les graines viennent de Date.now() : deux œufs créés à quelques minutes
  // d'intervalle ont des graines voisines. Le générateur doit malgré tout les
  // répartir, sinon toute une famille se retrouve avec la même créature.
  function repartition(pick, catalogue) {
    const vus = new Map();
    const base = Date.now();
    for (let i = 0; i < 600; i += 1) vus.set(pick(base + i * 1000).id, true);
    return vus.size;
  }

  assert.equal(repartition(pickSpecies, SPECIES), SPECIES.length, 'espèces mal réparties');
  assert.equal(repartition(pickBiome, BIOMES), BIOMES.length, 'décors mal répartis');
});
