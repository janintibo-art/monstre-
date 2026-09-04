import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installEnv } from './_env.mjs';

installEnv();
const C = await import('../src/state/compagnons.js');

test('un compagnon de plus se mérite en jours, pas en points', () => {
  localStorage.clear();
  assert.equal(C.placesOuvertes('p'), 1, 'on ne commence pas avec une seule place');

  const parfait = { hunger: 90, energy: 85, hygiene: 80, fun: 75, affection: 95 };
  const jour = (n) => new Date(2026, 8, n, 20).getTime();

  for (let n = 1; n <= 5; n += 1) C.noterJournee('p', parfait, jour(n));
  assert.equal(C.placesOuvertes('p'), 2, 'la deuxième place ne s’ouvre pas');

  // Et il n'existe aucun moyen d'aller plus vite : c'est le cœur de l'idée.
  // Commentaires retirés : ils EXPLIQUENT que les places ne s'achètent pas, et
  // une recherche naïve tomberait dessus. Déjà rencontré deux fois.
  const code = readFileSync('src/state/compagnons.js', 'utf8').replace(/\/\/.*/g, '');
  assert.ok(!/depenser|solde\(/.test(code), 'une place peut être achetée');
});

test('un jour ne compte que si TOUS les besoins ont tenu', () => {
  localStorage.clear();
  const jour = (n) => new Date(2026, 8, n, 20).getTime();

  // Nourrir ne suffit pas : il faut aussi laver, jouer et câliner. C'est la
  // différence entre s'occuper d'un animal et le nourrir.
  C.noterJournee('p', { hunger: 100, energy: 100, hygiene: 20, fun: 90, affection: 90 }, jour(1));
  assert.equal(C.charger('p').joursDeSoin, 0, 'une journée bâclée a compté');

  C.noterJournee('p', { hunger: 60, energy: 60, hygiene: 60, fun: 60, affection: 60 }, jour(2));
  assert.equal(C.charger('p').joursDeSoin, 1);
});

test('on ne peut pas gagner plusieurs jours dans la même journée', () => {
  localStorage.clear();
  const parfait = { hunger: 90, energy: 90, hygiene: 90, fun: 90, affection: 90 };
  const midi = new Date(2026, 8, 7, 12).getTime();

  for (let i = 0; i < 10; i += 1) C.noterJournee('p', parfait, midi + i * 60_000);
  // Rattraper une semaine d'oubli en une soirée annulerait toute la leçon.
  assert.equal(C.charger('p').joursDeSoin, 1, 'plusieurs jours gagnés le même jour');
});

test('chaque tempérament apporte quelque chose de différent', () => {
  const titres = new Set();
  C.temperamentsConnus().forEach((t) => {
    const apport = C.apportDe(t);
    assert.ok(apport.titre && apport.detail, `${t} : apport incomplet`);
    titres.add(apport.titre);

    // Aucun apport ne remplit une jauge ni ne fait gagner un jeu : ce sont des
    // conséquences d'un caractère, pas des bonus.
    Object.values(apport.effet).forEach((facteur) => {
      assert.ok(facteur > 0 && facteur < 1, `${t} : facteur ${facteur} hors bornes`);
    });
  });
  assert.equal(titres.size, C.temperamentsConnus().length, 'deux tempéraments font la même chose');
});

test('un foyer nombreux ne supprime pas le jeu', () => {
  // Sans plancher, quatre compagnons apaisants arrêteraient le temps : il n'y
  // aurait plus rien à faire, et le jeu se viderait à mesure qu'on y réussit.
  const quatre = C.effetsDuFoyer(['calme', 'reveur', 'calme', 'reveur']);
  Object.entries(quatre).forEach(([besoin, facteur]) => {
    assert.ok(facteur >= 0.45, `${besoin} : ${facteur}, le besoin ne bouge presque plus`);
  });

  // Mais l'effet doit rester perceptible avec un seul compagnon.
  const un = C.effetsDuFoyer(['gourmand']);
  assert.ok(un.hunger < 0.85, 'un compagnon ne change rien');
});

test('on n’accueille pas plus de créatures que de places', () => {
  localStorage.clear();
  assert.equal(C.enregistrerCreature('p', 'a'), 1);
  assert.equal(C.peutAccueillir('p'), false, 'une place non méritée est offerte');

  const parfait = { hunger: 90, energy: 90, hygiene: 90, fun: 90, affection: 90 };
  for (let n = 1; n <= 5; n += 1) C.noterJournee('p', parfait, new Date(2026, 9, n, 20).getTime());
  assert.equal(C.peutAccueillir('p'), true, 'la place méritée reste fermée');
});
