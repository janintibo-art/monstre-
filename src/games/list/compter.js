import { shuffle } from '../session.js';

// Compter des objets. On affiche vraiment les objets a compter : l'enfant
// pointe du doigt, ce qui est exactement le geste qu'on veut encourager.

const OBJETS = ['🍎', '⭐', '🐟', '🌸', '🍄', '🦋', '🍋', '🐞'];

export default {
  id: 'compter',
  name: 'Compter',
  icon: '🔢',
  skill: 'Nombres',
  ages: [3, 8],
  rounds: 6,

  make(level, rng) {
    const max = [3, 5, 10, 12, 15][level] || 10;
    const objet = OBJETS[Math.floor(rng() * OBJETS.length)];
    const combien = 1 + Math.floor(rng() * max);

    // Les mauvaises reponses restent proches de la bonne : proposer 2 et 14
    // pour une reponse de 3 ne fait pas reflechir, ca fait deviner.
    // Voisins d'abord, dans l'ordre de proximite, puis complement dans le reste
    // de l'intervalle. Aucun tirage avec reessai : la boucle se termine toujours.
    const propositions = [combien];
    [1, -1, 2, -2, 3, -3].forEach((d) => {
      const n = combien + d;
      if (propositions.length < 4 && n >= 1 && n <= max && !propositions.includes(n)) {
        propositions.push(n);
      }
    });
    for (let n = 1; n <= max && propositions.length < Math.min(4, max); n += 1) {
      if (!propositions.includes(n)) propositions.push(n);
    }

    return {
      prompt: `Combien y a-t-il de ${nomObjet(objet)} ?`,
      kind: 'number',
      display: objet.repeat(combien),
      choices: shuffle(propositions, rng).map((n) => ({
        key: String(n),
        label: String(n),
        value: n,
        correct: n === combien
      })),
      hint: 'Compte-les un par un, avec ton doigt.',
      explain: `Il y en avait ${combien}.`
    };
  }
};

function nomObjet(emoji) {
  const noms = {
    '🍎': 'pommes',
    '⭐': 'étoiles',
    '🐟': 'poissons',
    '🌸': 'fleurs',
    '🍄': 'champignons',
    '🦋': 'papillons',
    '🍋': 'citrons',
    '🐞': 'coccinelles'
  };
  return noms[emoji] || 'objets';
}
