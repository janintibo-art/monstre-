// Orientation de l'ecran.
//
// Le jeu se verrouille en paysage : c'est la seule facon de voir la creature
// correctement. En portrait, le champ horizontal est si etroit qu'il fallait
// retrecir l'aire de jeu au point qu'elle ne servait plus a rien.
//
// Les panneaux — reglages, souvenirs, conversation — liberent le verrou : ce
// sont des listes et des formulaires, ils se lisent mieux a la verticale et le
// clavier y prend moins de place.
//
// Sur navigateur et sur la version Windows, il n'y a rien a verrouiller : les
// appels echouent silencieusement et le jeu fonctionne normalement.

let plugin = null;
let checked = false;
let locked = false;

async function getPlugin() {
  if (checked) return plugin;
  checked = true;
  try {
    const module = await import('@capacitor/screen-orientation');
    plugin = module.ScreenOrientation || null;
  } catch {
    plugin = null;
  }
  return plugin;
}

export async function lockLandscape() {
  if (locked) return;
  locked = true;
  const api = await getPlugin();
  if (!api) return;
  try {
    await api.lock({ orientation: 'landscape' });
  } catch {
    /* navigateur ou plateforme sans verrou : on continue */
  }
}

export async function unlockOrientation() {
  if (!locked) return;
  locked = false;
  const api = await getPlugin();
  if (!api) return;
  try {
    await api.unlock();
  } catch {
    /* rien a faire */
  }
}

// Appele par les panneaux : ouvert, on libere ; ferme, on reverrouille.
export function setPanelOpen(open) {
  if (open) unlockOrientation();
  else lockLandscape();
}
