import { createPet, advance, SAVE_VERSION } from './pet.js';

export const SAVE_KEY = 'monstre.save.v3';
const KEY = SAVE_KEY;

// Plafond de rattrapage : meme absent trois semaines, le joueur ne retrouve
// pas un monstre a zero partout. Douze heures de degradation maximum.
const MAX_CATCHUP_SECONDS = 12 * 3600;

export function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return { pet: createPet(), offlineSeconds: 0, fresh: true };
  }
  if (!raw) return { pet: createPet(), offlineSeconds: 0, fresh: true };

  try {
    const pet = JSON.parse(raw);
    if (!pet || pet.version !== SAVE_VERSION) {
      return { pet: createPet(), offlineSeconds: 0, fresh: true };
    }
    const elapsed = Math.max(0, (Date.now() - (pet.lastSeen || Date.now())) / 1000);
    const applied = Math.min(elapsed, MAX_CATCHUP_SECONDS);
    // La nuit compte comme du sommeil : le monstre recupere de l'energie.
    advance(pet, applied, { asleep: applied > 3600 });
    pet.lastSeen = Date.now();
    return { pet, offlineSeconds: elapsed, fresh: false };
  } catch {
    return { pet: createPet(), offlineSeconds: 0, fresh: true };
  }
}

export function save(pet) {
  pet.lastSeen = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(pet));
    return true;
  } catch {
    return false;
  }
}

export function reset() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* rien a faire */
  }
}

// Sauvegarde periodique + a chaque fois que l'application passe en arriere-plan.
export function autosave(getPet, intervalMs = 10000) {
  const timer = setInterval(() => save(getPet()), intervalMs);
  const onHide = () => {
    if (document.visibilityState === 'hidden') save(getPet());
  };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', () => save(getPet()));
  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onHide);
  };
}
