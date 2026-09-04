import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installEnv } from './_env.mjs';

installEnv();
const A = await import('../src/agenda/parse.js');

// Toutes les dates sont calculées par rapport à un « maintenant » fixe :
// un test qui dépend de l'horloge réelle casse un mardi sur sept.
const LUNDI = new Date(2026, 8, 7, 10, 0, 0); // lundi 7 septembre 2026, 10 h

function at(text, now = LUNDI) {
  const r = A.parseReminder(text, now);
  assert.ok(r, `non reconnu : « ${text} »`);
  return new Date(r.at);
}

test('un rendez-vous complet est reconnu', () => {
  const r = A.parseReminder('j’ai rendez-vous chez le médecin mardi à 17h', LUNDI);
  assert.ok(r);
  const d = new Date(r.at);
  assert.equal(d.getDay(), 2, 'pas un mardi');
  assert.equal(d.getHours(), 17);
  assert.equal(d.getMinutes(), 0);
  assert.ok(r.subject.includes('médecin'), `sujet perdu : « ${r.subject} »`);
  assert.equal(r.vague, false);
});

test('les jours de la semaine visent toujours le prochain', () => {
  assert.equal(at('rendez-vous mardi à 9h').getDate(), 8);
  assert.equal(at('rendez-vous dimanche à 9h').getDate(), 13);
  // Un lundi, « lundi » désigne le lundi suivant, pas aujourd'hui.
  assert.equal(at('rendez-vous lundi à 9h').getDate(), 14);
  // Sauf si on dit « ce lundi ».
  assert.equal(at('rendez-vous ce lundi à 18h').getDate(), 7);
});

test('demain, après-demain, dans trois jours', () => {
  assert.equal(at('rappelle-moi demain à 8h').getDate(), 8);
  assert.equal(at('rappelle-moi après-demain à 8h').getDate(), 9);
  assert.equal(at('rendez-vous dans 3 jours à 15h').getDate(), 10);
  assert.equal(at('rendez-vous dans 2 semaines à 15h').getDate(), 21);
});

test('les heures sous toutes leurs formes', () => {
  assert.equal(at('rendez-vous demain à 17h30').getHours(), 17);
  assert.equal(at('rendez-vous demain à 17h30').getMinutes(), 30);
  assert.equal(at('rendez-vous demain à 9 heures et quart').getMinutes(), 15);
  assert.equal(at('rendez-vous demain à 9 heures et demie').getMinutes(), 30);
  assert.equal(at('rendez-vous demain à 14:45').getMinutes(), 45);
  // Nombre dit en toutes lettres, comme le renvoie la reconnaissance vocale.
  assert.equal(at('rendez-vous demain à dix-sept heures').getHours(), 17);
});

test('un moment de la journée suffit, mais reste imprécis', () => {
  const r = A.parseReminder('rendez-vous chez le dentiste demain matin', LUNDI);
  assert.equal(new Date(r.at).getHours(), 9);
  assert.equal(r.vague, true, 'devrait être signalé comme imprécis');
  assert.equal(new Date(A.parseReminder('rendez-vous demain soir', LUNDI).at).getHours(), 19);
});

test('une heure déjà passée aujourd’hui désigne demain', () => {
  const r = A.parseReminder('rappelle-moi à 8h', LUNDI); // il est 10 h
  assert.equal(new Date(r.at).getDate(), 8);
});

test('une date au mois', () => {
  const r = A.parseReminder('rendez-vous le 12 mars à 9h', LUNDI);
  const d = new Date(r.at);
  assert.equal(d.getMonth(), 2);
  assert.equal(d.getDate(), 12);
  assert.equal(d.getFullYear(), 2027, 'mars est passé, donc l’année suivante');
});

test('une phrase ordinaire n’est pas prise pour un rendez-vous', () => {
  assert.equal(A.parseReminder('bonjour, comment vas-tu ?', LUNDI), null);
  assert.equal(A.parseReminder('j’aime beaucoup le chocolat', LUNDI), null);
  assert.equal(A.parseReminder('tu es rigolo', LUNDI), null);
});

test('la récurrence est repérée', () => {
  const r = A.parseReminder('rappelle-moi de prendre mes médicaments tous les jours à 8h', LUNDI);
  assert.deepEqual(r.recurrence, { every: 'day' });
  const s = A.parseReminder('rendez-vous chez le kiné tous les mardis à 10h', LUNDI);
  assert.equal(s.recurrence.every, 'week');
  assert.equal(s.recurrence.weekday, 2);
});

test('le moment de prévenance se comprend à l’oral', () => {
  assert.equal(A.parseLead('une heure avant').minutes, 60);
  assert.equal(A.parseLead('30 minutes avant').minutes, 30);
  assert.equal(A.parseLead('deux heures avant').minutes, 120);
  assert.equal(A.parseLead('la veille au soir').kind, 'dayBefore');
  assert.equal(A.parseLead('le matin même').kind, 'sameDay');
  assert.equal(A.parseLead('au moment').minutes, 0);
  assert.equal(A.parseLead('je ne sais pas'), null);
});

test('le rappel tombe au bon moment', () => {
  const rdv = new Date(2026, 8, 8, 17, 0).getTime();
  assert.equal(A.triggerTime(rdv, A.leadById('1h')), rdv - 3600000);
  assert.equal(A.triggerTime(rdv, A.leadById('moment')), rdv);

  const veille = new Date(A.triggerTime(rdv, A.leadById('veille')));
  assert.equal(veille.getDate(), 7);
  assert.equal(veille.getHours(), 19);

  const matin = new Date(A.triggerTime(rdv, A.leadById('matin')));
  assert.equal(matin.getDate(), 8);
  assert.equal(matin.getHours(), 8);
});

test('un rappel ne tombe jamais après le rendez-vous', () => {
  // Rendez-vous à 7 h : « le matin même à 8 h » arriverait trop tard.
  const tot = new Date(2026, 8, 8, 7, 0).getTime();
  assert.ok(A.triggerTime(tot, A.leadById('matin')) < tot, 'rappel après le rendez-vous');
});

test('la date se dit en français lisible', () => {
  const now = LUNDI;
  assert.match(A.formatWhen(new Date(2026, 8, 7, 17, 0).getTime(), now), /aujourd’hui à 17 h/);
  assert.match(A.formatWhen(new Date(2026, 8, 8, 17, 30).getTime(), now), /demain à 17 h 30/);
  assert.match(A.formatWhen(new Date(2026, 8, 10, 9, 0).getTime(), now), /jeudi à 9 h/);
  assert.match(A.formatWhen(new Date(2026, 11, 24, 20, 0).getTime(), now), /24 décembre/);
});

test('les pense-bêtes sont rangés par profil', async () => {
  const S = await import('../src/agenda/store.js');
  localStorage.clear();

  S.addReminder('mamie', { subject: 'le médecin', at: Date.now() + 3600000, lead: A.leadById('1h') });
  S.addReminder('leo', { subject: 'la piscine', at: Date.now() + 7200000, lead: A.leadById('1h') });

  assert.equal(S.listReminders('mamie').length, 1);
  assert.equal(S.listReminders('leo').length, 1);
  assert.equal(S.listReminders('mamie')[0].subject, 'le médecin');
});

test('un rappel échu est signalé, pas un rendez-vous lointain', async () => {
  const S = await import('../src/agenda/store.js');
  localStorage.clear();
  const now = Date.now();

  // Dans 30 minutes, prévenu 1 h avant : c'est donc dû maintenant.
  S.addReminder('p', { subject: 'proche', at: now + 30 * 60000, lead: A.leadById('1h') });
  // Dans trois jours : rien à signaler.
  S.addReminder('p', { subject: 'lointain', at: now + 3 * 86400000, lead: A.leadById('1h') });

  const due = S.dueReminders('p', now);
  assert.equal(due.length, 1);
  assert.equal(due[0].subject, 'proche');
});

test('un rendez-vous qui se répète est reporté, pas supprimé', async () => {
  const S = await import('../src/agenda/store.js');
  localStorage.clear();
  const at = Date.now();

  const item = S.addReminder('p', {
    subject: 'médicaments',
    at,
    lead: A.leadById('moment'),
    recurrence: { every: 'day' }
  });
  const apres = S.completeReminder('p', item.id);

  assert.equal(apres.done, false, 'un rappel quotidien ne doit pas être clos');
  assert.equal(new Date(apres.at).getDate(), new Date(at + 86400000).getDate());
  assert.equal(S.listReminders('p').length, 1);
});

test('un rendez-vous unique acquitté disparaît de la liste active', async () => {
  const S = await import('../src/agenda/store.js');
  localStorage.clear();
  const item = S.addReminder('p', { subject: 'dentiste', at: Date.now(), lead: A.leadById('moment') });
  S.completeReminder('p', item.id);
  assert.equal(S.upcoming('p').length, 0);
});

test('les vieux rendez-vous s’effacent, les récurrents restent', async () => {
  const S = await import('../src/agenda/store.js');
  localStorage.clear();
  const now = Date.now();
  S.addReminder('p', { subject: 'ancien', at: now - 5 * 86400000, lead: A.leadById('moment') });
  S.addReminder('p', { subject: 'rituel', at: now - 5 * 86400000, lead: A.leadById('moment'), recurrence: { every: 'week' } });

  const reste = S.prune('p', now);
  assert.equal(reste.length, 1);
  assert.equal(reste[0].subject, 'rituel');
});

test('une sauvegarde abîmée ne fait pas tomber la liste', async () => {
  const S = await import('../src/agenda/store.js');
  localStorage.clear();
  localStorage.setItem('monstre.agenda.p', '{pas du json');
  assert.deepEqual(S.listReminders('p'), []);
  localStorage.setItem('monstre.agenda.p', JSON.stringify([{ subject: 'sans date' }, null, 42]));
  assert.deepEqual(S.listReminders('p'), []);
});

test('les trois natures de rappel sont reconnues', () => {
  const cas = [
    ['réveille-moi à 7h', 'reveil'],
    ['rendez-vous chez le médecin mardi à 17h', 'rdv'],
    ['il faut que je acheter du pain demain matin', 'tache'],
    ['n’oublie pas de sortir la poubelle ce soir', 'tache']
  ];
  cas.forEach(([phrase, attendu]) => {
    const r = A.parseReminder(phrase, LUNDI);
    assert.ok(r, `non reconnu : « ${phrase} »`);
    assert.equal(r.type, attendu, `« ${phrase} » classé ${r.type}`);
  });
});

test('un réveil se répète tous les jours sans qu’on le demande', () => {
  const r = A.parseReminder('réveille-moi à 7h', LUNDI);
  assert.deepEqual(r.recurrence, { every: 'day' }, 'personne ne se lève une seule fois');
  // Et son sujet est vide : la formule du réveil n'en a pas besoin.
  assert.equal(r.subject, '');
});

test('les sujets se lisent en français correct', () => {
  // Les mots de temps retirés laissent derrière eux leurs prépositions.
  const cas = [
    ['rendez-vous chez le médecin mardi à 17h', 'chez le médecin'],
    ['rappelle-moi d’arroser les plantes samedi à 10h', 'arroser les plantes'],
    ['je dois acheter du pain demain matin', 'acheter du pain']
  ];
  cas.forEach(([phrase, attendu]) => {
    assert.equal(A.parseReminder(phrase, LUNDI).subject, attendu, `« ${phrase} »`);
  });
});

test('chaque nature a son ton et sa durée', () => {
  Object.values(A.TYPES).forEach((type) => {
    assert.ok(type.label && type.couleur, `${type.id} : présentation incomplète`);
    assert.ok(type.duree >= 120000, `${type.id} : trop bref pour être remarqué`);
    assert.ok(typeof type.phrase === 'function', `${type.id} : aucune formule`);
    assert.ok(type.phrase('quelque chose').length > 5, `${type.id} : formule vide`);
  });
  // Un réveil doit insister plus qu'un rendez-vous : c'est sa raison d'être.
  assert.ok(A.TYPES.reveil.duree > A.TYPES.rdv.duree);
});

test('un rappel répété apparaît chaque jour de la semaine', async () => {
  const S = await import('../src/agenda/store.js');
  localStorage.clear();
  const now = Date.now();
  S.addReminder('p', {
    subject: '',
    type: 'reveil',
    at: now + 3600000,
    lead: A.leadById('moment'),
    recurrence: { every: 'day' }
  });

  // Sans projection, un réveil quotidien n'apparaîtrait qu'une fois et
  // l'agenda mentirait sur la semaine à venir.
  const groupes = S.parJour('p', 7, now);
  assert.equal(groupes.length, 7, 'le réveil ne couvre pas la semaine');
  groupes.forEach((g) => assert.equal(g.items.length, 1));
});

test('une récurrence mal formée ne fait pas tourner la boucle sans fin', async () => {
  const S = await import('../src/agenda/store.js');
  localStorage.clear();
  const now = Date.now();
  S.addReminder('p', {
    subject: 'bizarre',
    at: now,
    lead: A.leadById('moment'),
    recurrence: { every: 'jamais' }
  });
  const groupes = S.parJour('p', 7, now);
  assert.ok(groupes.length <= 7, 'projection incontrôlée');
});

test('les répétitions couvrent les besoins réels d’un réveil', () => {
  const ids = A.REPETITIONS.map((r) => r.id);
  ['une', 'jours', 'ouvres', 'semaine', 'choix'].forEach((id) => {
    assert.ok(ids.includes(id), `répétition manquante : ${id}`);
  });

  const ouvres = A.REPETITIONS.find((r) => r.id === 'ouvres');
  assert.deepEqual(ouvres.valeur.days, [1, 2, 3, 4, 5], 'les jours ouvrés sont faux');
});

test('un réveil du lundi au vendredi ne sonne pas le week-end', () => {
  const recurrence = { every: 'week', days: [1, 2, 3, 4, 5] };
  const depart = new Date(2026, 8, 7, 7, 0); // lundi

  const jours = [];
  for (let i = 0; i < 7; i += 1) {
    const jour = new Date(depart);
    jour.setDate(jour.getDate() + i);
    if (A.tombeCeJour(recurrence, jour, depart)) jours.push(jour.getDay());
  }
  assert.deepEqual(jours, [1, 2, 3, 4, 5], 'le réveil sonne le week-end');
});

test('l’occurrence suivante saute le week-end', () => {
  const recurrence = { every: 'week', days: [1, 2, 3, 4, 5] };
  const vendredi = new Date(2026, 8, 11, 7, 0);
  assert.equal(vendredi.getDay(), 5);

  // Après vendredi vient lundi, pas samedi : c'est tout l'intérêt d'un réveil
  // de semaine.
  const suivant = A.occurrenceSuivante(vendredi, recurrence);
  assert.equal(suivant.getDay(), 1, `passé au jour ${suivant.getDay()}`);
});

test('un rappel de jours choisis apparaît aux bons jours de la semaine', async () => {
  const S = await import('../src/agenda/store.js');
  localStorage.clear();

  // Mardi et jeudi seulement.
  const lundi = new Date(2026, 8, 7, 9, 0).getTime();
  S.addReminder('p', {
    subject: 'kiné',
    type: 'rdv',
    at: lundi,
    lead: A.leadById('1h'),
    recurrence: { every: 'week', days: [2, 4] }
  });

  const groupes = S.parJour('p', 7, lundi);
  const jours = groupes.map((g) => new Date(g.jour).getDay()).sort();
  assert.deepEqual(jours, [2, 4], `apparaît aux jours ${jours}`);
});

test('une répétition sans jour choisi ne bloque pas', () => {
  // « Jours choisis » sans aucune case cochée n'est pas une répétition : le
  // rappel doit rester ponctuel plutôt que de ne jamais retomber.
  assert.equal(A.occurrenceSuivante(Date.now(), { every: 'week', days: [] }), null);
  assert.equal(A.tombeCeJour({ every: 'week', days: [] }, Date.now(), Date.now()), false);
});

test('un réveil sonne à l’heure, jamais avant', () => {
  const source = readFileSync('src/ui/agenda.js', 'utf8');

  // Poser la question de la prévenance pour un réveil était une faute : choisir
  // « une heure avant » faisait sonner le réveil de 7 h à 6 h, et rien ne le
  // laissait deviner.
  const bloc = source.slice(source.indexOf('function startAsk'), source.indexOf('function confirm'));
  assert.match(bloc, /type === 'reveil'/, 'la question est encore posée pour un réveil');
  assert.match(bloc, /leadById\('moment'\)/, 'le réveil n’est pas forcé à l’heure exacte');

  // Et le calcul lui-même doit être neutre.
  const midi = new Date(2026, 8, 8, 7, 0).getTime();
  assert.equal(A.triggerTime(midi, A.leadById('moment')), midi);
});

test('les réveils ont leur propre canal de notification', () => {
  const source = readFileSync('src/agenda/notify.js', 'utf8');

  // Sur Android 8 et suivants, c'est le canal qui porte le son, la vibration et
  // l'importance. Sans canal déclaré, tout part sur celui par défaut, dont
  // l'importance est basse : la notification s'affiche en silence.
  assert.match(source, /createChannel/, 'aucun canal créé');
  assert.match(source, /importance: 5/, 'le canal des réveils n’est pas prioritaire');
  assert.match(source, /channelId/, 'la notification n’utilise pas le canal');

  // Les réglages d'un canal sont figés à sa création : un réveil et un simple
  // rappel ne peuvent donc pas partager le même.
  assert.match(source, /monstre-reveil/, 'canal des réveils absent');
  assert.match(source, /monstre-rappel/, 'canal des rappels absent');
});

test('l’agenda dit ce qui a réellement été programmé', () => {
  const source = readFileSync('src/ui/agenda.js', 'utf8');

  // Annoncer « c'est noté » sans vérifier que quelque chose a été programmé
  // revient à mentir — et un rappel qui ne sonne pas ne se découvre qu'au
  // moment où l'on comptait dessus.
  assert.match(source, /dernierEtat/, 'aucun compte rendu de programmation');
  assert.match(source, /les notifications ne sont pas autorisées/, 'les manques ne sont pas nommés');

  // Et l'on doit pouvoir vérifier sans attendre le lendemain matin.
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /id="agenda-essai"/, 'aucun moyen d’essayer le réveil');
});
