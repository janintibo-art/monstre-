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

test('la bulle de dialogue reste positionnée à l’écran', () => {
  // Son emplacement est calculé en pixels par le jeu, depuis la projection de
  // la tête de la créature. Une règle qui la repasse en `position: relative`
  // la décale sans rien casser d'autre : le défaut passe inaperçu au relecteur
  // et saute aux yeux à l'usage.
  const css = readFileSync('src/styles.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const regles = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)];
  let position = null;
  regles.forEach(([, selecteurs, corps]) => {
    if (!selecteurs.split(',').some((s) => s.trim() === '.bubble')) return;
    const trouve = corps.match(/position:\s*(\w+)/);
    if (trouve) position = trouve[1];
  });
  assert.equal(position, 'fixed', 'la bulle doit rester en position fixe');
});

test('le flou d’arrière-plan reste réservé aux surfaces peu nombreuses', () => {
  // `backdrop-filter` oblige le navigateur à relire et flouter la scène sous
  // chaque élément, à chaque image. Au-dessus d'un rendu 3D, huit boutons qui
  // le demandent coûtent bien plus qu'un panneau qui le demande seul.
  const css = readFileSync('src/styles.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const regles = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)];
  const multiples = ['.pebble', '.choice', '.chip', '.game-card', '.agenda-item'];

  regles.forEach(([, selecteurs, corps]) => {
    if (!/backdrop-filter\s*:\s*(?!none)/.test(corps)) return;
    selecteurs.split(',').forEach((brut) => {
      const s = brut.trim();
      assert.ok(
        !multiples.includes(s),
        `${s} apparaît en plusieurs exemplaires : pas de flou d’arrière-plan dessus`
      );
    });
  });
});

test('chaque uniforme utilisé dans un shader y est aussi déclaré', () => {
  // Un identifiant employé sans déclaration fait échouer la compilation GLSL.
  // Three.js le signale dans la console, mais l'objet disparaît simplement de
  // la scène : aucun plantage, aucune trace visible. L'horizon a manqué pendant
  // quatre versions à cause d'un `uniform vec3 brume;` oublié.
  const source = readFileSync('src/game/world.js', 'utf8');

  const materiaux = [...source.matchAll(/new THREE\.ShaderMaterial\(\{[\s\S]*?\n  \}\);/g)];
  assert.ok(materiaux.length >= 2, 'aucun shader trouvé : le test ne vérifie rien');

  materiaux.forEach(([bloc]) => {
    const noms = [...bloc.matchAll(/^\s{6}(\w+):\s*\{\s*value:/gm)].map((m) => m[1]);
    const vertex = (bloc.match(/vertexShader:\s*`([\s\S]*?)`/) || [])[1] || '';
    const fragment = (bloc.match(/fragmentShader:\s*`([\s\S]*?)`/) || [])[1] || '';

    noms.forEach((nom) => {
      [
        ['vertex', vertex],
        ['fragment', fragment]
      ].forEach(([quel, code]) => {
        // On retire les commentaires : ils citent souvent les noms d'uniformes.
        const corps = code.replace(/\/\/.*/g, '');
        const utilise = new RegExp(`\\b${nom}\\b`).test(corps.replace(/uniform[^;]+;/g, ''));
        const declare = new RegExp(`uniform\\s+\\w+\\s+${nom}\\s*;`).test(corps);
        assert.ok(
          !utilise || declare,
          `shader ${quel} : « ${nom} » est utilisé mais jamais déclaré`
        );
      });
    });
  });
});

test('chaque décor définit ses propres particules', async () => {
  const { BIOMES } = await import('../src/game/biomes.js');
  const formes = new Set();
  BIOMES.forEach((biome) => {
    assert.ok(biome.particules, `${biome.id} : aucune particule définie`);
    const p = biome.particules;
    assert.ok(p.forme && p.couleur, `${biome.id} : forme ou couleur manquante`);
    assert.ok(Number.isFinite(p.chute), `${biome.id} : vitesse de chute invalide`);
    assert.ok(p.tourbillon > 0, `${biome.id} : aucun mouvement latéral`);
    formes.add(p.forme);
  });
  // Quatre décors avec la même particule ne se distingueraient pas.
  assert.equal(formes.size, BIOMES.length, 'plusieurs décors partagent la même particule');
});

test('l’ambiance sonore ne démarre jamais d’elle-même', () => {
  const source = readFileSync('src/main.js', 'utf8');
  // Les navigateurs l'interdisent tant que l'écran n'a pas été touché, et
  // surtout personne n'aime qu'une application se mette à faire du bruit.
  const appels = [...source.matchAll(/ambience\.demarrer\(\)/g)];
  assert.ok(appels.length >= 1, 'l’ambiance n’est jamais démarrée');

  const contexte = source.slice(0, source.indexOf('ambience.demarrer()'));
  assert.ok(
    /onPointerDown|unlock/.test(contexte.slice(-400)),
    'l’ambiance doit démarrer depuis un geste de l’utilisateur'
  );
});

test('l’horizon garde du contraste avec le ciel à toute heure', async () => {
  const source = readFileSync('src/game/daylight.js', 'utf8');
  const phases = [...source.matchAll(
    /name: '([^']+)',\s*skyTop: (0x[0-9a-f]+),\s*skyBottom: (0x[0-9a-f]+),\s*fog: (0x[0-9a-f]+)[\s\S]*?stars: ([\d.]+),\s*sun: (0x[0-9a-f]+)/g
  )];
  assert.ok(phases.length >= 6, 'palette du cycle introuvable');

  const rgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  const melange = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const NUIT = rgb(0x2c3a5c);

  phases.forEach(([, nom, , bas, brume, etoiles, soleil]) => {
    const ciel = rgb(parseInt(bas, 16));
    const st = Number(etoiles);
    const proche = melange(rgb(parseInt(brume, 16)), ciel, 0.15).map((v) => v * 0.32);
    const loin = melange(
      melange(ciel, rgb(parseInt(soleil, 16)), 0.15 * (1 - st)).map((v) => v * 0.82),
      NUIT,
      st * 0.6
    );

    const ecart = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / 3;

    // Si le lointain vaut le ciel, la silhouette s'y dissout et il ne reste
    // rien à voir : c'est ce qui rendait la forêt orange sur ciel orange.
    assert.ok(ecart(loin, ciel) > 12, `${nom} : le lointain se confond avec le ciel`);
    // Et si les deux bornes se valent, il n'y a plus de profondeur.
    assert.ok(ecart(proche, loin) > 25, `${nom} : plans proche et lointain indistincts`);
  });
});

test('l’aire de jeu reste plate, les alentours ondulent', async () => {
  const { hauteurSol, TERRAIN } = await import('../src/game/terrain.js');

  // La créature évolue au centre : si le terrain y montait, il faudrait la
  // faire suivre le relief, avec tous les risques que ça comporte. En gardant
  // le centre plat, on obtient le bénéfice visuel sans aucun des ennuis.
  for (let r = 0; r <= TERRAIN.PLAT; r += 0.5) {
    for (let a = 0; a < 12; a += 1) {
      const t = (a / 12) * Math.PI * 2;
      assert.equal(hauteurSol(Math.cos(t) * r, Math.sin(t) * r), 0, `relief au rayon ${r}`);
    }
  }

  // Et au-delà, il doit vraiment onduler, sinon l'effort est inutile.
  let mini = 9;
  let maxi = -9;
  for (let a = 0; a < 64; a += 1) {
    const t = (a / 64) * Math.PI * 2;
    const h = hauteurSol(Math.cos(t) * 18, Math.sin(t) * 18);
    mini = Math.min(mini, h);
    maxi = Math.max(maxi, h);
  }
  assert.ok(maxi - mini > 0.8, 'relief trop faible pour se voir');
  assert.ok(maxi - mini < 3, 'relief trop violent pour un décor');
});

test('la transition vers le relief est douce', async () => {
  const { hauteurSol, TERRAIN } = await import('../src/game/terrain.js');
  // Une marche brutale à la limite de la zone plate se verrait comme une
  // falaise circulaire autour de la créature.
  let saut = 0;
  let precedent = 0;
  for (let r = TERRAIN.PLAT - 1; r < TERRAIN.PLEIN + 2; r += 0.25) {
    const h = hauteurSol(r, r * 0.3);
    saut = Math.max(saut, Math.abs(h - precedent));
    precedent = h;
  }
  assert.ok(saut < 0.12, `marche de ${saut.toFixed(2)} unité à la jonction`);
});

test('les nappes de brume ne calculent pas de pixels invisibles', () => {
  // Commentaires retirés d'abord : ils citent les noms de classes pour les
  // expliquer, et une recherche naïve tombe dessus. Déjà rencontré avec le CSS.
  const source = readFileSync('src/game/world.js', 'utf8').replace(/\/\/.*/g, '');
  const bloc = source.slice(
    source.indexOf('const brumes = new THREE.Group()'),
    source.indexOf('scene.add(brumes)')
  );

  // Le masque du shader n'ouvre qu'un anneau : une géométrie carrée ferait
  // calculer près d'un tiers des fragments pour rien, sur des surfaces vues de
  // biais qui couvrent une grande part de l'écran.
  assert.match(bloc, /RingGeometry/, 'les voiles devraient épouser la forme du masque');
  assert.ok(!/PlaneGeometry/.test(bloc), 'un voile carré gaspille des fragments transparents');
});

test('les libellés de jauges tiennent dans leur colonne', () => {
  const css = readFileSync('src/styles.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const bloc = css.slice(css.indexOf('.vial {'), css.indexOf('}', css.indexOf('.vial {')));
  const largeur = Number((bloc.match(/width:\s*(\d+)px/) || [])[1]);

  // « Propreté » et « Affection » font une cinquantaine de pixels à 9 px avec
  // les majuscules et l'interlettrage. À 26 px de colonne, ils débordaient sur
  // leurs voisins et se lisaient collés.
  assert.ok(largeur >= 46, `colonne de ${largeur} px : les libellés déborderont`);

  const label = css.slice(css.indexOf('.vial__label {'), css.indexOf('}', css.indexOf('.vial__label {')));
  assert.match(label, /overflow:\s*hidden/, 'aucun garde-fou si un libellé s’allonge');
});

test('le projet déclare une licence libre', () => {
  const licence = readFileSync('LICENSE', 'utf8');
  assert.match(licence, /MIT License/, 'licence absente ou illisible');
  const paquet = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(paquet.license, 'MIT', 'licence non déclarée dans package.json');
});

test('les sons d’interface restent courts et doux', async () => {
  const source = readFileSync('src/audio/sfx.js', 'utf8');
  // Au-delà de 200 ms, on entend le son au lieu de sentir le bouton.
  const toucher = source.slice(source.indexOf('touche()'), source.indexOf('valide()'));
  const duree = Number((toucher.match(/duree:\s*([\d.]+)/) || [])[1]);
  assert.ok(duree <= 0.2, `retour de touche de ${duree} s : trop long`);
  // Une onde carrée est agressive à faible volume : pas dans l'interface.
  assert.ok(!/type:\s*'square'/.test(source), 'onde carrée dans les sons d’interface');
});

test('chaque icône déclarée correspond à un bouton réel', async () => {
  const { ICON_FILES } = await import('../src/ui/icons.js');
  const { CARES } = await import('../src/ui/actions.js');

  // Les huit soins de la barre d'actions doivent tous avoir leur entrée :
  // c'est le lot visible en permanence, celui qu'on livre en premier.
  CARES.forEach((care) => {
    assert.ok(ICON_FILES[care.id], `aucune icône prévue pour « ${care.id} »`);
  });

  Object.values(ICON_FILES).forEach((fichier) => {
    assert.match(fichier, /\.png$/, `${fichier} : format inattendu`);
  });

  const noms = Object.values(ICON_FILES);
  assert.equal(new Set(noms).size, noms.length, 'deux icônes partagent un fichier');
});

test('une icône manquante ne casse rien', async () => {
  const source = readFileSync('src/ui/icons.js', 'utf8');
  // L'emoji est posé AVANT la tentative de chargement : on n'affiche jamais un
  // bouton vide en attendant, et un fichier absent laisse simplement l'emoji.
  const fonction = source.slice(source.indexOf('export function iconContent'));
  const poseEmoji = fonction.indexOf('span.textContent = emoji');
  const chargeImage = fonction.indexOf('image.src');
  assert.ok(poseEmoji >= 0 && poseEmoji < chargeImage, 'l’emoji doit être posé en premier');
  assert.match(fonction, /image\.onerror/, 'aucun repli si le fichier est absent');
});
