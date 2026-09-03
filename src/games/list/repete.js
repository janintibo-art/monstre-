import { shuffle } from '../session.js';

// Répète après moi.
//
// La créature dit un mot, on le redit à haute voix. C'est le plus simple des
// jeux et le seul qui n'a **aucun sens sans la voix** : il travaille la
// prononciation et l'écoute, pas la connaissance.
//
// Utile aux tout-petits qui apprennent à parler, et à qui veut simplement
// jouer avec sa créature sans rien avoir à savoir.

const MOTS = {
  court: ['chat', 'lune', 'pomme', 'fleur', 'main', 'pain', 'chien', 'eau', 'nez', 'lit'],
  moyen: ['bateau', 'maison', 'jardin', 'oiseau', 'chapeau', 'lapin', 'soleil', 'panier', 'cheval', 'bouton'],
  long: ['papillon', 'crocodile', 'téléphone', 'ordinateur', 'parapluie', 'chocolat', 'bibliothèque', 'anniversaire']
};

export default {
  id: 'repete',
  name: 'Répète après moi',
  icon: '🗣️',
  skill: 'Prononciation',
  ages: [3, 99],
  rounds: 6,
  voix: true,
  // Sans micro, ce jeu n'a rien à proposer : il ne s'affiche pas.
  voixSeulement: true,

  make(level, rng) {
    // Les mots s'allongent avec l'âge. À trois ans, « chat » est déjà un
    // exercice ; à dix, il n'y a plus de jeu.
    const familles = level <= 1 ? ['court'] : level <= 2 ? ['court', 'moyen'] : ['moyen', 'long'];
    const famille = familles[Math.floor(rng() * familles.length)];
    const mot = shuffle(MOTS[famille], rng)[0];

    // Les autres propositions existent pour que le jeu reste jouable au doigt,
    // mais la vraie réponse est de le dire.
    const autres = shuffle(
      Object.values(MOTS).flat().filter((m) => m !== mot),
      rng
    ).slice(0, 3);

    return {
      prompt: `Répète après moi : ${mot}.`,
      kind: 'phrase',
      display: mot,
      choices: shuffle([mot, ...autres], rng).map((m) => ({
        key: m,
        label: m,
        value: m,
        correct: m === mot
      })),
      hint: `Écoute bien : ${mot}. À toi.`,
      explain: `Le mot était « ${mot} ».`
    };
  }
};
