import { shuffle } from '../session.js';

// Plus grand ou plus petit. Passe des quantites visibles (des points a compter)
// aux nombres ecrits : c'est le pont entre « je vois qu'il y en a plus » et
// « je lis que 47 est plus grand que 39 ».

export default {
  id: 'comparer',
  name: 'Plus ou moins',
  icon: '⚖️',
  skill: 'Nombres',
  ages: [4, 10],
  rounds: 6,

  make(level, rng) {
    const plusGrand = rng() > 0.5;
    const visuel = level <= 1; // aux plus petits, on montre au lieu d'ecrire
    const max = [6, 10, 50, 200, 2000][level] || 50;

    let a = 1 + Math.floor(rng() * max);
    let b = 1 + Math.floor(rng() * max);
    while (b === a) b = 1 + Math.floor(rng() * max);

    const gagnant = plusGrand ? Math.max(a, b) : Math.min(a, b);

    return {
      prompt: plusGrand
        ? 'Touche le groupe où il y en a le plus.'
        : 'Touche le groupe où il y en a le moins',
      promptText: plusGrand ? 'Touche le plus grand nombre.' : 'Touche le plus petit nombre.',
      kind: visuel ? 'dots' : 'number',
      choices: shuffle([a, b], rng).map((n) => ({
        key: String(n),
        label: visuel ? '●'.repeat(n) : String(n),
        value: n,
        correct: n === gagnant
      })),
      hint: visuel
        ? 'Compte les points de chaque côté.'
        : 'Regarde d’abord le nombre de chiffres, puis le premier chiffre.',
      explain: `${gagnant} est le ${plusGrand ? 'plus grand' : 'plus petit'}.`
    };
  }
};
