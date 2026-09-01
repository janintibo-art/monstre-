import { shuffle } from '../session.js';

// Calcul. C'est le jeu qui suit l'enfant le plus longtemps, donc celui dont la
// difficulte doit etre la mieux graduee : additions jusqu'a dix a six ans,
// tables et divisions a onze.

export default {
  id: 'calcul',
  name: 'Le calcul',
  icon: '➕',
  skill: 'Mathématiques',
  ages: [5, 99],
  rounds: 6,

  make(level, rng) {
    const { a, b, op } = tirage(level, rng);
    const reponse = calcule(a, b, op);
    const signe = { '+': '+', '-': '−', '*': '×', '/': '÷' }[op];

    // Les distracteurs imitent les erreurs reelles : un de trop, un de moins,
    // ou l'operation inverse. Une erreur plausible fait reflechir ; une reponse
    // absurde ne sert a rien.
    const faux = new Set();
    [reponse + 1, reponse - 1, reponse + 2, reponse - 2, reponse + 10].forEach((n) => {
      if (n !== reponse && n >= 0) faux.add(n);
    });

    const propositions = shuffle([reponse, ...shuffle([...faux], rng).slice(0, 3)], rng);

    return {
      prompt: `Combien font ${a} ${signe} ${b} ?`,
      kind: 'number',
      display: `${a} ${signe} ${b} = ?`,
      choices: propositions.map((n) => ({
        key: String(n),
        label: String(n),
        value: n,
        correct: n === reponse
      })),
      hint: indice(a, b, op),
      explain: `${a} ${signe} ${b} = ${reponse}.`
    };
  }
};

function tirage(level, rng) {
  const d = (max) => 1 + Math.floor(rng() * max);
  switch (level) {
    case 0:
    case 1: {
      // Additions dont le resultat ne depasse pas dix : on compte sur ses doigts.
      const a = d(5);
      const b = d(Math.max(1, 10 - a));
      return { a, b, op: '+' };
    }
    case 2: {
      const op = rng() > 0.45 ? '+' : '-';
      const a = d(20);
      const b = op === '-' ? 1 + Math.floor(rng() * a) : d(20);
      return { a, b, op };
    }
    case 3: {
      const roll = rng();
      if (roll < 0.4) return { a: d(10), b: d(10), op: '*' };
      if (roll < 0.7) return { a: 20 + d(60), b: d(30), op: '+' };
      const a = 20 + d(60);
      return { a, b: 1 + Math.floor(rng() * a), op: '-' };
    }
    default: {
      const roll = rng();
      if (roll < 0.35) return { a: d(12), b: d(12), op: '*' };
      if (roll < 0.6) {
        // Division toujours juste : on part du resultat pour construire l'enonce.
        const b = 2 + Math.floor(rng() * 9);
        const q = 2 + Math.floor(rng() * 9);
        return { a: b * q, b, op: '/' };
      }
      if (roll < 0.8) return { a: 100 + d(400), b: d(200), op: '+' };
      const a = 100 + d(400);
      return { a, b: 1 + Math.floor(rng() * a), op: '-' };
    }
  }
}

function calcule(a, b, op) {
  if (op === '+') return a + b;
  if (op === '-') return a - b;
  if (op === '*') return a * b;
  return a / b;
}

function indice(a, b, op) {
  if (op === '+') return `Pars de ${a} et avance de ${b}.`;
  if (op === '-') return `Pars de ${a} et recule de ${b}.`;
  if (op === '*') return `C’est ${b} fois le nombre ${a}, additionné ${b} fois.`;
  return `Combien de fois ${b} tient-il dans ${a} ?`;
}
