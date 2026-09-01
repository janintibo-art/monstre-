import { shuffle } from '../session.js';

// Suites logiques. Le seul jeu ou la reponse ne s'apprend pas : elle se
// deduit. C'est aussi celui qui prepare le mieux au raisonnement.

export default {
  id: 'suites',
  name: 'Que vient après ?',
  icon: '🧩',
  skill: 'Logique',
  ages: [5, 99],
  rounds: 5,

  make(level, rng) {
    const { suite, reponse, regle } = construit(level, rng);

    const faux = new Set();
    [reponse + 1, reponse - 1, reponse + 2, reponse * 2].forEach((n) => {
      if (n !== reponse && n >= 0) faux.add(n);
    });

    return {
      prompt: 'Quel nombre vient après ?',
      kind: 'number',
      display: `${suite.join('  ·  ')}  ·  ?`,
      choices: shuffle([reponse, ...shuffle([...faux], rng).slice(0, 3)], rng).map((n) => ({
        key: String(n),
        label: String(n),
        value: n,
        correct: n === reponse
      })),
      hint: `Regarde ce qu’on ajoute à chaque fois. ${regle}`,
      explain: `${regle} La réponse était ${reponse}.`
    };
  }
};

function construit(level, rng) {
  const depart = 1 + Math.floor(rng() * (level <= 1 ? 5 : 20));

  // Aux plus jeunes, uniquement des pas reguliers de 1 ou 2 : la regle doit
  // pouvoir se dire a voix haute en trois mots.
  if (level <= 1) {
    const pas = rng() > 0.5 ? 1 : 2;
    const suite = [depart, depart + pas, depart + pas * 2];
    return { suite, reponse: depart + pas * 3, regle: `On ajoute ${pas} à chaque fois.` };
  }

  const roll = rng();
  if (roll < 0.45) {
    const pas = 2 + Math.floor(rng() * (level >= 3 ? 12 : 5));
    const suite = [depart, depart + pas, depart + pas * 2];
    return { suite, reponse: depart + pas * 3, regle: `On ajoute ${pas} à chaque fois.` };
  }
  if (roll < 0.7) {
    const pas = 2 + Math.floor(rng() * 5);
    const debut = depart + pas * 4;
    const suite = [debut, debut - pas, debut - pas * 2];
    return { suite, reponse: debut - pas * 3, regle: `On enlève ${pas} à chaque fois.` };
  }
  if (roll < 0.9 || level < 3) {
    const facteur = 2 + Math.floor(rng() * 2);
    const base = 1 + Math.floor(rng() * 4);
    const suite = [base, base * facteur, base * facteur * facteur];
    return {
      suite,
      reponse: base * facteur ** 3,
      regle: `On multiplie par ${facteur} à chaque fois.`
    };
  }
  // Les carres : une suite ou l'ecart change, donc beaucoup plus difficile.
  const debut = 1 + Math.floor(rng() * 5);
  const suite = [debut ** 2, (debut + 1) ** 2, (debut + 2) ** 2];
  return {
    suite,
    reponse: (debut + 3) ** 2,
    regle: 'Ce sont des nombres multipliés par eux-mêmes.'
  };
}
