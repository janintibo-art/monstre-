import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installEnv } from './_env.mjs';

installEnv();
const { migrate, normalize, parseImport, load, sanitizeName, exportSave } = await import(
  '../src/state/save.js'
);
const { createPet, SAVE_VERSION } = await import('../src/state/pet.js');

test('une sauvegarde ancienne est migree, jamais jetee', () => {
  const v2 = { ...createPet(12345), version: 2, name: 'Pipou', hatched: true, stage: 'child' };
  delete v2.species;
  const pet = migrate(v2);
  assert.equal(pet.version, SAVE_VERSION);
  assert.equal(pet.name, 'Pipou');
  assert.equal(typeof pet.species, 'string');
});

test('les valeurs corrompues sont ramenees dans les bornes', () => {
  const pet = normalize({
    ...createPet(7),
    hatched: true,
    needs: { hunger: -50, energy: 'abc', hygiene: 999, fun: NaN },
    age: -10,
    name: 'x'.repeat(200),
    stage: 'dragon'
  });
  assert.equal(pet.needs.hunger, 0);
  assert.equal(pet.needs.energy, 85);
  assert.equal(pet.needs.hygiene, 100);
  assert.equal(pet.needs.fun, 70);
  assert.equal(pet.age, 0);
  assert.equal(pet.name.length, 16);
  assert.equal(pet.stage, 'baby');
});

test('un oeuf non eclos ne peut pas etre adulte', () => {
  assert.equal(normalize({ ...createPet(9), hatched: false, stage: 'adult' }).stage, 'egg');
});

test('le genome se reconstruit depuis la graine, meme corrompu', () => {
  const pet = normalize({ ...createPet(11), genome: { hue: 'rouge' } });
  assert.equal(typeof pet.genome.hue, 'number');
  assert.equal(pet.genome.seed, 11);
});

test('import : fichier casse, fichier sans monstre, fichier valide', () => {
  assert.ok(parseImport('{pas du json').error);
  assert.ok(parseImport('{"a":1}').error);
  const file = exportSave(createPet(42));
  assert.equal(parseImport(file).pet.seed, 42);
});

test('une ancienne cle est relue avec copie de secours', () => {
  localStorage.clear();
  localStorage.setItem('monstre.save.v3', JSON.stringify({ ...createPet(77), version: 3, name: 'Ancien' }));
  const result = load();
  assert.equal(result.pet.name, 'Ancien');
  assert.equal(result.migrated, true);
  assert.ok(localStorage.getItem('monstre.save.secours'));
  assert.ok(localStorage.getItem('monstre.save'));
});

test('une date dans le futur ne produit pas de rattrapage negatif', () => {
  const pet = normalize({ ...createPet(3), lastSeen: Date.now() + 1e9 });
  assert.ok(pet.lastSeen <= Date.now() + 5 * 60 * 1000 + 1);
});

test('sanitizeName : vide, espaces, controle', () => {
  assert.equal(sanitizeName('   '), 'Nyx');
  assert.equal(sanitizeName('Bo\u0000b'), 'Bob');
  assert.equal(sanitizeName(42), 'Nyx');
});

test('une créature existante ne change ni d’apparence ni de paysage', async () => {
  const { pickBiomeLegacy } = await import('../src/game/biomes.js');

  // Sauvegarde d'avant la correction du générateur : son génome et son décor
  // avaient été tirés avec l'ancienne version.
  const ancienne = {
    ...createPet(4242),
    version: 4,
    name: 'Nyx',
    hatched: true,
    genome: { seed: 4242, hue: 0.11, saturation: 0.6, horns: 2, ears: true, tailSegments: 4, spots: 5, stubby: false }
  };
  delete ancienne.biome;

  const migre = migrate(ancienne);
  assert.equal(migre.genome.hue, 0.11, 'la couleur a changé');
  assert.equal(migre.genome.horns, 2, 'la morphologie a changé');
  assert.equal(migre.biome, pickBiomeLegacy(4242).id, 'le paysage a changé');
  assert.equal(migre.species, ancienne.species, 'l’espèce a changé');
});

test('un génome abîmé est reconstruit, un génome valide est gardé', () => {
  const casse = normalize({ ...createPet(7), genome: { hue: 'rouge' } });
  assert.ok(Number.isFinite(casse.genome.hue));

  const bon = normalize({ ...createPet(7), genome: { hue: 0.42, saturation: 0.5 } });
  assert.equal(bon.genome.hue, 0.42);
});
