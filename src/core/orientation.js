// Orientation de l'écran.
//
// **Le jeu est en paysage, les écrans de lecture ne le sont pas.** La créature
// a besoin de largeur ; une liste de réglages, un guide, une conversation ou un
// formulaire de profil se lisent mieux à la verticale, et le clavier y prend
// moins de place.
//
// Les deux orientations sont **imposées**, jamais simplement libérées.
//
// Se contenter de lever le verrou ne suffit pas : cela rend la main au système,
// et si la rotation automatique est désactivée sur le téléphone — ce qui est
// courant — l'écran reste exactement où il était. On passait donc les réglages
// en paysage. Un verrou portrait explicite donne le même résultat quel que soit
// le réglage de l'appareil.
//
// Le suivi se fait par un ensemble de noms, pas par un booléen : plusieurs
// écrans peuvent se succéder ou se chevaucher, et fermer le second ne doit pas
// reverrouiller pendant que le premier est encore là.

let plugin = null;
let checked = false;
let etatVoulu = null; // 'paysage' | 'portrait'
const ouverts = new Set();

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
    const module = await import('@capacitor/screen-orientation');
    plugin = module.ScreenOrientation || null;
  } catch {
    plugin = null;
  }
}

async function appliquer(etat) {
  if (etat === etatVoulu) return;
  etatVoulu = etat;
  try {
    await chargerPlugin();
    if (!plugin) return; // navigateur ou Windows : rien à verrouiller
    await plugin.lock({ orientation: etat === 'paysage' ? 'landscape' : 'portrait' });
  } catch {
    // Sur certaines plateformes l'appel échoue sans conséquence : le manifeste
    // garde le comportement par défaut, on n'insiste pas.
  }
}

export function lockLandscape() {
  return appliquer('paysage');
}

export function lockPortrait() {
  return appliquer('portrait');
}

// Rend complètement la main au système. Réservé à la sortie de l'application :
// aucun écran du jeu ne s'en sert.
export async function releaseOrientation() {
  etatVoulu = null;
  try {
    await chargerPlugin();
    if (plugin) await plugin.unlock();
  } catch {
    /* rien a faire */
  }
}

// Déclaré par chaque écran qui s'ouvre ou se ferme. Le nom sert à distinguer
// les écrans entre eux ; sa valeur exacte n'a pas d'importance.
export function setScreenOpen(nom, ouvert) {
  if (ouvert) ouverts.add(nom);
  else ouverts.delete(nom);
  // Un écran de lecture ouvert : portrait. Plus aucun : retour au paysage.
  return ouverts.size ? lockPortrait() : lockLandscape();
}

// Ancienne signature, conservée : un booléen unique pour l'ensemble des
// panneaux de réglages.
export function setPanelOpen(ouvert) {
  return setScreenOpen('reglages', ouvert);
}

export function screensOpen() {
  return [...ouverts];
}
