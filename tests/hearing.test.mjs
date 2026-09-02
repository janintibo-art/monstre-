import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installEnv } from './_env.mjs';

installEnv();
const H = await import('../src/audio/hearing.js');

test('les nombres dits en toutes lettres deviennent des chiffres', () => {
  const cas = {
    'douze': '12',
    'vingt deux': '22',
    'vingt-deux': '22',
    'vingt et un': '21',
    'quatre vingt': '80',
    'soixante dix': '70',
    'soixante quinze': '75',
    'quatre vingt dix': '90',
    'quatre vingt dix neuf': '99',
    'dix sept': '17',
    'cent': '100',
    'trente cinq': '35',
    'ça fait quinze': 'ca fait 15',
    'je dirais quarante huit': 'je dirais 48'
  };
  Object.entries(cas).forEach(([dit, attendu]) => {
    assert.equal(H.parseNumbers(dit), attendu, `« ${dit} »`);
  });
});

test('« et » ne fusionne que dans un nombre', () => {
  assert.equal(H.parseNumbers('toi et moi'), 'toi et moi');
  assert.equal(H.parseNumbers('vingt et un'), '21');
});

test('le nom de la créature est rattrapé quand le moteur l’écorche', () => {
  const lex = H.contextLexicon({ pet: { name: 'Nyx' }, profile: { name: 'Mireille' } });
  assert.equal(H.correct('bonjour nixe', lex), 'bonjour nyx');
  assert.equal(H.correct('salut mireil', lex), 'salut mireille');
});

test('un mot légitime n’est jamais transformé', () => {
  const lex = H.contextLexicon({ pet: { name: 'Nyx' } });
  // « bonjour » est correct : il doit rester intact.
  assert.equal(H.correct('bonjour', lex), 'bonjour');
  // Un mot court et éloigné ne doit pas être tiré vers le vocabulaire.
  assert.equal(H.correct('chaise', lex), 'chaise');
  assert.equal(H.correct('le', lex), 'le');
});

test('l’alternative qui contient la réponse attendue gagne', () => {
  const lex = H.contextLexicon({ expected: ['Bordeaux', 'Lyon', 'Nantes'] });
  const alternatives = [
    { text: 'beau dos', confidence: 0.9 },
    { text: 'Bordeaux', confidence: 0.4 }
  ];
  assert.equal(H.pickBest(alternatives, lex).text, 'Bordeaux');
});

test('sans vocabulaire, on garde l’hypothèse la mieux classée', () => {
  const lex = H.createLexicon([]);
  const alternatives = [{ text: 'quelque chose', confidence: 0.9 }, { text: 'autre', confidence: 0.2 }];
  assert.equal(H.pickBest(alternatives, lex).text, 'quelque chose');
});

test('un bruit isolé n’est pas pris pour une réponse', () => {
  const lex = H.contextLexicon({});
  assert.equal(H.understand([{ text: 'eu', confidence: 0.2 }], lex).confident, false);
  assert.equal(H.understand([{ text: '', confidence: 0.9 }], lex).confident, false);
  assert.equal(H.understand([], lex).reason, 'silence');
  assert.equal(H.understand([{ text: 'bonjour', confidence: 0.8 }], lex).confident, true);
});

test('répondre à un jeu à la voix', () => {
  const choix = [
    { key: 'rouge', label: 'rouge' },
    { key: 'bleu', label: 'bleu' },
    { key: 'vert', label: 'vert' }
  ];
  assert.equal(H.matchChoice('rouge', choix).key, 'rouge');
  assert.equal(H.matchChoice('je dirais le bleu', choix).key, 'bleu');
  assert.equal(H.matchChoice('rouje', choix).key, 'rouge', 'petite erreur non rattrapée');
  assert.equal(H.matchChoice('je ne sais pas', choix), null, 'faux positif');
});

test('répondre un nombre à la voix', () => {
  const choix = [
    { key: '12', label: '12' },
    { key: '14', label: '14' },
    { key: '22', label: '22' }
  ];
  assert.equal(H.matchChoice('vingt deux', choix).key, '22');
  assert.equal(H.matchChoice('ça fait douze', choix).key, '12');
  assert.equal(H.matchChoice('quarante', choix), null);
});

test('répondre une phrase entière à la voix', () => {
  const choix = [
    { key: 'vole un bœuf', label: 'vole un bœuf' },
    { key: 'perd sa place', label: 'perd sa place' }
  ];
  assert.equal(H.matchChoice('vole un boeuf', choix).key, 'vole un bœuf');
});

test('la distance d’édition s’arrête au seuil', () => {
  assert.equal(H.distance('chat', 'chat'), 0);
  assert.equal(H.distance('chat', 'chats'), 1);
  assert.ok(H.distance('chat', 'bibliotheque', 3) > 3);
});

test('le délai avant le premier mot est bien plus long que celui du silence', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync('src/audio/listen.js', 'utf8');

  const premier = Number((source.match(/const PREMIER_MOT_MS = (\d+)/) || [])[1]);
  const lent = Number((source.match(/slow:\s*(\d+)/) || [])[1]);

  // Entre l'appui sur le micro et le premier mot, il se passe facilement
  // plusieurs secondes : on réfléchit, on approche le téléphone. Armer le
  // compte à rebours de fin de phrase dès le départ terminait la session sur
  // « je n'ai rien entendu » avant qu'on ait ouvert la bouche.
  assert.ok(premier >= 8000, 'délai avant le premier mot trop court');
  assert.ok(premier > lent * 3, 'le délai d’attente doit être bien plus long que celui du silence');
});

test('le compte à rebours court ne s’arme qu’après avoir capté un mot', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync('src/audio/listen.js', 'utf8');
  const fonction = source.slice(source.indexOf('function bumpSilence'), source.indexOf('function capter'));
  assert.match(fonction, /entendu\s*\?/, 'le délai ne dépend pas de ce qui a été capté');
});
