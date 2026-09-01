import { shuffle } from '../session.js';

// Trouver l'intrus. Un jeu de categorisation, qui fonctionne aussi bien a six
// ans qu'a quatre-vingts, avec des listes plus ou moins evidentes.

const FAMILLES = [
  { nom: 'des fruits', mots: ['pomme', 'poire', 'cerise', 'banane', 'fraise', 'abricot', 'raisin'] },
  { nom: 'des légumes', mots: ['carotte', 'poireau', 'navet', 'courgette', 'haricot', 'radis'] },
  { nom: 'des animaux de la ferme', mots: ['vache', 'mouton', 'poule', 'cochon', 'chèvre', 'canard'] },
  { nom: 'des animaux sauvages', mots: ['renard', 'sanglier', 'cerf', 'blaireau', 'loup', 'lièvre'] },
  { nom: 'des oiseaux', mots: ['merle', 'pinson', 'mésange', 'moineau', 'hirondelle', 'corbeau'] },
  { nom: 'des fleurs', mots: ['rose', 'tulipe', 'pivoine', 'muguet', 'lilas', 'iris'] },
  { nom: 'des arbres', mots: ['chêne', 'hêtre', 'bouleau', 'platane', 'tilleul', 'peuplier'] },
  { nom: 'des métiers', mots: ['boulanger', 'menuisier', 'facteur', 'couturière', 'maçon', 'infirmier'] },
  { nom: 'des instruments', mots: ['piano', 'violon', 'accordéon', 'trompette', 'guitare', 'flûte'] },
  { nom: 'des meubles', mots: ['armoire', 'buffet', 'commode', 'fauteuil', 'tabouret', 'étagère'] },
  { nom: 'des vêtements', mots: ['manteau', 'écharpe', 'chemise', 'pantalon', 'gilet', 'chapeau'] },
  { nom: 'des mois', mots: ['janvier', 'mars', 'juillet', 'octobre', 'novembre', 'avril'] },
  { nom: 'des outils', mots: ['marteau', 'tournevis', 'pince', 'scie', 'rabot', 'perceuse'] },
  { nom: 'des desserts', mots: ['tarte', 'clafoutis', 'flan', 'éclair', 'mousse', 'crumble'] },
  { nom: 'des couleurs', mots: ['bleu', 'vert', 'jaune', 'rouge', 'violet', 'orange'] }
];

export default {
  id: 'intrus',
  name: 'Trouvez l’intrus',
  icon: '🔍',
  skill: 'Logique',
  ages: [5, 120],
  rounds: 6,

  make(level, rng) {
    const familles = shuffle(FAMILLES, rng);
    const famille = familles[0];
    const etrangere = familles[1];

    // Trois mots de la meme famille et un seul venu d'ailleurs : au-dela,
    // l'intrus devient trop facile a reperer par elimination.
    const count = level <= 1 ? 3 : 4;
    const mots = shuffle(famille.mots, rng).slice(0, count);
    const intrus = shuffle(etrangere.mots, rng)[0];

    return {
      prompt: 'Quel mot ne va pas avec les autres ?',
      kind: 'phrase',
      choices: shuffle([...mots, intrus], rng).map((m) => ({
        key: m,
        label: m,
        value: m,
        correct: m === intrus
      })),
      hint: `Les autres sont tous ${famille.nom}.`,
      explain: `« ${intrus} » est l’intrus : les autres sont ${famille.nom}.`,
      talk: `Tiens, en parlant ${famille.nom}… vous en avez une préférée ?`
    };
  }
};
