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

test('chaque décor a ses trois horizons', async () => {
  const { BIOMES, HORIZON_MOMENTS, horizonUrl } = await import('../src/game/biomes.js');
  BIOMES.forEach((biome) => {
    assert.ok(biome.folder, `${biome.id} : dossier d’horizon non défini`);
    HORIZON_MOMENTS.forEach((moment) => {
      const chemin = horizonUrl(biome, moment, './public/');
      assert.ok(existsSync(chemin), `${biome.id} / ${moment} : image absente (${chemin})`);
    });
  });
});

test('les images d’horizon ont bien un haut transparent', async () => {
  const { readFileSync } = await import('node:fs');
  const { BIOMES, horizonUrl } = await import('../src/game/biomes.js');
  // Un PNG sans canal alpha masquerait le ciel et les étoiles. On vérifie le
  // type de couleur dans l'en-tête IHDR : 6 = RVB + alpha, 4 = gris + alpha.
  BIOMES.forEach((biome) => {
    const donnees = readFileSync(horizonUrl(biome, 'midi', './public/'));
    assert.equal(donnees.toString('ascii', 12, 16), 'IHDR', `${biome.id} : PNG invalide`);
    const typeCouleur = donnees[25];
    assert.ok([4, 6].includes(typeCouleur), `${biome.id} : image sans transparence`);
  });
});

test('le code ne force jamais le sens des faces sur les modèles', async () => {
  const { readFileSync } = await import('node:fs');
  // Les modèles Meshy déclarent `doubleSided: true` parce que la simplification
  // du maillage inverse le sens de certaines faces. Forcer FrontSide efface
  // toutes celles qui pointent « vers l'intérieur » — près de la moitié du
  // feuillage d'un arbre. Le trou dans la canopée vient de là.
  ['src/game/decor.js', 'src/game/gltf.js'].forEach((fichier) => {
    const lignes = readFileSync(fichier, 'utf8')
      .split('\n')
      .filter((l) => !l.trim().startsWith('//'));
    lignes.forEach((ligne) => {
      assert.ok(
        !/material\.side\s*=/.test(ligne),
        `${fichier} : le sens des faces est forcé — laisser le modèle décider`
      );
    });
  });
});

test('les modèles de décor sont opaques et à double face', async () => {
  const { readFileSync } = await import('node:fs');
  ['arbre', 'plante', 'champignon'].forEach((nom) => {
    const donnees = readFileSync(`public/assets/models/decor/${nom}.glb`);
    const longueur = donnees.readUInt32LE(12);
    const json = JSON.parse(donnees.toString('utf8', 20, 20 + longueur));
    const materiau = json.materials[0];
    assert.equal(materiau.doubleSided, true, `${nom} : faces simples, trous probables`);
    assert.ok(
      !materiau.alphaMode || materiau.alphaMode === 'OPAQUE',
      `${nom} : transparence déclarée, tri des faces hasardeux`
    );
  });
});

test('aucun décor ne dépasse le budget de triangles d’un téléphone', async () => {
  const { readFileSync } = await import('node:fs');
  const { BIOMES, DECOR_MODELS } = await import('../src/game/biomes.js');

  function triangles(fichier) {
    const donnees = readFileSync(`./public/${fichier}`);
    const longueur = donnees.readUInt32LE(12);
    const json = JSON.parse(donnees.toString('utf8', 20, 20 + longueur));
    const primitive = json.meshes[0].primitives[0];
    return json.accessors[primitive.indices].count / 3;
  }

  const cout = {};
  Object.entries(DECOR_MODELS).forEach(([nom, fichier]) => {
    cout[nom] = triangles(fichier);
  });

  // Un million de triangles par image, en double face, met à genoux un
  // téléphone de milieu de gamme. Le rang lointain avait fait passer le
  // sous-bois à 1,6 million : c'est ce que ce test empêche de reproduire.
  BIOMES.forEach((biome) => {
    const total = biome.decor.reduce((somme, d) => somme + cout[d.model] * d.count, 0);
    assert.ok(
      total < 1_000_000,
      `${biome.id} : ${Math.round(total / 1000)}k triangles de décor, c’est trop pour un téléphone`
    );
  });
});

test('le rang lointain utilise bien les modèles allégés', async () => {
  const { BIOMES } = await import('../src/game/biomes.js');
  BIOMES.forEach((biome) => {
    biome.decor.forEach((d) => {
      if (d.radius[0] >= 12 && !d.altitude && !d.landmark) {
        assert.match(d.model, /_loin$/, `${biome.id} : « ${d.model} » au loin en pleine résolution`);
      }
    });
  });
});

test('chaque décor a sa maison et son île, et les modèles existent', async () => {
  const { BIOMES, DECOR_MODELS } = await import('../src/game/biomes.js');

  BIOMES.forEach((biome) => {
    const reperes = biome.decor.filter((d) => d.landmark);
    assert.equal(reperes.length, 1, `${biome.id} : il faut une maison et une seule`);
    // Un repère tiré au hasard ne serait pas un repère : la créature doit y
    // aller dormir et le joueur doit le retrouver au même endroit.
    assert.equal(reperes[0].sway, 0, `${biome.id} : la maison se balance`);
    assert.equal(
      reperes[0].radius[0],
      reperes[0].radius[1],
      `${biome.id} : la maison change de place d’une partie à l’autre`
    );
    assert.ok(typeof reperes[0].angle === 'number', `${biome.id} : angle de la maison non fixé`);

    const ciel = biome.decor.filter((d) => d.altitude);
    assert.ok(ciel.length >= 1, `${biome.id} : rien dans le ciel`);
    ciel.forEach((d) => assert.ok(d.orbit > 0, `${biome.id} : objet du ciel immobile`));

    biome.decor.forEach((d) => {
      assert.ok(DECOR_MODELS[d.model], `${biome.id} : modèle inconnu « ${d.model} »`);
      assert.ok(
        existsSync(`./public/${DECOR_MODELS[d.model]}`),
        `${biome.id} : fichier absent pour « ${d.model} »`
      );
    });
  });
});
