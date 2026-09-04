import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installEnv } from './_env.mjs';

installEnv();
const O = await import('../src/core/orientation.js');

// Le module ne peut pas verrouiller quoi que ce soit hors d'Android : ces tests
// vérifient sa logique de suivi, qui est la partie où l'on se trompe.

test('un écran ouvert impose le portrait, sa fermeture rend le paysage', async () => {
  await O.setScreenOpen('reglages', true);
  assert.deepEqual(O.screensOpen(), ['reglages']);
  await O.setScreenOpen('reglages', false);
  assert.deepEqual(O.screensOpen(), []);
});

test('fermer un écran n’en referme pas un autre', async () => {
  // C'est le cas qui cassait avec un simple booléen : ouvrir les réglages, puis
  // les souvenirs, puis fermer les souvenirs reverrouillait le paysage alors
  // que les réglages étaient toujours affichés.
  await O.setScreenOpen('reglages', true);
  await O.setScreenOpen('souvenirs', true);
  await O.setScreenOpen('souvenirs', false);
  assert.deepEqual(O.screensOpen(), ['reglages'], 'les réglages ont été oubliés');
  await O.setScreenOpen('reglages', false);
  assert.deepEqual(O.screensOpen(), []);
});

test('ouvrir deux fois le même écran ne le compte qu’une fois', async () => {
  await O.setScreenOpen('jeux', true);
  await O.setScreenOpen('jeux', true);
  await O.setScreenOpen('jeux', false);
  assert.deepEqual(O.screensOpen(), []);
});

test('tous les écrans de lecture sont branchés', () => {
  const source = readFileSync('src/main.js', 'utf8');
  // Chacun de ces écrans se lit mieux à la verticale : s'il n'est pas déclaré,
  // il reste bloqué en paysage avec le clavier qui mange la moitié de l'écran.
  ['reglages', 'profils', 'conversation', 'jeux', 'guide', 'agenda'].forEach((ecran) => {
    assert.match(
      source,
      new RegExp(`setScreenOpen\\('${ecran}'`),
      `écran non branché sur l’orientation : ${ecran}`
    );
  });
});

test('les deux orientations sont imposées, jamais seulement libérées', async () => {
  const source = readFileSync('src/core/orientation.js', 'utf8');
  // Lever le verrou rend la main au système : si la rotation automatique est
  // désactivée sur le téléphone, l'écran reste où il est. Un écran de lecture
  // doit donc verrouiller le portrait, pas se contenter de déverrouiller.
  assert.match(source, /lock\(\{ orientation: etat === 'paysage' \? 'landscape' : 'portrait' \}\)/);
  const bascule = source.slice(source.indexOf('export function setScreenOpen'));
  assert.match(bascule, /lockPortrait\(\)/, 'les écrans de lecture n’imposent pas le portrait');
  assert.ok(
    !/ouverts\.size \? unlockOrientation/.test(bascule),
    'les écrans de lecture se contentent de déverrouiller'
  );
});

test('le manifeste est bien la source du verrou par défaut', () => {
  // Le réglage a quitté le workflow pour un script versionné : plus lisible,
  // testable, et le même pour la compilation de test et celle de publication.
  const workflow = readFileSync('.github/workflows/build.yml', 'utf8');
  assert.match(workflow, /patch_manifest\.py/, 'le manifeste n’est plus ajusté au build');

  const script = readFileSync('tools/patch_manifest.py', 'utf8');

  // L'orientation du manifeste est celle de la TOUTE PREMIÈRE fenêtre, avant
  // qu'aucun code n'ait tourné : l'écran de présentation puis le choix du
  // profil, qui sont des formulaires en portrait. Annoncer le paysage faisait
  // apparaître le logo couché, puis pivoter aussitôt pour demander le prénom.
  assert.match(script, /screenOrientation="sensorPortrait"/, 'orientation de démarrage absente');

  // `sensorPortrait` et non `portrait` : les deux sens doivent rester
  // possibles, sinon le téléphone ne peut se tenir que d'un côté.
  assert.ok(
    !/screenOrientation="portrait"/.test(script),
    'orientation figée dans un seul sens'
  );

  // Et l'orientation du JEU, elle, reste un choix de l'utilisateur.
  const orientation = readFileSync('src/core/orientation.js', 'utf8');
  assert.match(orientation, /applyGameOrientation/, 'la préférence n’est plus appliquée');
});

test('aucun module Capacitor n’est renvoyé par une fonction asynchrone', () => {
  // JavaScript interroge `.then` sur la valeur produite par une fonction
  // `async` pour savoir si c'est une promesse. Un module Capacitor est un
  // proxy : il transforme cette question en appel natif, qui échoue. Le rejet
  // part alors sans que personne l'attende, et le vrai symptôme apparaît
  // ailleurs — ici, trois jobs de compilation en échec.
  const fichiers = [
    'src/core/orientation.js',
    'src/agenda/notify.js',
    'src/agenda/overlay.js',
    'src/audio/listen.js'
  ];

  fichiers.forEach((fichier) => {
    const source = readFileSync(fichier, 'utf8');
    // On repère les fonctions asynchrones et l'on vérifie qu'aucune ne renvoie
    // la variable qui contient le module.
    const asynchrones = source.match(/async function[\s\S]*?\n}/g) || [];
    asynchrones.forEach((bloc) => {
      ['return plugin;', 'return nativePlugin;', 'return candidat;'].forEach((interdit) => {
        assert.ok(
          !bloc.includes(interdit),
          `${fichier} : une fonction async renvoie le module Capacitor (${interdit})`
        );
      });
    });
  });
});

test('demander l’orientation ne rejette jamais, même sans module natif', async () => {
  // Hors Android il n'y a rien à verrouiller : l'appel doit se taire, pas
  // faire tomber l'application.
  await assert.doesNotReject(() => O.setScreenOpen('essai', true));
  await assert.doesNotReject(() => O.setScreenOpen('essai', false));
  await assert.doesNotReject(() => O.lockLandscape());
  await assert.doesNotReject(() => O.lockPortrait());
  await assert.doesNotReject(() => O.releaseOrientation());
});

test('l’utilisateur choisit l’orientation de la scène', async () => {
  const { loadGameOrientation, saveGameOrientation } = await import('../src/core/orientation.js');

  // Par défaut, on suit le téléphone : les deux orientations se valent, et
  // c'est à la personne de décider comment elle tient son appareil.
  saveGameOrientation('auto');
  assert.equal(loadGameOrientation(), 'auto');

  ['paysage', 'portrait'].forEach((choix) => {
    saveGameOrientation(choix);
    assert.equal(loadGameOrientation(), choix);
  });

  // Une valeur inconnue ne doit pas bloquer le jeu dans un état absurde.
  localStorage.setItem('monstre.orientation', 'diagonale');
  assert.equal(loadGameOrientation(), 'auto');
  saveGameOrientation('auto');
});

test('l’aire de jeu ne dépasse jamais la largeur visible', () => {
  const source = readFileSync('src/game/world.js', 'utf8');

  // Un plancher fixe autorisait la créature à sortir du cadre en portrait, où
  // la largeur visible tombe sous ce plancher. L'aire doit suivre le calcul,
  // pas une constante.
  assert.ok(
    !/Math\.max\(1\.4,/.test(source),
    'le plancher qui laissait la créature sortir du cadre est encore là'
  );
  assert.match(source, /playBounds\.x = Math\.min\(4, Math\.max\(0\.7\d?,/, 'aire de jeu non calculée');

  // Et l'angle de vue doit s'ouvrir sur un écran étroit, sinon il ne resterait
  // presque plus de place pour bouger.
  assert.match(source, /camera\.fov = camera\.aspect < 1/, 'angle de vue figé');

  // Reproduction du calcul : dans toutes les formes d'écran, l'aire doit tenir
  // dans ce que la caméra montre.
  const FOLLOW = 0.35;
  const distance = Math.hypot(2.1 - 1, 5.4);
  [0.46, 0.62, 1, 1.6, 2.17].forEach((aspect) => {
    const fov = aspect < 1 ? 54 : aspect < 1.4 ? 48 : 42;
    const demi = distance * Math.tan((fov * Math.PI) / 360) * aspect;
    const x = Math.min(4, Math.max(0.75, demi * (1 + FOLLOW * 0.5) * 0.78));
    assert.ok(x <= demi, `rapport ${aspect} : aire ${x.toFixed(2)} > visible ${demi.toFixed(2)}`);
  });
});

test('rien de blanc ne précède l’écran de présentation', async () => {
  const script = readFileSync('tools/patch_manifest.py', 'utf8');

  // Depuis Android 12, le système affiche son propre écran d'attente avant que
  // la moindre ligne de code tourne : l'icône sur le fond du thème, blanc par
  // défaut. Les attributs n'existent qu'à partir de l'API 31, d'où values-v31.
  assert.match(script, /values-v31/, 'aucun réglage de l’écran système');
  assert.match(script, /windowSplashScreenBackground/, 'fond de l’écran système non défini');

  const html = readFileSync('index.html', 'utf8');
  const avantCss = html.slice(0, html.indexOf('styles.css') >= 0 ? html.indexOf('styles.css') : html.length);

  // Et la page elle-même doit être sombre AVANT sa feuille de style : une vue
  // sans CSS est blanche, et ce blanc se voit sur un téléphone lent.
  assert.match(avantCss, /background:\s*#0b0f1e/i, 'fond de page non posé avant la feuille de style');

  const config = JSON.parse(readFileSync('capacitor.config.json', 'utf8'));
  assert.ok(config.android?.backgroundColor, 'fond de la vue native non défini');
});
