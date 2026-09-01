import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { installEnv } from './_env.mjs';

installEnv();
const { SPECIES, pickSpecies, eggUrl, stageUrl } = await import('../src/game/species.js');

const STAGES = ['baby', 'child', 'teen', 'adult'];

// Un fichier manquant ne casse pas le jeu — il retombe sur la créature générée
// par code — mais le joueur ne verrait jamais l'espèce qu'on lui a promise.
// Ce test attrape une faute de frappe dans le catalogue avant la mise en ligne.
test('chaque espèce a bien ses fichiers sur le disque', () => {
  SPECIES.forEach((species) => {
    const egg = eggUrl(species, './public/');
    assert.ok(existsSync(egg), `${species.id} : œuf introuvable (${egg})`);

    STAGES.forEach((stage) => {
      const url = stageUrl(species, stage, './public/');
      assert.ok(url, `${species.id} : aucun modèle pour le stade ${stage}`);
      assert.ok(existsSync(url), `${species.id} / ${stage} : fichier introuvable (${url})`);
    });
  });
});

test('les identifiants et dossiers sont uniques', () => {
  const ids = SPECIES.map((s) => s.id);
  const folders = SPECIES.map((s) => s.folder);
  assert.equal(new Set(ids).size, ids.length, 'identifiant en double');
  assert.equal(new Set(folders).size, folders.length, 'dossier en double');
});

test('un stade sans modèle propre reprend le précédent', () => {
  const species = SPECIES.find((s) => !s.stages.adult);
  assert.ok(species, 'aucune espèce sans modèle adulte pour tester le repli');
  assert.equal(
    stageUrl(species, 'adult', './public/'),
    stageUrl(species, species.stages.teen ? 'teen' : 'baby', './public/')
  );
});

test('le tirage de l’espèce est déterministe et couvre le catalogue', () => {
  assert.equal(pickSpecies(1234).id, pickSpecies(1234).id);
  const vus = new Set();
  for (let seed = 1; seed <= 400; seed += 1) vus.add(pickSpecies(seed).id);
  assert.equal(vus.size, SPECIES.length, 'certaines espèces ne sortent jamais');
});
