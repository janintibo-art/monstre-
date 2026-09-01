import { shuffle } from '../session.js';

// Mots melanges. On ne fait pas taper la reponse : sur un telephone, ecrire est
// laborieux et decourage. On melange les lettres et on propose quatre mots ;
// c'est le meme travail de reconnaissance, sans clavier.

const MOTS = [
  'jardin', 'maison', 'cuisine', 'fenêtre', 'village', 'famille', 'automne', 'lumière',
  'musique', 'voyage', 'tableau', 'chemise', 'bouquet', 'colline', 'rivière', 'silence',
  'fromage', 'panier', 'sourire', 'chapeau', 'guitare', 'peinture', 'horloge', 'balcon',
  'orange', 'cerise', 'lavande', 'moulin', 'ruelle', 'verger', 'marché', 'clocher'
];

export default {
  id: 'anagrammes',
  name: 'Mots mélangés',
  icon: '🔀',
  skill: 'Langue',
  ages: [8, 120],
  rounds: 6,

  make(level, rng) {
    const pool = MOTS.filter((m) => (level <= 2 ? m.length <= 7 : true));
    const mot = pool[Math.floor(rng() * pool.length)];

    // On melange jusqu'a obtenir autre chose que le mot de depart : proposer le
    // mot deja dans l'ordre serait une question sans question.
    let melange = mot;
    for (let i = 0; i < 8 && melange === mot; i += 1) {
      melange = shuffle(mot.split(''), rng).join('');
    }

    // Les distracteurs ont la meme longueur : sinon il suffit de compter les
    // lettres pour repondre sans lire.
    const autres = shuffle(
      MOTS.filter((m) => m !== mot && m.length === mot.length),
      rng
    ).slice(0, 3);
    while (autres.length < 3) {
      const secours = shuffle(MOTS.filter((m) => m !== mot && !autres.includes(m)), rng)[0];
      autres.push(secours);
    }

    return {
      prompt: 'Quel mot se cache derrière ces lettres ?',
      kind: 'phrase',
      display: melange.toUpperCase().split('').join(' '),
      choices: shuffle([mot, ...autres], rng).map((m) => ({
        key: m,
        label: m,
        value: m,
        correct: m === mot
      })),
      hint: `Il commence peut-être par une lettre que vous voyez déjà. Il y a ${mot.length} lettres.`,
      explain: `Le mot était « ${mot} ».`,
      talk: `« ${mot} »… ça vous évoque quelque chose de particulier ?`
    };
  }
};
