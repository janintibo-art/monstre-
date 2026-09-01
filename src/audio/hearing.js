// Comprendre ce qui a été dit.
//
// Le moteur de reconnaissance fait ce qu'il peut avec un signal audio. Ce
// module fait le reste, et c'est là que se gagne la précision :
//
//   1. Il connaît le **vocabulaire du moment** — le nom de la créature, le
//      prénom du joueur, ses souvenirs, et surtout les réponses possibles à la
//      question posée. Un moteur générique n'a aucune idée que « Nyx » est un
//      mot ; nous, si.
//   2. Il **choisit parmi les alternatives**. Le moteur en propose plusieurs,
//      classées par probabilité acoustique. Celle qui contient un mot attendu
//      est presque toujours la bonne, même si elle n'était pas première.
//   3. Il **corrige les mots proches**. « nix », « niques », « nixe » deviennent
//      « Nyx » si la créature s'appelle ainsi. La distance d'édition est bornée
//      pour ne jamais transformer un mot en un autre mot légitime.
//   4. Il **convertit les nombres dits en toutes lettres**, indispensable pour
//      répondre à un calcul à la voix.
//
// Tout est pur et testable : aucun accès au micro ici.

/* ------------------------------------------------------------ normalisation */

export function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae') // NFD ne décompose pas les ligatures : « bœuf » perdrait son o
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // accents
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function words(text) {
  return normalize(text).split(' ').filter(Boolean);
}

/* --------------------------------------------------------- distance d'édition */

// Distance de Levenshtein bornée : dès qu'on dépasse le seuil, on abandonne.
// Inutile de calculer une distance de 12 quand on ne s'intéresse qu'à 2.
export function distance(a, b, max = 3) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let previous = new Array(b.length + 1);
  let current = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) previous[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    let best = current[0];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
      if (current[j] < best) best = current[j];
    }
    if (best > max) return max + 1;
    const swap = previous;
    previous = current;
    current = swap;
  }
  return previous[b.length];
}

// Seuil de tolérance selon la longueur : sur un mot de trois lettres, une seule
// substitution donne déjà un mot complètement différent.
//
// Le poids du candidat élargit le seuil d'un cran. C'est la clé de la
// précision : on sait que la personne peut dire le nom de sa créature ou l'une
// des réponses affichées, donc on tire plus fort vers ces mots-là. Pour du
// vocabulaire général, on reste prudent — mieux vaut laisser un mot inconnu
// tel quel que le transformer en un autre mot parfaitement légitime.
function tolerance(word, weight = 1) {
  let max;
  if (word.length <= 3) max = 0;
  else if (word.length <= 5) max = 1;
  else if (word.length <= 8) max = 2;
  else max = 3;
  if (weight >= 3 && max > 0) max += 1;
  return max;
}

/* ------------------------------------------------------------- le vocabulaire */

// Mots que l'application utilise partout, quel que soit le contexte.
const BASE = [
  'oui', 'non', 'bonjour', 'salut', 'coucou', 'merci', 'pardon', 'au revoir',
  'manger', 'jouer', 'dormir', 'laver', 'caliner', 'faim', 'fatigue',
  'joue', 'balle', 'jeu', 'jeux', 'encore', 'arrete', 'viens', 'assis',
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'mon', 'ma', 'mes', 'ton', 'ta',
  "j'aime", 'aime', 'deteste', 'appelle', 'habite', 'travaille',
  'rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet', 'rose', 'noir', 'blanc',
  'gris', 'marron'
];

export function createLexicon(entries = []) {
  const map = new Map();
  const add = (text, weight) => {
    normalize(text)
      .split(' ')
      .filter((w) => w.length > 1)
      .forEach((w) => {
        map.set(w, Math.max(map.get(w) || 0, weight));
      });
  };

  BASE.forEach((w) => add(w, 1));
  entries.forEach((entry) => {
    if (typeof entry === 'string') add(entry, 2);
    else if (entry && entry.text) add(entry.text, entry.weight || 2);
  });

  return map;
}

// Construit le vocabulaire du moment. `expected` contient les réponses
// possibles à la question en cours : ce sont elles qui pèsent le plus lourd,
// parce qu'on sait que la personne est en train d'y répondre.
export function contextLexicon({ pet = null, profile = null, expected = [], facts = [] } = {}) {
  const entries = [];
  if (pet && pet.name) entries.push({ text: pet.name, weight: 4 });
  if (profile && profile.name) entries.push({ text: profile.name, weight: 4 });
  facts.forEach((f) => entries.push({ text: f, weight: 3 }));
  expected.forEach((e) => entries.push({ text: e, weight: 6 }));
  return createLexicon(entries);
}

/* ------------------------------------------------------------- les nombres */

const UNITS = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6,
  sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13,
  quatorze: 14, quinze: 15, seize: 16, vingt: 20, trente: 30, quarante: 40,
  cinquante: 50, soixante: 60, cent: 100, cents: 100, mille: 1000
};

// Convertit les nombres dits en toutes lettres. Indispensable pour répondre à
// un calcul à la voix : le moteur renvoie « vingt-deux », le jeu attend 22.
export function parseNumbers(text) {
  const source = normalize(text).replace(/-/g, ' ');
  const parts = source.split(' ');
  const out = [];
  let current = null;
  let pending = 0;

  const flush = () => {
    if (current !== null) {
      out.push(String(pending + current));
      current = null;
      pending = 0;
    }
  };

  for (let i = 0; i < parts.length; i += 1) {
    const w = parts[i];

    // « et » ne compte que dans « vingt et un », pas dans « toi et moi ».
    if (w === 'et' && current !== null && parts[i + 1] && UNITS[parts[i + 1]] !== undefined) {
      continue;
    }

    // Quatre-vingts, la particularité française : « vingt » vaut 80 s'il suit
    // « quatre ». Ce cas doit être traité AVANT la table des unités, sinon
    // « vingt » y est trouvé le premier et « quatre-vingt » donne 20.
    if (w === 'quatre' && (parts[i + 1] === 'vingt' || parts[i + 1] === 'vingts')) continue;
    if ((w === 'vingt' || w === 'vingts') && parts[i - 1] === 'quatre') {
      current = 80;
      continue;
    }

    if (UNITS[w] !== undefined) {
      const value = UNITS[w];
      if (value === 100 || value === 1000) {
        current = (current || 1) * value;
        pending += current;
        current = 0;
      } else if (current === null) {
        current = value;
      } else if (current >= 20 && current % 10 === 0 && value < 20) {
        // Vingt-deux, mais aussi soixante-dix et quatre-vingt-quinze : en
        // français, une dizaine ronde peut absorber un nombre jusqu'à dix-neuf.
        current += value;
      } else if (current >= 20 && value < 10) {
        current += value; // quatre-vingt-dix-neuf, après le passage à 90
      } else if (current === 10 && value >= 6 && value <= 9) {
        // Dix-sept, dix-huit, dix-neuf. Au-dessous, « dix cinq » ne se dit pas :
        // on n'invente donc rien, on garde les deux nombres séparés.
        current += value;
      } else {
        flush();
        current = value;
      }
      continue;
    }

    if (/^\d+$/.test(w)) {
      flush();
      out.push(w);
      continue;
    }

    flush();
    out.push(w);
  }
  flush();
  return out.join(' ');
}

/* ------------------------------------------------------------- la correction */

// Corrige mot à mot contre le vocabulaire. Un mot déjà présent est laissé tel
// quel ; un mot absent est remplacé par le plus proche, si et seulement si la
// distance reste dans la tolérance de sa longueur.
export function correct(text, lexicon) {
  if (!lexicon || !lexicon.size) return text;
  const source = words(text);
  const fixed = source.map((word) => {
    if (lexicon.has(word)) return word;

    let best = null;
    let bestScore = Infinity;
    lexicon.forEach((weight, candidate) => {
      const max = tolerance(word, weight);
      if (!max) return;
      const d = distance(word, candidate, max);
      if (d > max) return;
      // À distance égale, le mot le plus attendu gagne : une réponse possible
      // à la question en cours passe devant un mot de vocabulaire général.
      const score = d - weight * 0.15;
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    });
    return best || word;
  });
  return fixed.join(' ');
}

/* ------------------------------------------------ le choix entre alternatives */

// Note une hypothèse : sa probabilité acoustique, plus les mots attendus
// qu'elle contient. Une alternative classée troisième mais qui contient la
// réponse attendue est presque toujours la bonne.
export function scoreAlternative(text, lexicon, confidence = 0.5) {
  const list = words(text);
  if (!list.length) return -1;

  let hits = 0;
  let weight = 0;
  list.forEach((w) => {
    if (lexicon.has(w)) {
      hits += 1;
      weight += lexicon.get(w);
    }
  });

  const coverage = hits / list.length;
  return confidence * 1 + coverage * 1.5 + Math.min(weight, 12) * 0.25;
}

// Choisit la meilleure hypothèse parmi celles proposées par le moteur.
export function pickBest(alternatives, lexicon) {
  const list = (alternatives || []).filter((a) => a && a.text && a.text.trim());
  if (!list.length) return null;
  if (!lexicon || !lexicon.size) return list[0];

  let best = list[0];
  let bestScore = -Infinity;
  list.forEach((alt) => {
    const score = scoreAlternative(alt.text, lexicon, alt.confidence ?? 0.5);
    if (score > bestScore) {
      bestScore = score;
      best = alt;
    }
  });
  return best;
}

/* ------------------------------------------------------------- l'ensemble */

// Chaîne complète : choisir l'hypothèse, corriger, convertir les nombres.
// Renvoie aussi de quoi décider s'il faut faire répéter.
export function understand(alternatives, lexicon, { numbers = false } = {}) {
  const best = pickBest(alternatives, lexicon);
  if (!best) return { text: '', raw: '', confident: false, reason: 'silence' };

  const corrected = correct(best.text, lexicon);
  const final = numbers ? parseNumbers(corrected) : corrected;
  const list = words(final);

  // Une syllabe isolée est presque toujours un bruit : un raclement de gorge,
  // un « euh », la fin d'une phrase de la créature reprise par le micro.
  const tooShort = list.length === 0 || (list.length === 1 && list[0].length <= 2);
  const lowConfidence = (best.confidence ?? 1) < 0.35 && !list.some((w) => lexicon.has(w));

  return {
    text: final,
    raw: best.text,
    confident: !tooShort && !lowConfidence,
    reason: tooShort ? 'trop court' : lowConfidence ? 'peu sûr' : null
  };
}

// Compare ce qui a été dit aux réponses possibles d'une question de jeu.
// Renvoie la réponse reconnue, ou null si rien ne correspond franchement.
export function matchChoice(text, choices) {
  const said = words(parseNumbers(text));
  if (!said.length) return null;

  let best = null;
  let bestScore = 0;

  choices.forEach((choice) => {
    const target = words(parseNumbers(String(choice.label)));
    if (!target.length) return;

    // Correspondance exacte d'un mot entier : c'est le cas le plus fréquent
    // (« rouge », « douze », « Paris »).
    const exact = target.every((t) => said.includes(t));
    if (exact) {
      const score = 3 + target.length;
      if (score > bestScore) {
        bestScore = score;
        best = choice;
      }
      return;
    }

    // Sinon on tolère une petite erreur, mot à mot.
    const near = target.every((t) => said.some((s) => distance(s, t, tolerance(t)) <= tolerance(t)));
    if (near) {
      const score = 1 + target.length * 0.5;
      if (score > bestScore) {
        bestScore = score;
        best = choice;
      }
    }
  });

  return best;
}
