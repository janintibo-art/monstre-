import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installEnv } from './_env.mjs';

installEnv();
const P = await import('../src/state/profiles.js');
const { bandById, comfortEnabled } = await import('../src/state/profile.js');
const { createPet } = await import('../src/state/pet.js');
const { createMemory, learn, knownFacts, playerName } = await import('../src/ai/memory.js');

function reset() {
  localStorage.clear();
}

test('chaque profil a sa propre clé de sauvegarde', () => {
  reset();
  const a = P.createProfile({ name: 'Mamie', band: 'senior' });
  const b = P.createProfile({ name: 'Léo', band: '5-6' });
  assert.notEqual(P.saveKeyFor(a.id), P.saveKeyFor(b.id));

  P.setActiveId(a.id);
  const cleA = P.saveKeyFor();
  P.setActiveId(b.id);
  assert.notEqual(P.saveKeyFor(), cleA, 'changer de profil doit changer de sauvegarde');
});

test('le prénom est nettoyé et jamais un roman', () => {
  assert.equal(P.sanitizeProfileName('  Léo  '), 'Léo');
  assert.equal(P.sanitizeProfileName('Bo\u0000b'), 'Bob');
  assert.equal(P.sanitizeProfileName('x'.repeat(80)).length, 20);
  assert.equal(P.sanitizeProfileName(null), '');
});

test('un profil corrompu est ramené à des valeurs sûres', () => {
  reset();
  localStorage.setItem(
    'monstre.profils',
    JSON.stringify([{ id: 'x', name: 42, band: 'dragon', interests: ['pizza', 'musique'], avatar: '💣' }])
  );
  const [p] = P.listProfiles();
  assert.equal(p.name, 'Moi');
  assert.equal(p.band, 'none');
  assert.deepEqual(p.interests, ['musique'], 'les goûts inconnus sont écartés');
  assert.ok(P.AVATARS.includes(p.avatar));
});

test('les goûts cochés deviennent des souvenirs dès la première minute', () => {
  reset();
  const profile = P.createProfile({
    name: 'Mireille',
    band: 'senior',
    interests: ['jardin', 'cuisine'],
    note: 'Mon chat s’appelle Filou.'
  });
  const memory = createMemory();
  P.seedFacts(profile).forEach((f) => learn(memory, f));

  assert.equal(playerName(memory), 'Mireille');
  const textes = knownFacts(memory).map((f) => f.text);
  assert.ok(textes.some((t) => t.includes('jardin')));
  assert.ok(textes.some((t) => t.includes('cuisine')));
  assert.ok(textes.some((t) => t.includes('Filou')));
});

test('supprimer un profil garde une copie de secours et change l’actif', () => {
  reset();
  const a = P.createProfile({ name: 'A', band: 'adulte' });
  const b = P.createProfile({ name: 'B', band: 'adulte' });
  P.setActiveId(a.id);
  localStorage.setItem(P.saveKeyFor(a.id), JSON.stringify(createPet(1)));

  P.deleteProfile(a.id);
  assert.equal(P.listProfiles().length, 1);
  assert.equal(P.getActiveId(), b.id, 'l’actif doit basculer sur un profil existant');
  assert.ok(localStorage.getItem(P.backupKeyFor(a.id)), 'copie de secours manquante');
});

test('une installation sans profils récupère l’ancienne créature', () => {
  reset();
  localStorage.setItem('monstre.save', JSON.stringify({ ...createPet(99), name: 'Nyx' }));
  localStorage.setItem('monstre.profil', JSON.stringify({ age: 'senior' }));

  const profile = P.migrateLegacy();
  assert.ok(profile, 'aucun profil créé');
  assert.equal(profile.band, 'senior', 'l’ancienne tranche d’âge est perdue');
  const moved = JSON.parse(localStorage.getItem(P.saveKeyFor(profile.id)));
  assert.equal(moved.name, 'Nyx', 'la créature n’a pas été reprise');
  assert.equal(P.getActiveId(), profile.id);
});

test('le mode confort est propre à chaque profil', () => {
  reset();
  const mamie = P.createProfile({ name: 'Mamie', band: 'senior' });
  const ado = P.createProfile({ name: 'Ado', band: '12-17' });
  assert.equal(comfortEnabled(bandById(mamie.band), mamie.comfort), true);
  assert.equal(comfortEnabled(bandById(ado.band), ado.comfort), false);

  P.updateProfile(ado.id, { comfort: true });
  const modifie = P.listProfiles().find((p) => p.id === ado.id);
  assert.equal(comfortEnabled(bandById(modifie.band), modifie.comfort), true);
});

test('currentBand suit le profil actif', () => {
  reset();
  const enfant = P.createProfile({ name: 'Léo', band: '5-6' });
  const mamie = P.createProfile({ name: 'Mamie', band: 'senior' });
  P.setActiveId(enfant.id);
  assert.equal(P.currentBand().id, '5-6');
  P.setActiveId(mamie.id);
  assert.equal(P.currentBand().id, 'senior');
});

test('la question « qui joue ? » est posée par défaut', () => {
  reset();
  const a = P.createProfile({ name: 'Mamie', band: 'senior' });
  P.setActiveId(a.id);
  // Sans réglage explicite, on demande. C'est ce qui rend un second profil
  // trouvable : sinon il faudrait penser à le chercher dans les réglages.
  assert.equal(P.canSkipPicker(), false);
});

test('on ne peut sauter la question qu’avec un seul profil', () => {
  reset();
  const a = P.createProfile({ name: 'Seul', band: 'adulte' });
  P.setActiveId(a.id);
  P.saveDirectStart(true);
  assert.equal(P.canSkipPicker(), true, 'un joueur seul doit pouvoir aller droit au but');

  P.createProfile({ name: 'Deuxième', band: '5-6' });
  assert.equal(
    P.canSkipPicker(),
    false,
    'avec deux profils, la question doit revenir : c’est tout leur intérêt'
  );
  P.saveDirectStart(false);
});

test('sans profil actif, la question est posée quoi qu’il arrive', () => {
  reset();
  P.createProfile({ name: 'Personne', band: 'adulte' });
  P.saveDirectStart(true);
  P.setActiveId(null);
  assert.equal(P.canSkipPicker(), false);
  P.saveDirectStart(false);
});
