import { shuffle } from '../session.js';

// Vocabulaire : synonymes et contraires. Un exercice de langue qui reste
// agreable parce qu'il n'y a rien a calculer, juste a reconnaitre.

const SYNONYMES = [
  ['content', 'joyeux'], ['rapide', 'véloce'], ['calme', 'paisible'], ['ancien', 'vieux'],
  ['courageux', 'brave'], ['malin', 'astucieux'], ['fatigué', 'las'], ['beau', 'joli'],
  ['difficile', 'ardu'], ['bavard', 'loquace'], ['gentil', 'aimable'], ['triste', 'morose'],
  ['drôle', 'amusant'], ['solide', 'robuste'], ['propre', 'net'], ['riche', 'fortuné'],
  ['peureux', 'craintif'], ['sale', 'crasseux'], ['grand', 'vaste'], ['doux', 'suave'],
  ['bizarre', 'étrange'], ['furieux', 'enragé'], ['simple', 'aisé'], ['soigneux', 'méticuleux']
];

const CONTRAIRES = [
  ['chaud', 'froid'], ['grand', 'petit'], ['jour', 'nuit'], ['plein', 'vide'],
  ['ouvert', 'fermé'], ['lourd', 'léger'], ['jeune', 'vieux'], ['riche', 'pauvre'],
  ['content', 'triste'], ['rapide', 'lent'], ['clair', 'sombre'], ['dur', 'mou'],
  ['sec', 'humide'], ['proche', 'lointain'], ['bruyant', 'silencieux'], ['sucré', 'salé'],
  ['souvent', 'rarement'], ['monter', 'descendre'], ['gagner', 'perdre'], ['début', 'fin']
];

export default {
  id: 'synonymes',
  name: 'Les mots',
  icon: '📖',
  skill: 'Langue',
  ages: [8, 120],
  rounds: 6,

  make(level, rng) {
    const contraire = rng() < 0.45;
    const banque = contraire ? CONTRAIRES : SYNONYMES;
    const [mot, reponse] = banque[Math.floor(rng() * banque.length)];

    // Les distracteurs viennent de la meme banque : ce sont de vrais mots du
    // meme registre, pas du remplissage.
    const autres = shuffle(
      banque.flat().filter((m) => m !== mot && m !== reponse),
      rng
    ).slice(0, 3);

    return {
      prompt: contraire
        ? `Quel est le contraire de « ${mot} » ?`
        : `Quel mot veut dire la même chose que « ${mot} » ?`,
      kind: 'phrase',
      display: mot,
      choices: shuffle([reponse, ...autres], rng).map((t) => ({
        key: t,
        label: t,
        value: t,
        correct: t === reponse
      })),
      hint: contraire
        ? 'Cherchez le mot qui dit exactement l’inverse.'
        : 'Cherchez le mot qu’on pourrait mettre à la place sans changer le sens.',
      explain: contraire
        ? `Le contraire de « ${mot} », c’est « ${reponse} ».`
        : `« ${mot} » veut dire la même chose que « ${reponse} ».`,
      talk: `« ${mot} »… c’est un mot qu’on entend moins qu’avant, non ?`
    };
  }
};
