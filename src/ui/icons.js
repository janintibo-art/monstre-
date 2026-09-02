// Les icônes de l'interface.
//
// Chaque bouton a un emoji de repli et, éventuellement, une image maison. Le
// principe : **une icône absente ne casse rien**, l'emoji reste affiché. On peut
// donc en livrer cinq, voir le résultat à l'écran, et continuer — sans jamais
// se retrouver avec un bouton vide.
//
// La détection se fait au chargement de l'image, pas par une requête préalable :
// un `onerror` suffit, et cela ne coûte rien quand le fichier est là.

const BASE = 'assets/icons/';

// Correspondance identifiant → fichier. L'emoji est fourni à l'appel, au plus
// près de l'endroit où il servait déjà.
const FICHIERS = {
  feed: 'nourrir.png',
  play: 'balle.png',
  wash: 'laver.png',
  pet: 'caliner.png',
  sleep: 'dormir.png',
  games: 'jeux.png',
  listen: 'parler.png',
  talk: 'ecrire.png',
  profil: 'profil.png',
  agenda: 'agenda.png',
  guide: 'guide.png',
  hautParleur: 'haut-parleur.png',
  modifier: 'modifier.png',
  rejouer: 'rejouer.png',
  etoile: 'etoile.png',
  microActif: 'micro-actif.png',
  soleil: 'soleil.png',
  alerte: 'alerte.png'
};

// Résultat de la recherche, mis en cache : inutile de retenter un fichier dont
// on sait déjà qu'il n'existe pas.
const connu = new Map();

function url(id) {
  const base = import.meta.env.BASE_URL || './';
  return `${base}${BASE}${FICHIERS[id]}`;
}

// Crée le contenu d'un bouton : l'emoji d'abord, remplacé par l'image si elle
// se charge. L'ordre compte — on n'affiche jamais de vide en attendant.
export function iconContent(id, emoji) {
  const span = document.createElement('span');
  span.className = 'icone';
  span.textContent = emoji;

  if (!FICHIERS[id] || connu.get(id) === false) return span;

  const image = new Image();
  image.alt = '';
  image.className = 'icone__image';
  image.decoding = 'async';

  image.onload = () => {
    connu.set(id, true);
    span.textContent = '';
    span.appendChild(image);
  };
  image.onerror = () => {
    connu.set(id, false); // on ne réessaiera pas
  };
  image.src = url(id);

  return span;
}

// Remplace l'emoji d'un élément existant.
export function applyIcon(element, id, emoji) {
  if (!element) return;
  element.textContent = '';
  element.appendChild(iconContent(id, emoji));
}

export const ICON_FILES = FICHIERS;
