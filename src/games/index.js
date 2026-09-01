import couleurs from './list/couleurs.js';
import compter from './list/compter.js';
import formes from './list/formes.js';
import lettres from './list/lettres.js';
import comparer from './list/comparer.js';
import calcul from './list/calcul.js';
import suites from './list/suites.js';
import memoire from './list/memoire.js';
import horloge from './list/horloge.js';

// Catalogue des jeux educatifs.
//
// Pour en ajouter un : creer le fichier dans list/, l'importer ici, et c'est
// tout. Sa tranche d'age suffit a le faire apparaitre au bon moment.

export const GAMES = [
  couleurs,
  compter,
  formes,
  lettres,
  comparer,
  calcul,
  suites,
  memoire,
  horloge
];

export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

// Jeux adaptes a une tranche d'age. Sans age renseigne, on montre tout : mieux
// vaut un choix trop large qu'un enfant prive d'un jeu qui lui plairait.
export function gamesForBand(band) {
  if (!band || band.id === 'none') return GAMES;
  return GAMES.filter((g) => {
    const [min, max] = g.ages;
    // Un chevauchement suffit : un jeu 4-8 est propose a la tranche 3-4.
    return band.max >= min && band.min <= max;
  });
}
