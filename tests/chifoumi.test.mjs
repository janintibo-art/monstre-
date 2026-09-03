import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installEnv } from './_env.mjs';

installEnv();
const C = await import('../src/games/chifoumi.js');
const { createRng } = await import('../src/core/rng.js');

test('les règles du jeu sont respectées', () => {
  assert.equal(C.resultat('pierre', 'ciseaux'), 'gagne');
  assert.equal(C.resultat('ciseaux', 'feuille'), 'gagne');
  assert.equal(C.resultat('feuille', 'pierre'), 'gagne');
  assert.equal(C.resultat('pierre', 'feuille'), 'perd');
  C.COUPS.forEach((c) => assert.equal(C.resultat(c, c), 'egalite'));
  // Le cycle doit être fermé : chaque coup en bat un et un seul.
  C.COUPS.forEach((c) => assert.equal(C.resultat(c, C.contre(c)), 'perd'));
});

test('la créature ne triche jamais', () => {
  // Face à un joueur parfaitement imprévisible, elle ne peut pas faire mieux
  // qu'un tiers. Au-delà, c'est qu'elle a vu le coup en cours — et un jeu où
  // l'adversaire triche n'est plus un jeu, même contre une créature dessinée.
  const rng = createRng(4242);
  const historique = [];
  let elle = 0;
  const parties = 9000;

  for (let i = 0; i < parties; i += 1) {
    const moi = C.COUPS[Math.floor(rng() * 3) % 3];
    const sien = C.coupCreature(historique, { shyness: 0 }, rng);
    if (C.resultat(moi, sien) === 'perd') elle += 1;
    historique.push(moi);
  }

  const taux = elle / parties;
  assert.ok(taux < 0.38, `elle gagne ${(taux * 100).toFixed(1)} % : elle triche`);
  assert.ok(taux > 0.28, `elle gagne ${(taux * 100).toFixed(1)} % : elle se laisse faire`);
});

test('elle apprend d’un joueur prévisible', () => {
  // Tout l'intérêt : un tirage purement aléatoire ferait du chifoumi un pile
  // ou face, sans rien à apprendre ni à contrer.
  const rng = createRng(77);
  const historique = [];
  let elle = 0;
  const parties = 2000;

  for (let i = 0; i < parties; i += 1) {
    const sien = C.coupCreature(historique, { shyness: 0 }, rng);
    if (C.resultat('pierre', sien) === 'perd') elle += 1;
    historique.push('pierre');
  }

  assert.ok(elle / parties > 0.55, `elle ne lit pas le jeu (${elle}/${parties})`);
});

test('une créature timide joue plus au hasard qu’une effrontée', () => {
  function mesurer(shyness) {
    const rng = createRng(9);
    const historique = [];
    let elle = 0;
    for (let i = 0; i < 2000; i += 1) {
      const sien = C.coupCreature(historique, { shyness }, rng);
      if (C.resultat('feuille', sien) === 'perd') elle += 1;
      historique.push('feuille');
    }
    return elle / 2000;
  }
  // Le caractère de la créature se lit dans sa façon de jouer : c'est ce qui
  // fait qu'on affronte quelqu'un plutôt qu'un générateur.
  assert.ok(mesurer(0.05) > mesurer(0.95), 'le caractère ne change rien à son jeu');
});

test('elle ne se moque jamais du joueur', () => {
  const rng = createRng(3);
  const dites = new Set();
  for (let i = 0; i < 200; i += 1) {
    ['gagne', 'perd', 'egalite'].forEach((issue) => dites.add(C.phrase(issue, rng)));
  }
  const meprisants = /nul|bête|perdant|facile|évidemment|encore toi/i;
  dites.forEach((p) => assert.ok(!meprisants.test(p), `phrase blessante : « ${p} »`));
  assert.ok(dites.size >= 9, 'trop peu de formules, elles vont lasser');
});

test('le bilan reste engageant quel que soit le score', () => {
  [
    { gagne: 5, perd: 0, egalite: 0 },
    { gagne: 0, perd: 5, egalite: 0 },
    { gagne: 2, perd: 2, egalite: 1 }
  ].forEach((compte) => {
    const texte = C.bilan(compte);
    assert.ok(texte.length > 10, 'bilan trop sec');
    assert.ok(/\?|!/.test(texte), 'le bilan n’invite pas à rejouer');
  });
});
