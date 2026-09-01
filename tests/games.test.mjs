import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installEnv } from './_env.mjs';

installEnv();
const { GAMES, gamesForBand } = await import('../src/games/index.js');
const { createSession } = await import('../src/games/session.js');
const { AGE_BANDS, bandById } = await import('../src/state/child.js');

// Les jeux generent leurs questions au hasard : un bug ne se voit pas sur un
// essai, il se voit sur mille. On balaie donc chaque jeu a chaque niveau.
test('chaque jeu produit des questions valides à tous les niveaux', () => {
  for (const game of GAMES) {
    for (let level = 0; level <= 4; level += 1) {
      for (let seed = 1; seed <= 12; seed += 1) {
        const session = createSession(game, { level, seed });
        let question;
        while ((question = session.next())) {
          const where = `${game.id} niveau ${level} graine ${seed}`;
          assert.ok(question.prompt, `${where} : consigne vide`);
          assert.ok(question.hint, `${where} : indice manquant`);
          assert.ok(question.explain, `${where} : explication manquante`);
          assert.ok(question.choices.length >= 2, `${where} : moins de deux choix`);

          const keys = question.choices.map((c) => c.key);
          assert.equal(new Set(keys).size, keys.length, `${where} : clés en double`);

          const bonnes = question.choices.filter((c) => c.correct);
          if (question.order) assert.ok(bonnes.length >= 1, `${where} : aucune réponse`);
          else assert.equal(bonnes.length, 1, `${where} : ${bonnes.length} bonnes réponses`);

          question.choices.forEach((c) => {
            assert.ok(c.label !== '' && c.label != null, `${where} : étiquette vide`);
            if (typeof c.value === 'number') {
              assert.ok(Number.isFinite(c.value), `${where} : valeur non finie`);
            }
          });

          // La bonne réponse doit toujours être acceptée.
          if (question.order) {
            const ordre = bonnes.sort((a, b) => a.rank - b.rank);
            let last;
            for (const c of ordre) last = session.answer(c.key);
            assert.equal(last.state, 'won', `${where} : séquence correcte refusée`);
          } else {
            assert.equal(session.answer(bonnes[0].key).state, 'won', `${where} : bonne réponse refusée`);
          }
        }
      }
    }
  }
});

test('trois erreurs révèlent la réponse et ne comptent pas comme réussite', () => {
  const session = createSession(GAMES[0], { level: 2, seed: 5 });
  const question = session.next();
  const mauvaise = question.choices.find((c) => !c.correct).key;
  let result;
  for (let i = 0; i < 3; i += 1) result = session.answer(mauvaise);
  assert.equal(result.state, 'given');
  assert.ok(Array.isArray(result.reveal));
  assert.equal(session.summary().correct, 0);
});

test("l'indice n'arrive qu'à la deuxième erreur", () => {
  const session = createSession(GAMES[0], { level: 2, seed: 9 });
  const question = session.next();
  const mauvaise = question.choices.find((c) => !c.correct).key;
  assert.ok(!session.answer(mauvaise).say.includes(question.hint));
  assert.ok(session.answer(mauvaise).say.includes(question.hint));
});

test('chaque tranche d’âge a au moins trois jeux', () => {
  AGE_BANDS.forEach((band) => {
    assert.ok(gamesForBand(band).length >= 3, `${band.label} : trop peu de jeux`);
  });
});

test('les tout-petits ne voient ni horloge ni calcul avancé', () => {
  const ids = gamesForBand(bandById('3-4')).map((g) => g.id);
  assert.ok(!ids.includes('horloge'));
  assert.ok(ids.includes('couleurs'));
});

test('la même graine rejoue exactement la même partie', () => {
  const a = createSession(GAMES[5], { level: 3, seed: 77 });
  const b = createSession(GAMES[5], { level: 3, seed: 77 });
  assert.equal(a.next().prompt, b.next().prompt);
});

test('la consigne enfant encadre toujours le ton du modèle', async () => {
  const { childInstruction } = await import('../src/state/child.js');
  AGE_BANDS.forEach((band) => {
    const text = childInstruction(band);
    assert.ok(text.includes('effrayant'), `${band.label} : pas de garde-fou sur le contenu`);
    if (band.id !== 'none') {
      assert.ok(text.includes(band.label), `${band.label} : âge absent de la consigne`);
      assert.ok(text.includes('personnelles'), `${band.label} : pas de garde-fou sur les données`);
    }
  });
});

test('le guide couvre les sujets qui bloquent un débutant', async () => {
  const { GUIDE } = await import('../src/content/guide.js');
  const ids = GUIDE.map((s) => s.id);
  ['debut', 'soins', 'parler', 'jeux', 'ia', 'voix', 'sauvegarde', 'parents'].forEach((id) => {
    assert.ok(ids.includes(id), `section manquante : ${id}`);
  });
  const ia = GUIDE.find((s) => s.id === 'ia');
  const texte = ia.body.join(' ');
  // La question qu'on se pose vraiment : c'est quoi, et est-ce que c'est payant.
  assert.ok(texte.includes('mot de passe'), 'la clé n’est pas expliquée simplement');
  assert.ok(texte.includes('gratuit'), 'le coût n’est pas abordé');
  GUIDE.forEach((s) => {
    assert.ok(s.body.length >= 3, `${s.id} : section trop courte`);
    assert.ok(s.icon && s.title, `${s.id} : titre ou icône manquant`);
  });
});
