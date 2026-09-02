import { triggerTime, formatWhen, typeById } from './parse.js';

// La créature qui vient marcher sur l'écran du téléphone.
//
// Modèle d'activation, c'est le point important : **rien ne tourne en fond**.
// On programme une alarme système à l'heure du rappel ; Android réveille
// l'application à ce moment-là, la créature apparaît quelques minutes, puis
// tout s'éteint. Entre deux rendez-vous, le coût en batterie est nul.
//
// C'est la différence avec un compagnon d'écran classique, qui maintient un
// service en permanence et vide la batterie dans la journée.

const DUREE_MS = 3 * 60 * 1000; // au-delà, elle rentre d'elle-même

let plugin = null;
let checked = false;

// ⚠️ Un module Capacitor ne doit JAMAIS être renvoyé par une fonction `async`.
//
// Ce qu'il renvoie est un proxy : toute propriété qu'on lui demande devient un
// appel natif. Or JavaScript, en résolvant une fonction asynchrone, interroge
// `.then` sur la valeur produite pour savoir si c'est une promesse. Le proxy
// répond donc « la méthode then n'existe pas », et le rejet part sans que
// personne l'attende.
//
// On garde donc le module dans une variable et l'on ne renvoie rien.
async function chargerPlugin() {
  if (checked) return;
  checked = true;
  try {
    const module = await import('monstre-overlay');
    const candidat = module.MonstreOverlay || null;
    if (candidat) {
      const { supported } = await candidat.isSupported();
      plugin = supported ? candidat : null;
    }
  } catch {
    plugin = null;
  }
}

function api() {
  return plugin;
}

export async function available() {
  await chargerPlugin();
  return Boolean(api());
}

export async function hasPermission() {
  await chargerPlugin();
  if (!api()) return false;
  try {
    const { granted } = await api().hasPermission();
    return Boolean(granted);
  } catch {
    return false;
  }
}

// L'autorisation « par-dessus les autres applications » ne se demande pas par
// une boîte de dialogue : Android impose de passer par ses réglages. On y
// emmène l'utilisateur, et on revérifie à son retour.
export async function requestPermission() {
  await chargerPlugin();
  if (!api()) return false;
  try {
    const { granted } = await api().requestPermission();
    return Boolean(granted);
  } catch {
    return false;
  }
}

function spriteFor(speciesFolder) {
  // Chemin dans les assets natifs, copiés au moment de la compilation.
  return `https://appassets.androidplatform.net/assets/sprites/${speciesFolder}.png`;
}

export async function schedule(reminder, speciesFolder) {
  await chargerPlugin();
  if (!api()) return false;
  if (!(await hasPermission())) return false;

  const at = triggerTime(reminder.at, reminder.lead);
  if (at <= Date.now()) return false;

  try {
    const { scheduled } = await api().schedule({
      id: reminder.id,
      at,
      text: reminder.subject || 'Rendez-vous',
      when: formatWhen(reminder.at, new Date(at)),
      sprite: spriteFor(speciesFolder),
      // Un réveil insiste plus longtemps qu'un rendez-vous : c'est sa raison
      // d'être. Trois minutes pour l'un, cinq pour l'autre.
      timeoutMs: typeById(reminder.type).duree || DUREE_MS
    });
    return Boolean(scheduled);
  } catch {
    return false;
  }
}

export async function cancel(reminder) {
  await chargerPlugin();
  if (!api()) return;
  try {
    await api().cancel({ id: reminder.id });
  } catch {
    /* rien a faire */
  }
}

export async function rescheduleAll(reminders, speciesFolder) {
  await chargerPlugin();
  if (!api()) return 0;
  let count = 0;
  for (const reminder of reminders) {
    if (reminder.done) continue;
    if (await schedule(reminder, speciesFolder)) count += 1;
  }
  return count;
}

// Affichage immédiat : c'est le bouton d'essai des réglages, pour vérifier que
// l'autorisation fonctionne sans attendre un vrai rendez-vous.
export async function preview(text, speciesFolder) {
  await chargerPlugin();
  if (!api()) return false;
  try {
    const { shown } = await api().show({
      text: text || 'Coucou, je me promène.',
      when: 'Touche-moi pour que je rentre',
      sprite: spriteFor(speciesFolder),
      timeoutMs: 45000
    });
    return Boolean(shown);
  } catch {
    return false;
  }
}
