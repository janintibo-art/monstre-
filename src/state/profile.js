// Profil du joueur.
//
// Une seule information : la tranche d'age. Elle reste sur l'appareil, n'est
// jamais transmise telle quelle, et sert a quatre choses :
//
//   1. choisir les jeux proposes et leur difficulte ;
//   2. adapter le vocabulaire de la creature quand une IA est branchee ;
//   3. regler le debit de la voix ;
//   4. activer le mode confort : texte plus grand, boutons plus larges.
//
// Des tranches et non un age exact : c'est suffisant pour adapter le contenu,
// et ca evite de collecter une donnee personnelle precise — sur un enfant comme
// sur une personne agee.

const KEY = 'monstre.profil';
const LEGACY_KEY = 'monstre.enfant';

export const AGE_BANDS = [
  {
    id: 'none',
    label: 'Non précisé',
    min: 0,
    max: 99,
    level: 2,
    rate: 1,
    comfort: false,
    audience: 'inconnu',
    description: 'Tous les jeux sont proposés, en difficulté moyenne.'
  },
  {
    id: '3-4',
    label: '3 à 4 ans',
    min: 3,
    max: 4,
    level: 0,
    rate: 0.82,
    comfort: true, // gros boutons : les petits doigts ratent leur cible
    audience: 'enfant',
    description: 'Couleurs, formes, compter jusqu’à cinq. Beaucoup d’images, peu de texte.'
  },
  {
    id: '5-6',
    label: '5 à 6 ans',
    min: 5,
    max: 6,
    level: 1,
    rate: 0.9,
    comfort: true,
    audience: 'enfant',
    description: 'Compter jusqu’à dix, premières lettres, plus grand ou plus petit.'
  },
  {
    id: '7-8',
    label: '7 à 8 ans',
    min: 7,
    max: 8,
    level: 2,
    rate: 1,
    comfort: false,
    audience: 'enfant',
    description: 'Additions, soustractions, suites logiques, lecture de l’heure.'
  },
  {
    id: '9-11',
    label: '9 à 11 ans',
    min: 9,
    max: 11,
    level: 3,
    rate: 1.05,
    comfort: false,
    audience: 'enfant',
    description: 'Multiplications, divisions, calcul mental, problèmes courts.'
  },
  {
    id: '12-17',
    label: '12 à 17 ans',
    min: 12,
    max: 17,
    level: 4,
    rate: 1.1,
    comfort: false,
    audience: 'ado',
    description: 'Calcul mental rapide, logique, culture générale.'
  },
  {
    id: 'adulte',
    label: 'Adulte',
    min: 18,
    max: 64,
    level: 4,
    rate: 1.05,
    comfort: false,
    audience: 'adulte',
    description: 'Tous les jeux, y compris proverbes, capitales et vocabulaire.'
  },
  {
    id: 'senior',
    label: 'Confort — texte et boutons agrandis',
    min: 65,
    max: 120,
    level: 3,
    // Plus lent, mais pas ralenti a l'excès : parler a quelqu'un comme a un
    // enfant est desobligeant. On vise la clarte, pas la condescendance.
    rate: 0.92,
    comfort: true,
    audience: 'senior',
    description:
      'Jeux calmes et variés, texte agrandi, voix posée. Aucun chronomètre nulle part.'
  }
];

export function bandById(id) {
  return AGE_BANDS.find((b) => b.id === id) || AGE_BANDS[0];
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY);
    if (!raw) return { age: 'none' };
    const data = JSON.parse(raw);
    // L'ancienne tranche « 12+ » devient « 12 à 17 ans ».
    const id = data.age === '12+' ? '12-17' : data.age;
    return { age: bandById(id).id };
  } catch {
    return { age: 'none' };
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ age: bandById(profile.age).id }));
  } catch {
    /* stockage indisponible */
  }
}

export function currentBand() {
  return bandById(loadProfile().age);
}

// Consigne inseree dans le prompt du modele distant. Elle encadre le ton autant
// que le contenu : on ne parle pas de la meme facon a un enfant de quatre ans,
// a un adolescent et a une personne de quatre-vingts ans.
export function audienceInstruction(band = currentBand()) {
  const commun =
    "N'aborde jamais de sujet effrayant, violent, ni destine aux adultes avertis. Ne demande jamais d'informations personnelles precises : ni adresse, ni coordonnees bancaires, ni mot de passe.";

  if (band.audience === 'enfant') {
    return [
      `Tu parles a un enfant de ${band.label}.`,
      'Emploie des phrases courtes et des mots simples, adaptes a cet age.',
      commun,
      'Si une question sort de ton role de creature de compagnie, propose gentiment de demander a un adulte.'
    ].join(' ');
  }

  if (band.audience === 'senior') {
    return [
      'Tu parles a une personne agee qui aime discuter tranquillement.',
      'Phrases claires et completes, ton chaleureux et respectueux, jamais infantilisant : ce n\'est pas un enfant.',
      "Interesse-toi a ce qu'elle raconte, pose une question de relance a la fois, laisse-lui le temps.",
      'Tu peux evoquer les souvenirs, les saisons, la cuisine, la musique, le jardin, la famille.',
      commun,
      "Tu n'es ni medecin ni conseiller : pour la sante, l'argent ou les demarches, renvoie vers un proche ou un professionnel."
    ].join(' ');
  }

  if (band.audience === 'ado') {
    return `Tu parles a un adolescent. Ton naturel, ni bebe ni professoral. ${commun}`;
  }

  if (band.audience === 'adulte') {
    return `Tu parles a un adulte. Ton naturel et complice. ${commun}`;
  }

  return `Tu parles peut-etre a un enfant ou a une personne agee : reste simple, doux et clair. ${commun}`;
}

// Le mode confort peut etre force independamment de l'age : quelqu'un de
// cinquante ans peut avoir besoin de gros caracteres.
const COMFORT_KEY = 'monstre.confort';

export function loadComfort() {
  try {
    const raw = localStorage.getItem(COMFORT_KEY);
    if (raw === null) return null; // null = suivre la tranche d'age
    return raw === '1';
  } catch {
    return null;
  }
}

export function saveComfort(value) {
  try {
    if (value === null) localStorage.removeItem(COMFORT_KEY);
    else localStorage.setItem(COMFORT_KEY, value ? '1' : '0');
  } catch {
    /* stockage indisponible */
  }
}

export function comfortEnabled(band = currentBand()) {
  const forced = loadComfort();
  return forced === null ? Boolean(band.comfort) : forced;
}

// Applique le mode confort au document. Une classe sur <html> suffit : tout le
// reste est du CSS, donc rien a recalculer image par image.
export function applyComfort(band = currentBand()) {
  const on = comfortEnabled(band);
  document.documentElement.classList.toggle('confort', on);
  return on;
}
