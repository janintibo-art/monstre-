import { shuffle } from '../session.js';

// Les devinettes.
//
// Le premier jeu conçu **pour la voix**. La créature décrit quelque chose, on
// répond à haute voix, elle réagit. Aucun texte à lire, aucun bouton à viser :
// une conversation qui se trouve être un jeu.
//
// Les réponses restent proposées à l'écran, pour qu'on puisse aussi toucher —
// un jeu qui n'existe qu'à la voix exclut ceux qui ne peuvent pas parler, ou
// qui jouent dans le bus.

const DEVINETTES = [
  { indice: 'Je pense à un animal qui fait « miaou ».', reponse: 'chat', famille: 'animaux' },
  { indice: 'Je pense à un animal qui aboie et garde la maison.', reponse: 'chien', famille: 'animaux' },
  { indice: 'Je pense à un animal qui donne du lait et dit « meuh ».', reponse: 'vache', famille: 'animaux' },
  { indice: 'Je pense à un animal tout gris avec une très longue trompe.', reponse: 'éléphant', famille: 'animaux' },
  { indice: 'Je pense à un animal qui saute et porte son petit dans une poche.', reponse: 'kangourou', famille: 'animaux' },
  { indice: 'Je pense à un animal qui vit dans l’eau et n’a pas de pattes.', reponse: 'poisson', famille: 'animaux' },
  { indice: 'Je pense à un animal orange à rayures noires.', reponse: 'tigre', famille: 'animaux' },
  { indice: 'Je pense à un animal qui fait du miel.', reponse: 'abeille', famille: 'animaux' },

  { indice: 'Je pense à un fruit rouge, rond, qui pousse sur un arbre.', reponse: 'pomme', famille: 'fruits' },
  { indice: 'Je pense à un fruit jaune et long, que les singes adorent.', reponse: 'banane', famille: 'fruits' },
  { indice: 'Je pense à un fruit jaune et très acide.', reponse: 'citron', famille: 'fruits' },
  { indice: 'Je pense à un fruit orange qui porte le même nom que sa couleur.', reponse: 'orange', famille: 'fruits' },

  { indice: 'Je pense à quelque chose de rond et jaune qui nous éclaire le jour.', reponse: 'soleil', famille: 'ciel' },
  { indice: 'Je pense à quelque chose qui brille la nuit, tout en haut du ciel.', reponse: 'étoile', famille: 'ciel' },
  { indice: 'Je pense à quelque chose de blanc et cotonneux qui flotte dans le ciel.', reponse: 'nuage', famille: 'ciel' },

  { indice: 'Je pense à un objet qui sert à écrire.', reponse: 'crayon', famille: 'objets' },
  { indice: 'Je pense à un objet qui donne l’heure.', reponse: 'horloge', famille: 'objets' },
  { indice: 'Je pense à un objet où l’on dort la nuit.', reponse: 'lit', famille: 'objets' },
  { indice: 'Je pense à un objet à deux roues sur lequel on pédale.', reponse: 'vélo', famille: 'objets' },
  { indice: 'Je pense à un objet qui ouvre les portes.', reponse: 'clé', famille: 'objets' },

  { indice: 'Je pense à une saison où il neige et où il fait froid.', reponse: 'hiver', famille: 'saisons' },
  { indice: 'Je pense à la saison où les feuilles tombent.', reponse: 'automne', famille: 'saisons' },
  { indice: 'Je pense à la saison des fleurs et des oiseaux.', reponse: 'printemps', famille: 'saisons' }
];

export default {
  id: 'devinette',
  name: 'Devine à quoi je pense',
  icon: '❓',
  skill: 'Vocabulaire',
  ages: [4, 120],
  rounds: 6,
  // Ce jeu est fait pour être joué à la voix : l'interface le proposera
  // d'emblée au lieu d'attendre qu'on trouve le bouton.
  voix: true,

  make(level, rng) {
    const choisie = DEVINETTES[Math.floor(rng() * DEVINETTES.length)];

    // Les fausses réponses viennent de la même famille : proposer « crayon »
    // face à « chat » se devine sans réfléchir.
    const memeFamille = DEVINETTES.filter(
      (d) => d.famille === choisie.famille && d.reponse !== choisie.reponse
    );
    const ailleurs = DEVINETTES.filter((d) => d.famille !== choisie.famille);
    const nombre = Math.min(3, level <= 1 ? 2 : 3);

    const faux = shuffle(memeFamille, rng)
      .slice(0, nombre)
      .map((d) => d.reponse);
    while (faux.length < nombre) {
      const secours = shuffle(ailleurs, rng)[0].reponse;
      if (!faux.includes(secours) && secours !== choisie.reponse) faux.push(secours);
    }

    return {
      prompt: choisie.indice,
      kind: 'phrase',
      choices: shuffle([choisie.reponse, ...faux], rng).map((mot) => ({
        key: mot,
        label: mot,
        value: mot,
        correct: mot === choisie.reponse
      })),
      hint: `Ça commence par la lettre ${choisie.reponse[0].toUpperCase()}.`,
      explain: `C’était « ${choisie.reponse} ».`,
      talk: `Tu connais bien les ${choisie.famille}, dis-moi. Tu en as un près de toi ?`
    };
  }
};
