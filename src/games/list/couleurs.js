import { shuffle } from '../session.js';

// Reconnaissance des couleurs. Le tout premier jeu : aucune lecture requise,
// la consigne est entierement portee par la voix et par la couleur elle-meme.

const COULEURS = [
  { nom: 'rouge', hex: '#e5484d' },
  { nom: 'bleu', hex: '#3e7bfa' },
  { nom: 'jaune', hex: '#f5c518' },
  { nom: 'vert', hex: '#3fb950' },
  { nom: 'orange', hex: '#f0883e' },
  { nom: 'violet', hex: '#a371f7' },
  { nom: 'rose', hex: '#ff7fae' },
  { nom: 'marron', hex: '#8b5e3c' },
  { nom: 'noir', hex: '#1c1c22' },
  { nom: 'blanc', hex: '#f2f2f5' },
  { nom: 'gris', hex: '#9aa0ab' }
];

export default {
  id: 'couleurs',
  name: 'Les couleurs',
  icon: '🎨',
  skill: 'Observation',
  ages: [3, 7],
  rounds: 6,

  make(level, rng) {
    // Le nombre de choix monte avec l'age : deux couleurs a trois ans, six a
    // sept. Trop de choix d'emblee, et l'enfant tape au hasard.
    const count = Math.min(COULEURS.length, [2, 3, 4, 5, 6][level] || 4);
    const palette = shuffle(COULEURS, rng).slice(0, count);
    const target = palette[Math.floor(rng() * palette.length)];

    return {
      prompt: `Touche la couleur ${target.nom}.`,
      kind: 'color',
      choices: palette.map((c) => ({
        key: c.nom,
        label: c.nom,
        value: c.hex,
        correct: c.nom === target.nom
      })),
      hint: `Le ${target.nom}, c’est comme ${exemple(target.nom)}.`,
      explain: `C’était le ${target.nom}.`
    };
  }
};

// Un exemple concret vaut mieux qu'une definition : un enfant de trois ans ne
// sait pas ce qu'est une longueur d'onde, mais il connait les fraises.
function exemple(nom) {
  const exemples = {
    rouge: 'une fraise',
    bleu: 'le ciel',
    jaune: 'le soleil',
    vert: 'l’herbe',
    orange: 'une carotte',
    violet: 'une prune',
    rose: 'un cochon',
    marron: 'du chocolat',
    noir: 'la nuit',
    blanc: 'la neige',
    gris: 'un nuage de pluie'
  };
  return exemples[nom] || 'quelque chose que tu connais';
}
