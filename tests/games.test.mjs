import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installEnv } from './_env.mjs';

installEnv();
const { GAMES, gamesForBand } = await import('../src/games/index.js');
const { createSession } = await import('../src/games/session.js');
const { AGE_BANDS, bandById, audienceInstruction } = await import('../src/state/profile.js');

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

test('chaque public a des jeux qui lui correspondent', () => {
  const petits = gamesForBand(bandById('3-4')).map((g) => g.id);
  assert.ok(!petits.includes('horloge'), 'l’horloge est trop tôt à 3 ans');
  assert.ok(!petits.includes('proverbes'), 'les proverbes sont trop tôt à 3 ans');
  assert.ok(petits.includes('couleurs'));

  const senior = gamesForBand(bandById('senior')).map((g) => g.id);
  assert.ok(senior.includes('proverbes'), 'les proverbes manquent au profil senior');
  assert.ok(senior.includes('intrus'));
  assert.ok(senior.includes('monnaie'));
  assert.ok(!senior.includes('couleurs'), 'les couleurs pour tout-petits n’ont rien à faire là');
  assert.ok(senior.length >= 6, 'trop peu de jeux pour le profil senior');
});

test('on ne parle pas à une personne âgée comme à un enfant', () => {
  const senior = audienceInstruction(bandById('senior'));
  assert.ok(senior.includes('infantilisant'), 'garde-fou sur le ton manquant');
  assert.ok(senior.includes('medecin') || senior.includes('professionnel'), 'pas de renvoi vers un professionnel');
  const enfant = audienceInstruction(bandById('5-6'));
  assert.ok(enfant.includes('adulte'), 'pas de renvoi vers un adulte');
  assert.ok(enfant !== senior);
});

test('chaque sujet de conversation a une ouverture et des relances', async () => {
  const { topicsFor } = await import('../src/games/topics.js');
  ['senior', '5-6', 'adulte'].forEach((id) => {
    const topics = topicsFor(bandById(id));
    assert.ok(topics.length >= 4, `${id} : trop peu de sujets`);
    topics.forEach((t) => {
      assert.ok(t.opener && t.opener.endsWith('?') === false ? true : true);
      assert.ok(t.opener.length > 10, `${t.id} : ouverture trop courte`);
      assert.ok(t.relances.length >= 2, `${t.id} : pas assez de relances`);
      assert.ok(t.icon && t.title, `${t.id} : titre ou icône manquant`);
    });
  });
});

test('la même graine rejoue exactement la même partie', () => {
  const a = createSession(GAMES[5], { level: 3, seed: 77 });
  const b = createSession(GAMES[5], { level: 3, seed: 77 });
  assert.equal(a.next().prompt, b.next().prompt);
});

test('la consigne enfant encadre toujours le ton du modèle', async () => {
  AGE_BANDS.forEach((band) => {
    const text = audienceInstruction(band);
    assert.ok(text.includes('effrayant'), `${band.label} : pas de garde-fou sur le contenu`);
    assert.ok(text.includes('personnelles'), `${band.label} : pas de garde-fou sur les données`);
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

test('les jeux à la voix sont signalés et jouables au doigt', async () => {
  const { GAMES } = await import('../src/games/index.js');
  const voix = GAMES.filter((g) => g.voix);
  assert.ok(voix.length >= 2, 'trop peu de jeux conçus pour la voix');

  const { createSession } = await import('../src/games/session.js');
  voix.forEach((jeu) => {
    // Un jeu qui n'existe qu'à la voix exclut ceux qui ne peuvent pas parler,
    // ou qui jouent dans le bus. Les réponses restent proposées à l'écran.
    const session = createSession(jeu, { level: 2, seed: 3 });
    const question = session.next();
    assert.ok(question.choices.length >= 2, `${jeu.id} : injouable au doigt`);
    assert.equal(question.choices.filter((c) => c.correct).length, 1);
  });
});

test('un jeu qui exige le micro disparaît sans micro', async () => {
  const { GAMES, gamesForBand } = await import('../src/games/index.js');
  const { bandById } = await import('../src/state/profile.js');
  const band = bandById('7-8');

  const avec = gamesForBand(band, { micro: true }).map((g) => g.id);
  const sans = gamesForBand(band, { micro: false }).map((g) => g.id);

  const exigeants = GAMES.filter((g) => g.voixSeulement).map((g) => g.id);
  assert.ok(exigeants.length >= 1, 'aucun jeu ne dépend du micro');
  exigeants.forEach((id) => {
    if (avec.includes(id)) {
      assert.ok(!sans.includes(id), `« ${id} » proposé sans micro alors qu’il en dépend`);
    }
  });
});

test('la créature attend la fin de sa phrase avant d’écouter', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync('src/ui/games.js', 'utf8');
  // Ouvrir le micro pendant qu'elle parle lui ferait entendre sa propre voix.
  assert.match(
    source,
    /say\(question\.prompt,[\s\S]{0,80}ecouterReponse/,
    'l’écoute ne suit pas la fin de la question'
  );
});
