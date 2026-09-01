import { shuffle } from '../session.js';

// Reconnaissance des formes. Les formes sont dessinees en SVG plutot qu'en
// emoji : le rendu est identique sur tous les telephones, et on peut les
// varier en taille et en couleur sans changer de forme.

const FORMES = [
  { nom: 'un rond', key: 'rond', path: 'M50 8a42 42 0 1 0 .1 0z' },
  { nom: 'un carré', key: 'carre', path: 'M12 12h76v76H12z' },
  { nom: 'un triangle', key: 'triangle', path: 'M50 8 92 88H8z' },
  { nom: 'une étoile', key: 'etoile', path: 'M50 6 62 38l34 2-26 22 8 33-28-18-28 18 8-33-26-22 34-2z' },
  { nom: 'un cœur', key: 'coeur', path: 'M50 88C16 66 8 46 20 32c10-12 24-6 30 6 6-12 20-18 30-6 12 14 4 34-30 56z' },
  { nom: 'un losange', key: 'losange', path: 'M50 6 92 50 50 94 8 50z' },
  { nom: 'une croix', key: 'croix', path: 'M38 8h24v30h30v24H62v30H38V62H8V38h30z' },
  { nom: 'un rectangle', key: 'rectangle', path: 'M8 26h84v48H8z' }
];

export default {
  id: 'formes',
  name: 'Les formes',
  icon: '🔷',
  skill: 'Observation',
  ages: [4, 8],
  rounds: 6,

  make(level, rng) {
    const count = Math.min(FORMES.length, [3, 3, 4, 5, 6][level] || 4);
    const lot = shuffle(FORMES, rng).slice(0, count);
    const cible = lot[Math.floor(rng() * lot.length)];

    return {
      prompt: `Touche ${cible.nom}.`,
      kind: 'shape',
      choices: lot.map((f) => ({
        key: f.key,
        label: f.nom,
        value: f.path,
        correct: f.key === cible.key
      })),
      hint: indice(cible.key),
      explain: `C’était ${cible.nom}.`
    };
  }
};

function indice(key) {
  const indices = {
    rond: 'Le rond n’a aucun coin.',
    carre: 'Le carré a quatre côtés tous pareils.',
    triangle: 'Le triangle a trois côtés.',
    etoile: 'L’étoile a des pointes.',
    coeur: 'Le cœur a deux bosses en haut.',
    losange: 'Le losange, c’est un carré posé sur une pointe.',
    croix: 'La croix a deux barres qui se croisent.',
    rectangle: 'Le rectangle est plus long que haut.'
  };
  return indices[key] || 'Regarde bien les côtés.';
}
