import { shuffle } from '../session.js';

// Premiere lettre d'un mot. Un jeu d'oreille autant que d'yeux : la consigne
// est lue, l'enfant entend le son avant de voir la lettre.

const MOTS = [
  { mot: 'pomme', emoji: '🍎' },
  { mot: 'bateau', emoji: '⛵' },
  { mot: 'chat', emoji: '🐱' },
  { mot: 'lune', emoji: '🌙' },
  { mot: 'maison', emoji: '🏠' },
  { mot: 'fleur', emoji: '🌸' },
  { mot: 'soleil', emoji: '☀️' },
  { mot: 'tortue', emoji: '🐢' },
  { mot: 'gâteau', emoji: '🍰' },
  { mot: 'renard', emoji: '🦊' },
  { mot: 'nuage', emoji: '☁️' },
  { mot: 'vélo', emoji: '🚲' },
  { mot: 'dauphin', emoji: '🐬' },
  { mot: 'étoile', emoji: '⭐' },
  { mot: 'abeille', emoji: '🐝' },
  { mot: 'oiseau', emoji: '🐦' },
  { mot: 'kiwi', emoji: '🥝' },
  { mot: 'igloo', emoji: '🧊' }
];

const ALPHABET = 'ABCDEFGHIJLMNOPRSTUV'.split('');

export default {
  id: 'lettres',
  name: 'La première lettre',
  icon: '🔤',
  skill: 'Lecture',
  ages: [4, 8],
  rounds: 6,

  make(level, rng) {
    const choisi = MOTS[Math.floor(rng() * MOTS.length)];
    // On enleve les accents pour comparer : « étoile » commence bien par un E.
    const lettre = choisi.mot
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')[0]
      .toUpperCase();

    const count = Math.min(6, [2, 3, 4, 5, 6][level] || 4);
    const autres = shuffle(
      ALPHABET.filter((l) => l !== lettre),
      rng
    ).slice(0, count - 1);

    return {
      prompt: `Par quelle lettre commence le mot « ${choisi.mot} » ?`,
      kind: 'text',
      display: choisi.emoji,
      choices: shuffle([lettre, ...autres], rng).map((l) => ({
        key: l,
        label: l,
        value: l,
        correct: l === lettre
      })),
      hint: `Écoute bien le début : ${choisi.mot[0]}… ${choisi.mot}.`,
      explain: `« ${choisi.mot} » commence par la lettre ${lettre}.`
    };
  }
};
