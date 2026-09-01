import { bandById } from './profile.js';

// Les profils.
//
// Chaque personne a son profil, et chaque profil a **sa** creature, **sa**
// memoire, **son** decor. C'est le point central : une memoire partagee entre
// une grand-mere et un enfant de six ans n'est la memoire de personne. La
// complicite ne se cree que si la creature sait a qui elle parle.
//
// Ce qui est propre au profil : le monstre, les souvenirs, la tranche d'age,
// le mode confort, le prenom et les gouts declares.
// Ce qui reste commun a l'appareil : la voix, le fournisseur d'IA et sa cle,
// le cycle jour/nuit. Ce sont des reglages de materiel, pas de personne.

const INDEX_KEY = 'monstre.profils';
const ACTIVE_KEY = 'monstre.profil.actif';

export const AVATARS = ['🦊', '🐢', '🦉', '🐙', '🦜', '🐝', '🦋', '🐳', '🦔', '🐰', '🌻', '⭐'];

// Gouts proposes a la creation. Cocher trois cases est bien plus facile que
// d'ecrire un paragraphe, surtout pour un enfant ou sur un petit clavier.
export const INTERESTS = [
  { id: 'animaux', label: 'les animaux', emoji: '🐾' },
  { id: 'musique', label: 'la musique', emoji: '🎵' },
  { id: 'cuisine', label: 'la cuisine', emoji: '🍲' },
  { id: 'jardin', label: 'le jardin', emoji: '🌱' },
  { id: 'lecture', label: 'la lecture', emoji: '📚' },
  { id: 'dessin', label: 'le dessin', emoji: '🎨' },
  { id: 'sport', label: 'le sport', emoji: '⚽' },
  { id: 'voyages', label: 'les voyages', emoji: '✈️' },
  { id: 'bricolage', label: 'le bricolage', emoji: '🔧' },
  { id: 'jeux', label: 'les jeux', emoji: '🎲' },
  { id: 'nature', label: 'la nature', emoji: '🌳' },
  { id: 'cinema', label: 'les films', emoji: '🎬' },
  { id: 'histoire', label: 'l’histoire', emoji: '🏛️' },
  { id: 'couture', label: 'la couture', emoji: '🧵' },
  { id: 'peche', label: 'la pêche', emoji: '🎣' },
  { id: 'etoiles', label: 'les étoiles', emoji: '🌙' }
];

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function newId() {
  return `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

// Le prenom seulement, et court. On ne demande jamais de nom de famille : c'est
// inutile pour le jeu et ce serait une donnee personnelle de trop, a plus forte
// raison sur un profil d'enfant.
export function sanitizeProfileName(value) {
  // On n'accepte qu'une chaine : une sauvegarde abimee pouvait contenir un
  // nombre ou un objet, et `String({})` donnait « [object Object] » affiche
  // comme prenom. Rejeter plutot que convertir.
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001f]/g, '')
    .trim()
    .slice(0, 20);
}

function normalizeProfile(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id ? raw.id : newId();
  const known = INTERESTS.map((i) => i.id);
  return {
    id,
    name: sanitizeProfileName(raw.name) || 'Moi',
    avatar: AVATARS.includes(raw.avatar) ? raw.avatar : AVATARS[0],
    band: bandById(raw.band === '12+' ? '12-17' : raw.band).id,
    comfort: raw.comfort === true || raw.comfort === false ? raw.comfort : null,
    interests: Array.isArray(raw.interests) ? raw.interests.filter((i) => known.includes(i)) : [],
    note: String(raw.note || '').slice(0, 120),
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now()
  };
}

export function listProfiles() {
  const raw = read(INDEX_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeProfile).filter(Boolean);
}

function persist(profiles) {
  write(INDEX_KEY, profiles);
}

export function getActiveId() {
  try {
    return localStorage.getItem(ACTIVE_KEY) || null;
  } catch {
    return null;
  }
}

export function setActiveId(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* stockage indisponible */
  }
}

export function getActiveProfile() {
  const id = getActiveId();
  if (!id) return null;
  return listProfiles().find((p) => p.id === id) || null;
}

export function createProfile(data) {
  const profile = normalizeProfile({ ...data, id: newId(), createdAt: Date.now() });
  const profiles = listProfiles();
  profiles.push(profile);
  persist(profiles);
  return profile;
}

export function updateProfile(id, changes) {
  const profiles = listProfiles();
  const index = profiles.findIndex((p) => p.id === id);
  if (index < 0) return null;
  profiles[index] = normalizeProfile({ ...profiles[index], ...changes, id });
  persist(profiles);
  return profiles[index];
}

// La cle de sauvegarde depend du profil : c'est ce qui donne a chacun sa
// creature. Sans profil actif, on retombe sur l'ancienne cle unique.
export function saveKeyFor(id = getActiveId()) {
  return id ? `monstre.save.${id}` : 'monstre.save';
}

export function backupKeyFor(id = getActiveId()) {
  return `${saveKeyFor(id)}.secours`;
}

export function deleteProfile(id) {
  const profiles = listProfiles().filter((p) => p.id !== id);
  persist(profiles);
  try {
    // On garde la copie de secours : supprimer un profil par erreur doit rester
    // rattrapable tant qu'on n'a pas efface les donnees de l'application.
    const save = localStorage.getItem(saveKeyFor(id));
    if (save) localStorage.setItem(backupKeyFor(id), save);
    localStorage.removeItem(saveKeyFor(id));
  } catch {
    /* rien a faire */
  }
  if (getActiveId() === id) setActiveId(profiles.length ? profiles[0].id : null);
  return profiles;
}

export function currentBand() {
  const profile = getActiveProfile();
  return bandById(profile ? profile.band : 'none');
}

// Reprise d'une installation anterieure aux profils : la creature existante
// devient le premier profil au lieu d'etre perdue.
export function migrateLegacy() {
  if (listProfiles().length) return null;
  let legacySave = null;
  let legacyBand = 'none';
  try {
    legacySave =
      localStorage.getItem('monstre.save') ||
      localStorage.getItem('monstre.save.v3') ||
      localStorage.getItem('monstre.save.v2');
    const old = read('monstre.profil', null) || read('monstre.enfant', null);
    if (old && old.age) legacyBand = old.age === '12+' ? '12-17' : old.age;
  } catch {
    /* rien a faire */
  }
  if (!legacySave) return null;

  const profile = createProfile({ name: 'Moi', avatar: AVATARS[0], band: legacyBand });
  try {
    localStorage.setItem(saveKeyFor(profile.id), legacySave);
  } catch {
    /* rien a faire */
  }
  setActiveId(profile.id);
  return profile;
}

// Phrases posees dans la memoire de la creature a la creation du profil. C'est
// ce qui fait qu'elle connait deja un peu la personne des la premiere minute,
// au lieu de partir de zero.
export function seedFacts(profile) {
  const facts = [];
  if (profile.name) {
    facts.push({
      kind: 'name',
      key: 'name',
      value: profile.name,
      text: `Tu t'appelles ${profile.name}.`
    });
  }
  profile.interests.forEach((id) => {
    const item = INTERESTS.find((i) => i.id === id);
    if (!item) return;
    facts.push({
      kind: 'like',
      key: `like:${item.label}`,
      value: item.label,
      text: `Tu aimes ${item.label}.`
    });
  });
  if (profile.note) {
    facts.push({
      kind: 'note',
      key: 'note',
      value: profile.note,
      text: profile.note
    });
  }
  return facts;
}
