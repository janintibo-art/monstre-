import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

// Le module natif ne se compile pas ici : ces tests vérifient sa présence et sa
// cohérence, ce qui aurait suffi à attraper les deux pannes de la v31 — un
// dossier exclu par .gitignore, puis un compilateur Kotlin non déclaré.

const RACINE = 'plugins/monstre-overlay';

test('tous les fichiers du module sont présents', () => {
  [
    'package.json',
    'src/index.js',
    'android/build.gradle',
    'android/src/main/AndroidManifest.xml',
    'android/src/main/assets/monstre_overlay.html',
    'android/src/main/java/com/monstre/overlay/OverlayPlugin.kt',
    'android/src/main/java/com/monstre/overlay/OverlayService.kt',
    'android/src/main/java/com/monstre/overlay/AlarmReceiver.kt'
  ].forEach((f) => {
    assert.ok(existsSync(`${RACINE}/${f}`), `absent : ${f}`);
  });
});

test('.gitignore n’exclut pas le code natif du module', () => {
  const lignes = readFileSync('.gitignore', 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  // Un motif « android/ » sans barre oblique de tête s'applique à tous les
  // niveaux : il exclurait plugins/monstre-overlay/android/ en silence.
  lignes.forEach((motif) => {
    if (motif.startsWith('!')) return;
    const nu = motif.replace(/\/$/, '');
    assert.ok(
      !(nu === 'android' || nu === 'ios'),
      `« ${motif} » doit être ancré à la racine : /${motif}`
    );
  });
});

test('le module Kotlin déclare son propre compilateur', () => {
  const gradle = readFileSync(`${RACINE}/android/build.gradle`, 'utf8');
  // Le projet Android engendré par Capacitor n'embarque pas Kotlin : sans ces
  // deux lignes, les .kt ne sont jamais compilés.
  assert.match(gradle, /kotlin-gradle-plugin/, 'compilateur Kotlin non déclaré');
  assert.match(gradle, /apply plugin: 'kotlin-android'/, 'greffon kotlin-android absent');
  assert.match(gradle, /capacitor-android/, 'dépendance Capacitor absente');
});

test('le manifeste déclare le service et les récepteurs', () => {
  const manifeste = readFileSync(`${RACINE}/android/src/main/AndroidManifest.xml`, 'utf8');
  ['OverlayService', 'AlarmReceiver', 'BootReceiver'].forEach((classe) => {
    assert.match(manifeste, new RegExp(classe), `${classe} non déclaré`);
  });
  ['SYSTEM_ALERT_WINDOW', 'SCHEDULE_EXACT_ALARM', 'FOREGROUND_SERVICE'].forEach((perm) => {
    assert.match(manifeste, new RegExp(perm), `permission ${perm} absente`);
  });
});

test('chaque espèce a sa planche de marche', async () => {
  const { SPECIES } = await import('../src/game/species.js');
  SPECIES.forEach((s) => {
    assert.ok(
      existsSync(`public/assets/sprites/${s.folder}.png`),
      `planche manquante pour ${s.id} (${s.folder})`
    );
  });
});
