import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installEnv } from './_env.mjs';

installEnv();
const Q = await import('../src/game/quality.js');

test('les préréglages vont bien du plus léger au plus lourd', () => {
  const e = Q.qualityPreset('economy');
  const n = Q.qualityPreset('normal');
  const b = Q.qualityPreset('beautiful');

  [['pixelRatio', 'résolution'], ['cloudStrength', 'nuages'], ['particleScale', 'particules']].forEach(
    ([champ, nom]) => {
      assert.ok(e[champ] < n[champ] && n[champ] <= b[champ], `${nom} : ordre incohérent`);
    }
  );
  assert.ok(e.decorDensity < n.decorDensity, 'la densité de décor ne baisse pas en Économie');
});

test('Auto ne choisit jamais le niveau maximal', () => {
  const cas = [
    { deviceMemory: 16, hardwareConcurrency: 12, devicePixelRatio: 2 },
    { deviceMemory: 8, hardwareConcurrency: 8, devicePixelRatio: 3 },
    {}
  ];
  cas.forEach((env) => {
    assert.notEqual(Q.resolveQuality('auto', env), 'beautiful', 'Auto choisit Magnifique');
  });
});

test('une densité d’écran élevée ne condamne pas un bon téléphone', () => {
  // Tous les téléphones haut de gamme dépassent 3 : en faire un signe de
  // faiblesse revenait à les rétrograder tous.
  const bon = { deviceMemory: 8, hardwareConcurrency: 8, devicePixelRatio: 3.5 };
  assert.equal(Q.resolveQuality('auto', bon), 'normal');

  // Elle ne compte que lorsqu'on ne sait rien d'autre de l'appareil.
  assert.equal(Q.resolveQuality('auto', { devicePixelRatio: 3.5 }), 'economy');
  assert.equal(Q.resolveQuality('auto', { deviceMemory: 3 }), 'economy');
});

test('un choix manuel est toujours respecté', () => {
  ['economy', 'normal', 'beautiful'].forEach((niveau) => {
    assert.equal(Q.resolveQuality(niveau, { deviceMemory: 2 }), niveau);
  });
});

test('la mesure de fluidité ne rejette que de vrais gels', () => {
  const source = readFileSync('src/main.js', 'utf8');
  const seuil = Number((source.match(/const PAUSE_MS = ([\d.]+)/) || [])[1]);

  // À 80 ms, le filtre écartait tout ce qui tourne sous 12,5 images par
  // seconde — c'est-à-dire exactement les appareils qu'il fallait aider.
  assert.ok(seuil >= 0.3, `seuil de ${seuil} s : les appareils très lents seraient ignorés`);

  // Et rien ne doit être mesuré pendant le chargement initial : juger la
  // machine sur son pire instant la condamnerait pour toute la session.
  assert.match(source, /const CHAUFFE = \d+/, 'aucune période de chauffe');
  assert.match(source, /perfChauffe/, 'la chauffe n’est pas appliquée');
});

test('les étapes du workflow de publication sont bien séparées', () => {
  // Une commande sur plusieurs lignes doit être introduite par `run: |`.
  // Sans lui, YAML replie tout sur une seule ligne : le patch du manifeste, le
  // chmod et Gradle devenaient une instruction unique et invalide. Le défaut
  // ne se voyait pas : ce workflow ne se déclenche que sur une étiquette.
  ['.github/workflows/release.yml', '.github/workflows/build.yml'].forEach((fichier) => {
    const lignes = readFileSync(fichier, 'utf8').split('\n');
    lignes.forEach((ligne, i) => {
      // `run: |` et `run: >` introduisent justement un bloc de plusieurs
      // lignes : ce sont les formes correctes, pas celles qu'on cherche.
      const simple = ligne.match(/^(\s*)run:\s*([^|>\s]\S*.*)$/);
      if (!simple) return;
      const indent = simple[1].length;
      const suivante = lignes[i + 1] || '';
      const suite = suivante.match(/^(\s*)(\S)/);
      // Une ligne qui suit un `run:` simple, plus indentée et qui n'est ni un
      // commentaire ni une clé, est une commande orpheline.
      if (!suite) return;
      const orpheline = suite[1].length > indent && !/^[-#]/.test(suite[2]) && !/:\s*($|\S)/.test(suivante.trim());
      assert.ok(!orpheline, `${fichier}:${i + 2} : commande rattachée à un run: sans « | »`);
    });
  });
});

test('même en Magnifique, aucun décor ne devient déraisonnable', async () => {
  const { BIOMES, DECOR_MODELS } = await import('../src/game/biomes.js');
  const { QUALITY_PRESETS } = await import('../src/game/quality.js');

  function triangles(fichier) {
    const donnees = readFileSync(`./public/${fichier}`);
    const longueur = donnees.readUInt32LE(12);
    const json = JSON.parse(donnees.toString('utf8', 20, 20 + longueur));
    let total = 0;
    json.meshes.forEach((mesh) => {
      mesh.primitives.forEach((p) => {
        total +=
          p.indices !== undefined
            ? json.accessors[p.indices].count / 3
            : json.accessors[p.attributes.POSITION].count / 3;
      });
    });
    return total;
  }

  const cout = {};
  Object.entries(DECOR_MODELS).forEach(([nom, fichier]) => {
    cout[nom] = triangles(fichier);
  });

  const densite = QUALITY_PRESETS.beautiful.decorDensity;

  BIOMES.forEach((biome) => {
    const total = biome.decor.reduce((somme, d) => {
      // Maison, feu et île ne suivent pas la densité : ils sont toujours là.
      const critique = d.landmark || d.feu || d.altitude;
      const n = critique ? d.count : Math.max(1, Math.round(d.count * densite));
      return somme + cout[d.model] * n;
    }, 0);

    // Le plafond de base garde le niveau Normal ; celui-ci évite que le niveau
    // maximal dérive sans qu'on s'en aperçoive. « Magnifique » est un choix
    // volontaire, pas une permission de tout charger.
    assert.ok(
      total < 900_000,
      `${biome.id} en Magnifique : ${Math.round(total / 1000)}k triangles`
    );
  });
});
