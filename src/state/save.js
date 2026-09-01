import { createPet, advance, refreshMemory, SAVE_VERSION } from './pet.js';
import { createNeeds, NEEDS } from '../ai/needs.js';
import { TRAITS } from '../ai/personality.js';
import { SPECIES } from '../game/species.js';
import { BIOMES, pickBiomeLegacy } from '../game/biomes.js';

// Sauvegarde. Trois regles, dans cet ordre d'importance :
//
//   1. Ne jamais perdre le monstre. Une sauvegarde d'un ancien format est
//      migree, jamais jetee. Avant chaque migration, une copie de secours est
//      gardee sous une autre cle.
//   2. Ne jamais faire confiance au contenu. Une valeur manquante, NaN, hors
//      bornes ou d'un type inattendu est ramenee a une valeur sure, champ par
//      champ, plutot que de faire planter l'affichage.
//   3. Pouvoir exporter et importer. Un fichier JSON que le joueur garde chez
//      lui, c'est la seule vraie assurance contre un telephone perdu.

import { saveKeyFor, backupKeyFor } from './profiles.js';

// La cle depend du profil actif : chaque personne a sa creature et ses
// souvenirs. Sans profil, on retombe sur l'ancienne cle unique, ce qui permet
// de lire une installation anterieure aux profils.
const LEGACY_KEYS = ['monstre.save', 'monstre.save.v3', 'monstre.save.v2'];

const MAX_CATCHUP_SECONDS = 12 * 3600;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000; // tolerance d'horloge dereglee

/* ------------------------------------------------------------ validation */

function num(value, fallback, min = -Infinity, max = Infinity) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function str(value, fallback, max = 64) {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/[\u0000-\u001f]/g, '').trim().slice(0, max);
  return cleaned || fallback;
}

export function sanitizeName(value, fallback = 'Nyx') {
  return str(value, fallback, 16);
}

// Ramene une sauvegarde dans des bornes sures. Ne cree rien : suppose un objet.
export function normalize(pet) {
  const fresh = createPet(num(pet.seed, Date.now() >>> 0, 1, 4294967295));
  const now = Date.now();

  const out = {
    ...fresh,
    ...pet,
    version: SAVE_VERSION,
    seed: fresh.seed,
    name: sanitizeName(pet.name, pet.hatched ? 'Nyx' : 'Œuf'),
    hatched: Boolean(pet.hatched),
    hatchProgress: num(pet.hatchProgress, 0, 0, 1),
    taps: num(pet.taps, 0, 0, 1e6),
    createdAt: num(pet.createdAt, now, 0, now + MAX_FUTURE_SKEW_MS),
    lastSeen: num(pet.lastSeen, now, 0, now + MAX_FUTURE_SKEW_MS),
    age: num(pet.age, 0, 0, 1e9),
    growth: num(pet.growth, 0, 0, 1e9)
  };

  const stages = ['egg', 'baby', 'child', 'teen', 'adult'];
  out.stage = stages.includes(pet.stage) ? pet.stage : out.hatched ? 'baby' : 'egg';
  if (!out.hatched) out.stage = 'egg';

  out.species = SPECIES.some((s) => s.id === pet.species) ? pet.species : fresh.species;

  // Le genome enregistre est conserve tel quel. On ne le reconstruit que s'il
  // manque ou s'il est abime : le regenerer systematiquement ferait changer
  // d'apparence toutes les creatures le jour ou l'on corrige le generateur
  // aleatoire. Une creature doit rester la meme.
  const genome = pet.genome;
  const genomeValide =
    genome &&
    typeof genome === 'object' &&
    Number.isFinite(genome.hue) &&
    Number.isFinite(genome.saturation);
  out.genome = genomeValide ? { ...genome, seed: out.seed } : fresh.genome;

  out.biome = BIOMES.some((b) => b.id === pet.biome) ? pet.biome : fresh.biome;

  const needs = createNeeds();
  NEEDS.forEach((key) => {
    needs[key] = num(pet.needs && pet.needs[key], needs[key], 0, 100);
  });
  out.needs = needs;

  const personality = { ...fresh.personality };
  TRAITS.forEach((trait) => {
    personality[trait] = num(
      pet.personality && pet.personality[trait],
      personality[trait],
      0.05,
      0.95
    );
  });
  out.personality = personality;

  out.memory = pet.memory && typeof pet.memory === 'object' ? pet.memory : fresh.memory;
  refreshMemory(out);
  // Bornes sur les textes de memoire : une sauvegarde importee peut charrier
  // n'importe quoi, et un souvenir de 100 000 caracteres bloquerait l'ecran.
  out.memory.facts = (out.memory.facts || []).slice(0, 60).map((f) => ({
    ...f,
    text: str(f.text, '', 200),
    value: str(f.value, '', 80),
    strength: num(f.strength, 1, 0, 3)
  }));
  out.memory.dialogue = (out.memory.dialogue || [])
    .slice(-40)
    .map((d) => ({ ...d, text: str(d.text, '', 240) }));

  return out;
}

/* ------------------------------------------------------------- migration */

// Chaine de migrations, une etape par version. Chaque fonction recoit une
// sauvegarde de version N et renvoie une version N+1. Ajouter une version,
// c'est ajouter une entree ici — jamais toucher aux precedentes.
const MIGRATIONS = {
  // v1 -> v2 : la memoire a gagne les faits, le dialogue et les moments.
  1: (pet) => ({ ...pet, version: 2 }),
  // v2 -> v3 : arrivee des especes. L'espece se deduit de la graine.
  2: (pet) => ({ ...pet, version: 3, species: createPet(pet.seed).species }),
  // v3 -> v4 : normalisation systematique ; rien a transformer, tout a borner.
  3: (pet) => ({ ...pet, version: 4 }),
  // v4 -> v5 : le paysage devient une donnee enregistree. Pour une creature
  // deja nee, on le recalcule avec l'ancien generateur afin qu'elle retrouve
  // exactement le decor qu'elle avait.
  4: (pet) => ({
    ...pet,
    version: 5,
    biome: pet.biome || pickBiomeLegacy(Number(pet.seed) || 1).id
  })
};

export function migrate(raw) {
  let pet = raw;
  let guard = 0;
  while (pet.version < SAVE_VERSION && guard < 20) {
    const step = MIGRATIONS[pet.version];
    if (!step) break;
    pet = step(pet);
    guard += 1;
  }
  return normalize(pet);
}

/* ------------------------------------------------------------ stockage */

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
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

export function load() {
  // On cherche d'abord la cle courante, puis les anciennes : un joueur qui met
  // a jour ne doit pas se retrouver avec un oeuf vierge.
  const KEY = saveKeyFor();
  const BACKUP_KEY = backupKeyFor();
  let stored = read(KEY);
  let fromLegacy = false;
  if (!stored) {
    for (const key of LEGACY_KEYS) {
      if (key === KEY) continue;
      stored = read(key);
      if (stored) {
        fromLegacy = true;
        break;
      }
    }
  }

  if (!stored || typeof stored !== 'object') {
    return { pet: createPet(), offlineSeconds: 0, fresh: true, migrated: false };
  }

  const needsMigration = fromLegacy || stored.version !== SAVE_VERSION;
  if (needsMigration) write(BACKUP_KEY, stored); // avant de toucher a quoi que ce soit

  let pet;
  try {
    pet = migrate({ version: num(stored.version, 1, 1, 99), ...stored });
  } catch {
    // Migration impossible : on garde la copie de secours et on repart. C'est le
    // seul cas ou un oeuf vierge est acceptable, et la sauvegarde reste
    // recuperable dans BACKUP_KEY.
    return { pet: createPet(), offlineSeconds: 0, fresh: true, migrated: false, failed: true };
  }

  const elapsed = Math.max(0, (Date.now() - pet.lastSeen) / 1000);
  const applied = Math.min(elapsed, MAX_CATCHUP_SECONDS);
  advance(pet, applied, { asleep: applied > 3600 });
  pet.lastSeen = Date.now();

  if (needsMigration) write(KEY, pet);
  return { pet, offlineSeconds: elapsed, fresh: false, migrated: needsMigration };
}

export function save(pet) {
  pet.lastSeen = Date.now();
  return write(saveKeyFor(), pet);
}

export function reset() {
  try {
    // La sauvegarde courante devient la copie de secours : un reset par erreur
    // reste rattrapable via l'import. On ne touche qu'au profil actif.
    const key = saveKeyFor();
    const current = localStorage.getItem(key);
    if (current) localStorage.setItem(backupKeyFor(), current);
    localStorage.removeItem(key);
  } catch {
    /* rien a faire */
  }
}

/* ------------------------------------------------------- export / import */

export function exportSave(pet) {
  return JSON.stringify({ format: 'monstre-de-compagnie', exported: Date.now(), pet }, null, 2);
}

// Renvoie { pet } ou { error }. Ne remplace jamais la sauvegarde courante
// lui-meme : c'est a l'appelant de confirmer, apres avoir vu le nom du monstre.
export function parseImport(text) {
  let data;
  try {
    data = JSON.parse(String(text));
  } catch {
    return { error: 'Ce fichier n’est pas une sauvegarde valide.' };
  }
  const raw = data && data.pet ? data.pet : data;
  if (!raw || typeof raw !== 'object' || raw.seed === undefined) {
    return { error: 'Aucun monstre trouvé dans ce fichier.' };
  }
  try {
    return { pet: migrate({ version: num(raw.version, 1, 1, 99), ...raw }) };
  } catch {
    return { error: 'La sauvegarde n’a pas pu être lue.' };
  }
}

export function restoreBackup() {
  const backup = read(backupKeyFor());
  if (!backup) return null;
  try {
    return migrate({ version: num(backup.version, 1, 1, 99), ...backup });
  } catch {
    return null;
  }
}

// Sauvegarde periodique + a chaque passage en arriere-plan. Le nettoyage retire
// tous les ecouteurs, y compris pagehide, qui restait accroche auparavant.
export function autosave(getPet, intervalMs = 10000) {
  const timer = setInterval(() => save(getPet()), intervalMs);
  const onHide = () => {
    if (document.visibilityState === 'hidden') save(getPet());
  };
  const onPageHide = () => save(getPet());
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', onPageHide);
  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', onPageHide);
  };
}
