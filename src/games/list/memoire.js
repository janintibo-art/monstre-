import { shuffle } from '../session.js';

// Memoire des couleurs. Le seul jeu ou l'on touche plusieurs reponses, dans
// l'ordre : le monstre montre une suite, l'enfant la refait. Ca change le
// geste et ca repose des jeux a choix unique.

const PALETTE = [
  { nom: 'rouge', hex: '#e5484d' },
  { nom: 'bleu', hex: '#3e7bfa' },
  { nom: 'jaune', hex: '#f5c518' },
  { nom: 'vert', hex: '#3fb950' },
  { nom: 'violet', hex: '#a371f7' },
  { nom: 'orange', hex: '#f0883e' }
];

export default {
  id: 'memoire',
  name: 'Répète après moi',
  icon: '🧠',
  skill: 'Mémoire',
  ages: [4, 99],
  rounds: 5,

  make(level, rng, round) {
    const couleurs = shuffle(PALETTE, rng).slice(0, Math.min(6, 3 + Math.floor(level / 2)));
    // La suite s'allonge a chaque manche : c'est la progression qui rend le
    // jeu tenable pour un enfant de quatre ans comme pour un de douze.
    const longueur = Math.min(couleurs.length, 2 + Math.floor(level / 2) + Math.floor(round / 2));

    const suite = [];
    for (let i = 0; i < longueur; i += 1) {
      suite.push(couleurs[Math.floor(rng() * couleurs.length)]);
    }

    const rangs = new Map();
    suite.forEach((c, i) => {
      if (!rangs.has(c.nom)) rangs.set(c.nom, i);
    });

    return {
      prompt: 'Regarde bien, puis répète la suite.',
      kind: 'color',
      order: true,
      // La sequence est montree par l'interface avant que l'enfant puisse jouer.
      showSequence: suite.map((c) => c.nom),
      choices: couleurs.map((c) => ({
        key: c.nom,
        label: c.nom,
        value: c.hex,
        // Une couleur peut apparaitre plusieurs fois : on garde son premier rang.
        correct: rangs.has(c.nom),
        rank: rangs.has(c.nom) ? rangs.get(c.nom) : 99
      })),
      sequence: suite.map((c) => c.nom),
      hint: 'Redis les couleurs à voix haute dans ta tête, ça aide.',
      explain: `La suite était : ${suite.map((c) => c.nom).join(', ')}.`
    };
  }
};
