import { triggerTime } from './parse.js';
import { formatWhen } from './parse.js';

// Notifications système.
//
// L'application n'est pas ouverte au moment du rendez-vous : sans notification,
// un pense-bête ne sert à rien. On passe par le module natif de Capacitor,
// chargé à la demande — sur navigateur et sous Windows il n'existe pas, et le
// jeu doit continuer de fonctionner sans.

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
    const module = await import('@capacitor/local-notifications');
    plugin = module.LocalNotifications || null;
  } catch {
    plugin = null;
  }
}

// Renvoie le module, ou null. Volontairement synchrone : l'appelant doit avoir
// appelé `chargerPlugin()` juste avant.
function api() {
  return plugin;
}

export async function available() {
  await chargerPlugin();
  return Boolean(api());
}

export async function ensurePermission() {
  await chargerPlugin();
  if (!api()) return false;
  try {
    const status = await api().checkPermissions();
    if (status.display === 'granted') return true;
    const asked = await api().requestPermissions();
    return asked.display === 'granted';
  } catch {
    return false;
  }
}

// Un identifiant numérique stable, dérivé de l'identifiant texte : le module
// natif n'accepte que des entiers.
function numericId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  return Math.abs(h % 2000000) + 1;
}

export async function schedule(reminder, petName = 'Ton monstre') {
  await chargerPlugin();
  if (!api()) return false;
  const when = triggerTime(reminder.at, reminder.lead);
  if (when <= Date.now()) return false;

  try {
    await api().schedule({
      notifications: [
        {
          id: numericId(reminder.id),
          title: `${petName} te rappelle`,
          body: reminder.subject
            ? `${reminder.subject} — ${formatWhen(reminder.at, new Date(when))}`
            : `Rendez-vous ${formatWhen(reminder.at, new Date(when))}`,
          schedule: { at: new Date(when), allowWhileIdle: true },
          // La notification reste tant qu'on ne l'a pas ouverte : c'est
          // l'équivalent le plus proche d'une créature qui attend qu'on la
          // remarque.
          ongoing: false,
          autoCancel: true,
          smallIcon: 'ic_stat_icon_config_sample',
          extra: { reminderId: reminder.id }
        }
      ]
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancel(reminder) {
  await chargerPlugin();
  if (!api()) return;
  try {
    await api().cancel({ notifications: [{ id: numericId(reminder.id) }] });
  } catch {
    /* rien a faire */
  }
}

// Rebranche toutes les notifications. Utile au démarrage : Android efface les
// notifications programmées au redémarrage du téléphone.
export async function rescheduleAll(reminders, petName) {
  await chargerPlugin();
  if (!api()) return 0;
  let count = 0;
  for (const reminder of reminders) {
    if (reminder.done) continue;
    if (await schedule(reminder, petName)) count += 1;
  }
  return count;
}

// Ouvre l'application sur le bon pense-bête quand on touche la notification.
export async function onTap(handler) {
  await chargerPlugin();
  if (!api()) return;
  try {
    await api().addListener('localNotificationActionPerformed', (event) => {
      const id = event?.notification?.extra?.reminderId;
      if (id) handler(id);
    });
  } catch {
    /* rien a faire */
  }
}
