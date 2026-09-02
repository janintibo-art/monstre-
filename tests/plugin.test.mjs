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

test('les versions du SDK sont résolues hors du bloc android', () => {
  const gradle = readFileSync(`${RACINE}/android/build.gradle`, 'utf8');
  const bloc = gradle.slice(gradle.indexOf('android {'), gradle.indexOf('repositories {'));

  // Dans `android { }`, le nom `compileSdkVersion` désigne une méthode dépréciée
  // du greffon Android, pas la variable du projet. Groovy résout la méthode,
  // et Gradle échoue en affirmant que la version n'est pas spécifiée.
  ['compileSdkVersion', 'minSdkVersion', 'targetSdkVersion'].forEach((nom) => {
    assert.ok(
      !bloc.includes(nom),
      `« ${nom} » ne doit pas apparaître dans le bloc android : il y désigne une méthode, pas une valeur`
    );
  });

  assert.match(gradle, /compileSdk monstreCompileSdk/, 'version de compilation non fixée');
  assert.match(gradle, /minSdk monstreMinSdk/, 'version minimale non fixée');
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

test('le Kotlin n’utilise que des accesseurs qui existent vraiment', () => {
  const source = readFileSync(
    `${RACINE}/android/src/main/java/com/monstre/overlay/OverlayPlugin.kt`,
    'utf8'
  );

  // `JSObject` hérite de org.json.JSONObject et n'expose pas `getInteger` ni
  // `getLong` — contrairement à `PluginCall`, qui lui ressemble beaucoup. La
  // confusion coûte une compilation entière.
  const lignes = source.split('\n').filter((l) => !l.trim().startsWith('//'));
  lignes.forEach((ligne) => {
    ['data?.getInteger', 'data.getInteger', 'data?.getLong', 'data.getLong'].forEach((interdit) => {
      assert.ok(
        !ligne.includes(interdit),
        `accesseur inexistant sur JSObject : ${interdit} — utiliser optInt / optLong`
      );
    });
  });
});

test('les appels réservés aux versions récentes d’Android sont protégés', () => {
  const source = readFileSync(
    `${RACINE}/android/src/main/java/com/monstre/overlay/OverlayService.kt`,
    'utf8'
  );
  // Notification.Builder(contexte, canal) demande Android 8. La version
  // minimale du module est plus basse : l'appel doit être encadré.
  if (source.includes('Notification.Builder(this, CHANNEL_ID)')) {
    assert.match(
      source,
      /Build\.VERSION\.SDK_INT >= Build\.VERSION_CODES\.O[\s\S]{0,200}Notification\.Builder\(this, CHANNEL_ID\)/,
      'constructeur de notification non protégé par une vérification de version'
    );
  }
});

test('les calques s’empilent dans le bon ordre', () => {
  // Les commentaires sont retirés d'abord : ce fichier en contient qui citent
  // des sélecteurs pour les expliquer, et une recherche naïve tombait dessus.
  const css = readFileSync('src/styles.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  function couche(selecteur) {
    const debut = css.indexOf(selecteur + ' {');
    assert.ok(debut >= 0, `sélecteur introuvable : ${selecteur}`);
    const bloc = css.slice(debut, css.indexOf('}', debut));
    const trouve = bloc.match(/z-index:\s*(\d+)/);
    return trouve ? Number(trouve[1]) : 0;
  }

  // Un panneau doit pouvoir s'afficher par-dessus l'écran de démarrage : le
  // choix de profil est posé avant que le jeu ne commence. Sans ça, la question
  // reste invisible et l'application attend une réponse impossible à donner.
  assert.ok(
    couche('.panel') > couche('.boot'),
    'les panneaux passent sous l’écran de démarrage : le choix de profil serait inaccessible'
  );
  // Le voile de flash et la bannière d'erreur restent au-dessus de tout.
  assert.ok(couche('.flash') > couche('.panel'), 'le voile de flash passe sous les panneaux');
  assert.ok(couche('.fatal') > couche('.flash'), 'la bannière d’erreur n’est pas au premier plan');
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

test('les appels smoothstep des shaders ont leurs bornes en ordre croissant', () => {
  // La spécification GLSL déclare le résultat indéfini si la première borne est
  // supérieure ou égale à la seconde. Certains pilotes renvoient alors 1
  // partout — un fondu localisé devient un voile sur toute la surface, et le
  // décor disparaît sans le moindre message d'erreur.
  ['src/game/world.js', 'src/game/vfx.js'].forEach((fichier) => {
    const source = readFileSync(fichier, 'utf8');
    const appels = source.match(/smoothstep\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,/g) || [];
    appels.forEach((appel) => {
      const [, a, b] = appel.match(/smoothstep\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,/);
      assert.ok(
        Number(a) < Number(b),
        `${fichier} : smoothstep(${a}, ${b}, …) — bornes à l’envers, résultat indéfini`
      );
    });
  });
});
