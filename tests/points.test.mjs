import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installEnv } from './_env.mjs';

installEnv();
const P = await import('../src/state/points.js');
const B = await import('../src/state/boutique.js');

test('on ne perd jamais de points et le solde ne devient pas négatif', () => {
  localStorage.clear();
  P.gagner('p', 50);
  assert.equal(P.solde('p'), 50);

  // Un achat trop cher ne doit RIEN changer : un achat à moitié fait serait
  // pire qu'un achat refusé.
  assert.equal(P.depenser('p', 80), false);
  assert.equal(P.solde('p'), 50);

  assert.equal(P.depenser('p', 50), true);
  assert.equal(P.solde('p'), 0);
  assert.equal(P.depenser('p', 1), false);
  assert.equal(P.solde('p'), 0);
});

test('répéter la même activité rapporte de moins en moins', () => {
  localStorage.clear();
  let total = 0;
  for (let i = 0; i < 60; i += 1) total += P.gagner('p', 20, 'jeux').gagne;

  // Le plafond pousse à varier les activités sans jamais bloquer personne
  // devant un compte à rebours.
  assert.equal(total, P.PLAFONDS.jeux, `plafond dépassé (${total})`);
  assert.equal(P.gagner('p', 20, 'jeux').gagne, 0);

  // Mais une AUTRE activité rapporte toujours.
  assert.ok(P.gagner('p', 5, 'soin').gagne > 0, 'le plafond d’un jeu bloque les soins');
});

test('la rente de présence récompense le retour, pas la durée', () => {
  localStorage.clear();
  const debut = Date.now();
  assert.ok(P.visiter('p', debut).gagne > 0, 'aucune rente à la première visite');

  // Rester ouvert ne rapporte rien de plus.
  assert.equal(P.visiter('p', debut + 60_000).gagne, 0);
  assert.equal(P.visiter('p', debut + 3 * 3600_000).gagne, 0);

  // Revenir plus tard, oui.
  assert.ok(P.visiter('p', debut + 5 * 3600_000).gagne > 0, 'la rente ne revient jamais');
});

test('une partie sans faute rapporte plus qu’une partie moyenne', () => {
  const parfait = P.recompenseDePartie(6, 6);
  const moyen = P.recompenseDePartie(3, 6);
  const nul = P.recompenseDePartie(0, 6);

  assert.ok(parfait > moyen && moyen > nul, 'la récompense ne suit pas le résultat');
  // Mais une partie ratée rapporte quand même : on est venu jouer.
  assert.ok(nul > 0, 'une partie ratée ne rapporte rien');
});

test('les compteurs quotidiens repartent le lendemain', () => {
  localStorage.clear();
  const jour1 = new Date(2026, 8, 7, 12).getTime();
  const jour2 = new Date(2026, 8, 8, 9).getTime();

  for (let i = 0; i < 40; i += 1) P.gagner('p', 20, 'jeux', jour1);
  assert.equal(P.gagner('p', 20, 'jeux', jour1).gagne, 0, 'plafond non atteint');
  assert.ok(P.gagner('p', 20, 'jeux', jour2).gagne > 0, 'le plafond ne se remet pas à zéro');
});

test('cinq espèces sont jouables sans rien acheter', () => {
  localStorage.clear();
  const libres = B.especesDisponibles('p');
  assert.equal(libres.length, 5, `${libres.length} espèces offertes`);
  // Il faut de quoi jouer avant d'avoir de quoi acheter.
  assert.ok(libres.includes('gigglehorn'));
});

test('on ne choisit que ce qu’on possède, et jamais deux fois payé', () => {
  localStorage.clear();
  assert.equal(B.choisirProchaine('p', 'gemmelin'), null, 'espèce non possédée acceptée');

  assert.equal(B.acheter('p', 'oeuf:gemmelin'), true);
  assert.equal(B.acheter('p', 'oeuf:gemmelin'), false, 'article racheté');
  assert.equal(B.choisirProchaine('p', 'gemmelin'), 'gemmelin');

  // Et l'on peut revenir au hasard.
  assert.equal(B.choisirProchaine('p', null), null);
});

test('aucun article ne donne d’avantage de jeu', () => {
  // Un jeu pour enfants où l'argent donne un avantage apprend une mauvaise
  // leçon. On n'achète que du choix et du décor.
  B.catalogueOeufs().forEach((article) => {
    assert.equal(article.categorie, 'oeuf', `${article.id} : catégorie inattendue`);
    assert.ok(!('bonus' in article), `${article.id} : accorde un bonus`);
    assert.ok(article.prix >= 0, `${article.id} : prix négatif`);
  });
});

test('chaque espèce a un tempérament qui se lit dans son caractère', async () => {
  const { SPECIES, temperamentOf, TEMPERAMENTS } = await import('../src/game/species.js');
  const { createPet } = await import('../src/state/pet.js');

  SPECIES.forEach((espece) => {
    const temp = temperamentOf(espece);
    assert.ok(temp.label && temp.phrase, `${espece.id} : tempérament incomplet`);

    // Un décalage trop fort écraserait tout ce que le joueur construit ensuite
    // par les soins : on choisit un tempérament, on élève un caractère.
    Object.values(temp.biais).forEach((valeur) => {
      assert.ok(Math.abs(valeur) <= 0.25, `${temp.label} : décalage de ${valeur}, trop fort`);
    });
  });

  assert.ok(Object.keys(TEMPERAMENTS).length >= 6, 'trop peu de tempéraments, ils se ressembleront');

  // Et l'effet doit être mesurable : un grognon est moins sociable qu'un joyeux.
  function moyenne(especeId, trait) {
    let somme = 0;
    for (let s = 1; s <= 400; s += 1) somme += createPet(s, especeId).personality[trait];
    return somme / 400;
  }
  const grognon = SPECIES.find((e) => e.temperament === 'grognon');
  const joyeux = SPECIES.find((e) => e.temperament === 'joyeux');
  assert.ok(
    moyenne(grognon.id, 'sociability') < moyenne(joyeux.id, 'sociability') - 0.15,
    'le tempérament ne se voit pas dans le caractère'
  );
});
