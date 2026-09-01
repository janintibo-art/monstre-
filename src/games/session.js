import { createRng } from '../core/rng.js';

// Moteur commun a tous les jeux educatifs.
//
// Chaque jeu ne decrit que ses questions ; le deroulement, le score, les
// indices, les encouragements et la lecture a voix haute sont geres ici. Ca
// garde les jeux courts a ecrire, et surtout coherents entre eux : un enfant
// qui a compris un jeu a compris les huit autres.
//
// Un jeu exporte :
//
//   { id, name, icon, skill, ages: [min, max], rounds, make(level, rng) }
//
// et `make` renvoie une question :
//
//   {
//     prompt   : la consigne, affichee ET lue a voix haute
//     kind     : 'color' | 'text' | 'number' | 'shape' | 'emoji' | 'clock'
//     choices  : [{ key, label, value, correct }]
//     order    : true si les reponses doivent etre touchees dans l'ordre
//     hint     : coup de pouce apres une erreur
//     explain  : explication donnee apres la reponse
//   }

// Trois erreurs de suite sur la meme question : on donne la reponse et on passe.
// Insister davantage sur un enfant ne lui apprend rien, ca le decourage.
const MAX_TRIES = 3;

const BRAVO = [
  'Bravo !',
  'Oui, c’est ça !',
  'Tu as trouvé !',
  'Parfait !',
  'Exactement !',
  'Tu es fort !'
];

const ENCOURAGE = [
  'Presque ! Essaie encore.',
  'Pas tout à fait. Regarde bien.',
  'Non, mais tu y es presque.',
  'Essaie une autre.'
];

const GIVE_UP = [
  'Ce n’est pas grave. Regarde, c’était celle-là.',
  'On la refera. La réponse était celle-ci.',
  'Pas facile, celle-là. Voilà la réponse.'
];

function pick(list, rng = Math.random) {
  return list[Math.floor(rng() * list.length) % list.length];
}

export function shuffle(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createSession(game, { level = 2, seed = Date.now() } = {}) {
  const rng = createRng(seed >>> 0 || 1);
  const total = game.rounds || 6;

  let index = 0;
  let question = null;
  let tries = 0;
  let correctCount = 0;
  let firstTryCount = 0;
  let sequence = []; // reponses deja touchees, pour les jeux dans l'ordre
  let done = false;

  function next() {
    if (index >= total) {
      done = true;
      question = null;
      return null;
    }
    index += 1;
    tries = 0;
    sequence = [];
    question = game.make(level, rng, index);
    return question;
  }

  // Verifie une reponse. Renvoie toujours de quoi reagir : etat, phrase a dire,
  // et si la question est terminee.
  function answer(key) {
    if (!question || done) return null;

    const choice = question.choices.find((c) => c.key === key);
    if (!choice) return null;

    // Jeux dans l'ordre : on verifie la position, pas seulement la valeur.
    if (question.order) {
      const expected = question.choices.filter((c) => c.correct).sort((a, b) => a.rank - b.rank);
      const position = sequence.length;
      const good = expected[position] && expected[position].key === key;

      if (good) {
        sequence.push(key);
        if (sequence.length === expected.length) {
          if (tries === 0) firstTryCount += 1;
          correctCount += 1;
          return { state: 'won', say: pick(BRAVO, rng), finished: true, explain: question.explain };
        }
        return { state: 'progress', say: null, finished: false, progress: sequence.length };
      }

      tries += 1;
      sequence = [];
      if (tries >= MAX_TRIES) {
        return {
          state: 'given',
          say: pick(GIVE_UP, rng),
          finished: true,
          reveal: expected.map((c) => c.key),
          explain: question.explain
        };
      }
      return {
        state: 'wrong',
        say: `${pick(ENCOURAGE, rng)} ${tries >= 2 && question.hint ? question.hint : ''}`.trim(),
        finished: false,
        restart: true
      };
    }

    if (choice.correct) {
      if (tries === 0) firstTryCount += 1;
      correctCount += 1;
      return { state: 'won', say: pick(BRAVO, rng), finished: true, explain: question.explain };
    }

    tries += 1;
    if (tries >= MAX_TRIES) {
      return {
        state: 'given',
        say: pick(GIVE_UP, rng),
        finished: true,
        reveal: question.choices.filter((c) => c.correct).map((c) => c.key),
        explain: question.explain
      };
    }

    // L'indice n'arrive qu'a la deuxieme erreur : donne trop tot, il prive
    // l'enfant du plaisir de chercher.
    const hint = tries >= 2 && question.hint ? ` ${question.hint}` : '';
    return { state: 'wrong', say: `${pick(ENCOURAGE, rng)}${hint}`, finished: false };
  }

  // Bilan de fin de partie. Le ton change selon le resultat, mais jamais dans le
  // reproche : le pire message possible est « tu as eu faux ».
  function summary() {
    const ratio = correctCount / total;
    let message;
    if (ratio === 1 && firstTryCount === total) {
      message = 'Tout juste, et du premier coup à chaque fois. Tu es impressionnant !';
    } else if (ratio >= 0.8) {
      message = 'Très bien joué ! On recommence ?';
    } else if (ratio >= 0.5) {
      message = 'C’est bien, tu progresses. On en refait une ?';
    } else {
      message = 'On a bien travaillé. C’est en jouant qu’on apprend, viens on recommence.';
    }
    return { total, correct: correctCount, firstTry: firstTryCount, message };
  }

  return {
    game,
    next,
    answer,
    summary,
    get question() {
      return question;
    },
    get index() {
      return index;
    },
    get total() {
      return total;
    },
    get done() {
      return done;
    },
    get tries() {
      return tries;
    },
    get sequence() {
      return sequence;
    }
  };
}
