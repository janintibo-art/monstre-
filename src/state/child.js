// Profil de l'enfant.
//
// Une seule information est demandee : la tranche d'age. Elle reste sur
// l'appareil, n'est jamais envoyee nulle part telle quelle, et sert a trois
// choses :
//
//   1. choisir les jeux proposes et leur difficulte ;
//   2. adapter le vocabulaire du monstre quand une IA distante est branchee ;
//   3. regler le debit de la voix, un enfant de quatre ans ayant besoin qu'on
//      parle plus lentement qu'un enfant de dix.
//
// Volontairement des tranches et non un age exact : c'est suffisant pour
// adapter le contenu, et ca evite de collecter une donnee personnelle precise
// sur un enfant.

const KEY = 'monstre.enfant';

export const AGE_BANDS = [
  {
    id: 'none',
    label: 'Non précisé',
    short: '—',
    min: 0,
    max: 99,
    level: 2,
    rate: 1,
    // Sans age renseigne, on propose l'eventail moyen plutot que rien.
    description: 'Tous les jeux sont proposés, en difficulté moyenne.'
  },
  {
    id: '3-4',
    label: '3 à 4 ans',
    short: '3-4',
    min: 3,
    max: 4,
    level: 0,
    rate: 0.82,
    description: 'Couleurs, formes, compter jusqu’à cinq. Beaucoup d’images, peu de texte.'
  },
  {
    id: '5-6',
    label: '5 à 6 ans',
    short: '5-6',
    min: 5,
    max: 6,
    level: 1,
    rate: 0.9,
    description: 'Compter jusqu’à dix, premières lettres, plus grand ou plus petit.'
  },
  {
    id: '7-8',
    label: '7 à 8 ans',
    short: '7-8',
    min: 7,
    max: 8,
    level: 2,
    rate: 1,
    description: 'Additions, soustractions, suites logiques, lecture de l’heure.'
  },
  {
    id: '9-11',
    label: '9 à 11 ans',
    short: '9-11',
    min: 9,
    max: 11,
    level: 3,
    rate: 1.05,
    description: 'Multiplications, divisions, calcul mental, problèmes courts.'
  },
  {
    id: '12+',
    label: '12 ans et plus',
    short: '12+',
    min: 12,
    max: 99,
    level: 4,
    rate: 1.1,
    description: 'Calcul mental rapide, logique, suites plus difficiles.'
  }
];

export function bandById(id) {
  return AGE_BANDS.find((b) => b.id === id) || AGE_BANDS[0];
}

export function loadChild() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { age: 'none' };
    const data = JSON.parse(raw);
    return { age: bandById(data.age).id };
  } catch {
    return { age: 'none' };
  }
}

export function saveChild(child) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ age: bandById(child.age).id }));
  } catch {
    /* stockage indisponible */
  }
}

export function currentBand() {
  return bandById(loadChild().age);
}

// Phrase inseree dans les consignes du modele distant. Elle encadre le ton
// autant que le contenu : un enfant de quatre ans et un adolescent n'ont pas
// besoin des memes mots.
export function childInstruction(band = currentBand()) {
  if (band.id === 'none') {
    return "Tu parles peut-etre a un enfant : reste simple, doux, et n'aborde jamais de sujet effrayant, violent ou pour adultes.";
  }
  return [
    `Tu parles a un enfant de ${band.label}.`,
    'Emploie des phrases courtes et des mots simples, adaptes a cet age.',
    "N'aborde jamais de sujet effrayant, violent, ni destine aux adultes.",
    "Ne demande jamais d'informations personnelles : ni nom de famille, ni adresse, ni ecole, ni photo.",
    'Si une question sort de ton role de creature de compagnie, propose gentiment de demander a un adulte.'
  ].join(' ');
}
