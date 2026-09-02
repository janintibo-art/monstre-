import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installEnv } from './_env.mjs';

installEnv();
const O = await import('../src/core/orientation.js');

// Le module ne peut pas verrouiller quoi que ce soit hors d'Android : ces tests
// vérifient sa logique de suivi, qui est la partie où l'on se trompe.

test('un écran ouvert libère l’orientation, sa fermeture la rend', async () => {
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

test('le manifeste est bien la source du verrou par défaut', () => {
  const workflow = readFileSync('.github/workflows/build.yml', 'utf8');
  assert.match(workflow, /screenOrientation="sensorLandscape"/, 'verrou paysage absent du build');
  // `sensorLandscape` et non `landscape` : les deux sens de rotation doivent
  // rester possibles, sinon le téléphone ne peut se tenir que d'un côté.
  assert.ok(
    !/screenOrientation="landscape"/.test(workflow),
    'orientation figée dans un seul sens'
  );
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
  await assert.doesNotReject(() => O.unlockOrientation());
});
