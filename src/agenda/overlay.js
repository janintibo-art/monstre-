import { triggerTime, formatWhen } from './parse.js';

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

async function getPlugin() {
  if (checked) return plugin;
  checked = true;
  try {
    const module = await import('monstre-overlay');
    plugin = module.MonstreOverlay || null;
    if (plugin) {
      const { supported } = await plugin.isSupported();
      if (!supported) plugin = null;
    }
  } catch {
    plugin = null;
  }
  return plugin;
}

export async function available() {
  return Boolean(await getPlugin());
}

export async function hasPermission() {
  const api = await getPlugin();
  if (!api) return false;
  try {
    const { granted } = await api.hasPermission();
    return Boolean(granted);
  } catch {
    return false;
  }
}

// L'autorisation « par-dessus les autres applications » ne se demande pas par
// une boîte de dialogue : Android impose de passer par ses réglages. On y
// emmène l'utilisateur, et on revérifie à son retour.
export async function requestPermission() {
  const api = await getPlugin();
  if (!api) return false;
  try {
    const { granted } = await api.requestPermission();
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
  const api = await getPlugin();
  if (!api) return false;
  if (!(await hasPermission())) return false;

  const at = triggerTime(reminder.at, reminder.lead);
  if (at <= Date.now()) return false;

  try {
    const { scheduled } = await api.schedule({
      id: reminder.id,
      at,
      text: reminder.subject || 'Rendez-vous',
      when: formatWhen(reminder.at, new Date(at)),
      sprite: spriteFor(speciesFolder),
      timeoutMs: DUREE_MS
    });
    return Boolean(scheduled);
  } catch {
    return false;
  }
}

export async function cancel(reminder) {
  const api = await getPlugin();
  if (!api) return;
  try {
    await api.cancel({ id: reminder.id });
  } catch {
    /* rien a faire */
  }
}

export async function rescheduleAll(reminders, speciesFolder) {
  const api = await getPlugin();
  if (!api) return 0;
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
  const api = await getPlugin();
  if (!api) return false;
  try {
    const { shown } = await api.show({
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
