import { triggerTime, leadById, typeById } from './parse.js';

// Les pense-bêtes, rangés par profil.
//
// Chaque personne a les siens : le rendez-vous chez le médecin de la
// grand-mère n'a rien à faire chez son petit-fils. Même principe que la
// mémoire et la créature.

const MAX = 60;

function key(profileId) {
  return `monstre.agenda.${profileId || 'defaut'}`;
}

function read(profileId) {
  try {
    const raw = localStorage.getItem(key(profileId));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.map(normalizeItem).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function write(profileId, list) {
  try {
    localStorage.setItem(key(profileId), JSON.stringify(list.slice(0, MAX)));
    return true;
  } catch {
    return false;
  }
}

function normalizeItem(item) {
  if (!item || typeof item !== 'object') return null;
  const at = Number(item.at);
  if (!Number.isFinite(at)) return null;
  return {
    id: String(item.id || `r${at}`),
    subject: String(item.subject || '').slice(0, 120),
    type: typeById(item.type).id,
    at,
    lead: item.lead && typeof item.lead === 'object' ? item.lead : leadById('1h'),
    recurrence: item.recurrence || null,
    done: Boolean(item.done),
    createdAt: Number(item.createdAt) || at,
    source: String(item.source || '').slice(0, 200)
  };
}

export function listReminders(profileId) {
  return read(profileId).sort((a, b) => a.at - b.at);
}

export function addReminder(profileId, data) {
  const list = read(profileId);
  const item = normalizeItem({
    ...data,
    id: `r${Date.now().toString(36)}${Math.floor(Math.random() * 1e3).toString(36)}`,
    createdAt: Date.now()
  });
  if (!item) return null;
  list.push(item);
  write(profileId, list);
  return item;
}

export function removeReminder(profileId, id) {
  const list = read(profileId).filter((r) => r.id !== id);
  write(profileId, list);
  return list;
}

// Marque comme fait. Un rendez-vous qui se répète n'est pas supprimé : il est
// reporté à la fois suivante.
export function completeReminder(profileId, id) {
  const list = read(profileId);
  const item = list.find((r) => r.id === id);
  if (!item) return null;

  if (item.recurrence) {
    const next = new Date(item.at);
    const every = item.recurrence.every;
    if (every === 'day') next.setDate(next.getDate() + 1);
    else if (every === 'week') next.setDate(next.getDate() + 7);
    else if (every === 'month') next.setMonth(next.getMonth() + 1);
    else next.setDate(next.getDate() + 1);
    item.at = next.getTime();
    item.done = false;
  } else {
    item.done = true;
  }
  write(profileId, list);
  return item;
}

// Nettoyage : les rendez-vous passés depuis plus de deux jours s'effacent.
// Assez long pour qu'on les retrouve le lendemain si on a raté le rappel.
export function prune(profileId, now = Date.now()) {
  const limite = now - 2 * 86400000;
  const list = read(profileId).filter((r) => r.recurrence || r.at > limite);
  write(profileId, list);
  return list;
}

// Les rappels dont l'heure est arrivée et qui n'ont pas encore été acquittés.
export function dueReminders(profileId, now = Date.now()) {
  return listReminders(profileId).filter(
    (r) => !r.done && triggerTime(r.at, r.lead) <= now && r.at > now - 6 * 3600000
  );
}

export function upcoming(profileId, now = Date.now()) {
  return listReminders(profileId).filter((r) => !r.done && r.at > now);
}

// Regroupe par jour, pour l'affichage de l'agenda. Un rappel qui se répète est
// projeté sur ses prochaines occurrences : sinon un réveil quotidien
// n'apparaîtrait qu'une fois, et l'agenda mentirait sur la semaine à venir.
export function parJour(profileId, jours = 7, now = Date.now()) {
  const debut = new Date(now);
  debut.setHours(0, 0, 0, 0);
  const fin = debut.getTime() + jours * 86400000;

  const occurrences = [];
  listReminders(profileId).forEach((item) => {
    if (item.done) return;

    if (!item.recurrence) {
      if (item.at >= debut.getTime() && item.at < fin) occurrences.push({ ...item });
      return;
    }

    // On avance de proche en proche jusqu'à sortir de la fenêtre. Une borne
    // dure évite qu'une récurrence mal formée fasse tourner la boucle sans fin.
    const pas = item.recurrence.every;
    let quand = new Date(item.at);
    for (let garde = 0; garde < 400 && quand.getTime() < fin; garde += 1) {
      if (quand.getTime() >= debut.getTime()) {
        occurrences.push({ ...item, at: quand.getTime(), repete: true });
      }
      const suivant = new Date(quand);
      if (pas === 'day') suivant.setDate(suivant.getDate() + 1);
      else if (pas === 'week') suivant.setDate(suivant.getDate() + 7);
      else if (pas === 'month') suivant.setMonth(suivant.getMonth() + 1);
      else suivant.setDate(suivant.getDate() + 1);
      if (suivant.getTime() <= quand.getTime()) break;
      quand = suivant;
    }
  });

  occurrences.sort((a, b) => a.at - b.at);

  const groupes = [];
  occurrences.forEach((o) => {
    const jour = new Date(o.at);
    jour.setHours(0, 0, 0, 0);
    const cle = jour.getTime();
    let groupe = groupes.find((g) => g.jour === cle);
    if (!groupe) {
      groupe = { jour: cle, items: [] };
      groupes.push(groupe);
    }
    groupe.items.push(o);
  });
  return groupes;
}
