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

async function getPlugin() {
  if (checked) return plugin;
  checked = true;
  try {
    const module = await import('@capacitor/local-notifications');
    plugin = module.LocalNotifications || null;
  } catch {
    plugin = null;
  }
  return plugin;
}

export async function available() {
  return Boolean(await getPlugin());
}

export async function ensurePermission() {
  const api = await getPlugin();
  if (!api) return false;
  try {
    const status = await api.checkPermissions();
    if (status.display === 'granted') return true;
    const asked = await api.requestPermissions();
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
  const api = await getPlugin();
  if (!api) return false;
  const when = triggerTime(reminder.at, reminder.lead);
  if (when <= Date.now()) return false;

  try {
    await api.schedule({
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
  const api = await getPlugin();
  if (!api) return;
  try {
    await api.cancel({ notifications: [{ id: numericId(reminder.id) }] });
  } catch {
    /* rien a faire */
  }
}

// Rebranche toutes les notifications. Utile au démarrage : Android efface les
// notifications programmées au redémarrage du téléphone.
export async function rescheduleAll(reminders, petName) {
  const api = await getPlugin();
  if (!api) return 0;
  let count = 0;
  for (const reminder of reminders) {
    if (reminder.done) continue;
    if (await schedule(reminder, petName)) count += 1;
  }
  return count;
}

// Ouvre l'application sur le bon pense-bête quand on touche la notification.
export async function onTap(handler) {
  const api = await getPlugin();
  if (!api) return;
  try {
    await api.addListener('localNotificationActionPerformed', (event) => {
      const id = event?.notification?.extra?.reminderId;
      if (id) handler(id);
    });
  } catch {
    /* rien a faire */
  }
}
