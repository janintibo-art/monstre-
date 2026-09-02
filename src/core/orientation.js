// Orientation de l'écran.
//
// **Le jeu est en paysage, les écrans de lecture ne le sont pas.** La créature
// a besoin de largeur ; une liste de réglages, un guide, une conversation ou un
// formulaire de profil se lisent mieux à la verticale, et le clavier y prend
// moins de place.
//
// Le verrou paysage par défaut est posé dans le manifeste Android, donc appliqué
// dès la création de la fenêtre. Ce module ne fait que le **lever** pendant
// qu'un écran de lecture est ouvert, et le **remettre** quand tout est refermé.
//
// Le suivi se fait par un ensemble de noms, pas par un booléen : plusieurs
// écrans peuvent se succéder ou se chevaucher, et fermer le second ne doit pas
// reverrouiller pendant que le premier est encore là.

let plugin = null;
let checked = false;
let etatVoulu = null; // 'paysage' | 'libre'
const ouverts = new Set();

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

async function appliquer(etat) {
  if (etat === etatVoulu) return;
  etatVoulu = etat;
  const api = await getPlugin();
  if (!api) return; // navigateur ou Windows : rien à verrouiller
  try {
    if (etat === 'paysage') await api.lock({ orientation: 'landscape' });
    else await api.unlock();
  } catch {
    // Sur certaines plateformes l'appel échoue sans conséquence : le manifeste
    // garde le comportement par défaut, on n'insiste pas.
  }
}

export function lockLandscape() {
  return appliquer('paysage');
}

export function unlockOrientation() {
  return appliquer('libre');
}

// Déclaré par chaque écran qui s'ouvre ou se ferme. Le nom sert à distinguer
// les écrans entre eux ; sa valeur exacte n'a pas d'importance.
export function setScreenOpen(nom, ouvert) {
  if (ouvert) ouverts.add(nom);
  else ouverts.delete(nom);
  return ouverts.size ? unlockOrientation() : lockLandscape();
}

// Ancienne signature, conservée : un booléen unique pour l'ensemble des
// panneaux de réglages.
export function setPanelOpen(ouvert) {
  return setScreenOpen('reglages', ouvert);
}

export function screensOpen() {
  return [...ouverts];
}
