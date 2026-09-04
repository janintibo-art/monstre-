import { TEMPERAMENTS } from '../game/species.js';

// Les compagnons.
//
// On commence avec une créature. On peut en avoir d'autres — mais **on ne les
// achète pas**, on les mérite en s'occupant bien de la première. C'est la
// règle qui donne son sens à tout le reste : un enfant qui veut un chat en plus
// du hamster doit d'abord montrer qu'il nourrit le hamster.
//
// Le mérite se mesure en **jours de bon soin**, pas en points ni en heures de
// jeu. Un jour compte quand la créature a terminé la journée avec tous ses
// besoins au-dessus de la moitié. On ne peut donc pas en gagner plusieurs dans
// la même journée, ni rattraper une semaine d'oubli en une soirée : c'est
// exactement ce qu'on cherche à enseigner.
//
// Et chaque tempérament **apporte quelque chose de différent** au foyer. Un
// gourmand trouve à manger pour tout le monde, un calme aide les autres à
// dormir. Ce ne sont pas des bonus achetés : ce sont les conséquences d'un
// caractère.

const CLE = 'monstre.compagnons';

// Jours de bon soin nécessaires pour chaque place supplémentaire. La marche
// s'allonge : le deuxième compagnon vient vite, le quatrième se mérite.
export const PALIERS = [0, 5, 14, 30];

export const PLACES_MAX = PALIERS.length;

// Ce que chaque tempérament apporte au foyer.
//
// Aucun n'aide à gagner un jeu ni ne remplit une jauge d'un coup : ils
// modifient la vitesse à laquelle les besoins évoluent, ou font arriver de
// petits événements. Un compagnon rend la vie plus douce, il ne la gagne pas à
// votre place.
export const APPORTS = {
  gourmand: {
    titre: 'Trouve à manger',
    detail: 'La faim de tout le monde descend plus lentement.',
    effet: { hunger: 0.75 }
  },
  calme: {
    titre: 'Apaise le foyer',
    detail: 'Tout le monde récupère mieux en dormant.',
    effet: { energy: 0.72 }
  },
  joyeux: {
    titre: 'Remonte le moral',
    detail: 'L’affection baisse moins vite chez les autres.',
    effet: { affection: 0.7 }
  },
  espiegle: {
    titre: 'Entraîne les autres à jouer',
    detail: 'Le besoin de jeu se comble plus longtemps.',
    effet: { fun: 0.68 }
  },
  curieux: {
    titre: 'Rapporte des trouvailles',
    detail: 'Il ramène plus souvent de quoi s’occuper.',
    effet: { fun: 0.82 }
  },
  grognon: {
    titre: 'Veille sur la maison',
    detail: 'Il n’aime pas le désordre : la propreté tient mieux.',
    effet: { hygiene: 0.7 }
  },
  timide: {
    titre: 'Tient compagnie en silence',
    detail: 'Sa seule présence rassure les autres.',
    effet: { affection: 0.82 }
  },
  reveur: {
    titre: 'Raconte des histoires',
    detail: 'Les autres s’endorment plus facilement.',
    effet: { energy: 0.85 }
  }
};

export function apportDe(temperament) {
  return APPORTS[temperament] || APPORTS.joyeux;
}

function cle(profileId) {
  return `${CLE}.${profileId || 'defaut'}`;
}

function jourDe(now) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normaliser(brut) {
  const jours = Number(brut && brut.joursDeSoin);
  return {
    joursDeSoin: Number.isFinite(jours) && jours >= 0 ? Math.floor(jours) : 0,
    dernierJour: typeof (brut && brut.dernierJour) === 'string' ? brut.dernierJour : '',
    // Identifiants des créatures du foyer, la première en tête.
    creatures: Array.isArray(brut && brut.creatures) ? brut.creatures.filter((x) => typeof x === 'string') : [],
    active: typeof (brut && brut.active) === 'string' ? brut.active : ''
  };
}

export function charger(profileId) {
  try {
    return normaliser(JSON.parse(localStorage.getItem(cle(profileId))));
  } catch {
    return normaliser(null);
  }
}

function ecrire(profileId, etat) {
  try {
    localStorage.setItem(cle(profileId), JSON.stringify(etat));
  } catch {
    /* stockage indisponible */
  }
  return etat;
}

// Enregistre la journée écoulée. À appeler quand la date change.
//
// Un jour ne compte que si TOUS les besoins sont au-dessus de la moitié : il ne
// suffit pas de nourrir, il faut aussi laver, jouer et câliner. C'est la
// différence entre s'occuper d'un animal et le nourrir.
export function noterJournee(profileId, needs, now = Date.now()) {
  const etat = charger(profileId);
  const jour = jourDe(now);
  if (etat.dernierJour === jour) return { compte: false, joursDeSoin: etat.joursDeSoin };

  const valeurs = Object.values(needs || {});
  const bonne = valeurs.length > 0 && valeurs.every((v) => Number(v) >= 50);

  etat.dernierJour = jour;
  if (bonne) etat.joursDeSoin += 1;
  ecrire(profileId, etat);

  return { compte: bonne, joursDeSoin: etat.joursDeSoin };
}

// Nombre de places débloquées, la première comprise.
export function placesOuvertes(profileId) {
  const { joursDeSoin } = charger(profileId);
  return PALIERS.filter((seuil) => joursDeSoin >= seuil).length;
}

// Ce qu'il reste à faire pour la place suivante.
export function prochainPalier(profileId) {
  const { joursDeSoin } = charger(profileId);
  const places = placesOuvertes(profileId);
  if (places >= PLACES_MAX) return null;
  const seuil = PALIERS[places];
  return { seuil, restant: Math.max(0, seuil - joursDeSoin), acquis: joursDeSoin };
}

export function enregistrerCreature(profileId, creatureId) {
  const etat = charger(profileId);
  if (!etat.creatures.includes(creatureId)) etat.creatures.push(creatureId);
  if (!etat.active) etat.active = creatureId;
  ecrire(profileId, etat);
  return etat.creatures.length;
}

export function peutAccueillir(profileId) {
  return charger(profileId).creatures.length < placesOuvertes(profileId);
}

export function choisirActive(profileId, creatureId) {
  const etat = charger(profileId);
  if (!etat.creatures.includes(creatureId)) return etat.active;
  etat.active = creatureId;
  ecrire(profileId, etat);
  return creatureId;
}

// Multiplicateurs à appliquer à l'usure des besoins, tempéraments cumulés.
//
// Le cumul est **multiplicatif et borné** : trois compagnons calmes ne doivent
// pas arrêter le temps. Sans plancher, un foyer nombreux n'aurait plus rien à
// faire, et le jeu se viderait de son objet à mesure qu'on y réussit.
export function effetsDuFoyer(temperaments = []) {
  const effets = { hunger: 1, energy: 1, hygiene: 1, fun: 1, affection: 1 };

  temperaments.forEach((t) => {
    const apport = APPORTS[t];
    if (!apport) return;
    Object.entries(apport.effet).forEach(([besoin, facteur]) => {
      if (effets[besoin] === undefined) return;
      effets[besoin] *= facteur;
    });
  });

  Object.keys(effets).forEach((besoin) => {
    effets[besoin] = Math.max(0.45, effets[besoin]);
  });
  return effets;
}

// Les créatures du foyer, avec de quoi les afficher. Elles sont lues dans les
// sauvegardes : le foyer ne duplique pas les données, il ne garde que la liste.
export function creaturesDuFoyer(profileId, lireSauvegarde) {
  return charger(profileId)
    .creatures.map((id) => {
      const brut = lireSauvegarde(id);
      if (!brut) return null;
      return {
        id,
        name: String(brut.name || 'Sans nom').slice(0, 24),
        species: brut.species,
        stage: brut.stage
      };
    })
    .filter(Boolean);
}

export function temperamentsConnus() {
  return Object.keys(TEMPERAMENTS).filter((t) => APPORTS[t]);
}
