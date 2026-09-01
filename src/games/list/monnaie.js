import { shuffle } from '../session.js';

// Rendre la monnaie. Du calcul mental, mais ancre dans un geste du quotidien :
// on ne demande pas « combien font 20 moins 13,40 », on demande ce que rend la
// boulangere. C'est le meme calcul, et il a du sens.

const ACHATS = [
  ['une baguette', 1.2], ['un journal', 2.5], ['un café', 1.8], ['un croissant', 1.1],
  ['un litre de lait', 1.15], ['un timbre', 1.39], ['une salade', 1.6], ['un poulet rôti', 9.5],
  ['un bouquet de fleurs', 12.5], ['un kilo de pommes', 2.9], ['une part de tarte', 3.4],
  ['un ticket de bus', 1.7], ['un livre de poche', 8.9], ['une plaque de chocolat', 2.35]
];

const BILLETS = [5, 10, 20, 50];

export default {
  id: 'monnaie',
  name: 'Rendre la monnaie',
  icon: '🪙',
  skill: 'Calcul',
  ages: [8, 120],
  rounds: 6,

  make(level, rng) {
    const [objet, prixBase] = ACHATS[Math.floor(rng() * ACHATS.length)];

    // Aux niveaux faciles, on arrondit a l'euro : les centimes ajoutent une
    // difficulte de calcul qui n'a rien a voir avec le principe du jeu.
    const prix = level <= 2 ? Math.ceil(prixBase) : prixBase;
    const billet = BILLETS.find((b) => b > prix + 0.5) || 50;
    const rendu = Math.round((billet - prix) * 100) / 100;

    const faux = new Set();
    [rendu + 1, rendu - 1, rendu + 0.5, rendu - 0.1, rendu + 10].forEach((n) => {
      const v = Math.round(n * 100) / 100;
      if (v !== rendu && v > 0) faux.add(v);
    });

    const format = (n) => `${n.toFixed(2).replace('.', ',')} €`;

    return {
      prompt: `Vous achetez ${objet} à ${format(prix)} et vous payez avec un billet de ${billet} euros. Combien vous rend-on ?`,
      kind: 'phrase',
      display: `${format(prix)}  →  ${billet} €`,
      choices: shuffle([rendu, ...shuffle([...faux], rng).slice(0, 3)], rng).map((n) => ({
        key: format(n),
        label: format(n),
        value: n,
        correct: n === rendu
      })),
      hint: `Partez du prix et montez jusqu’à ${billet} euros.`,
      explain: `${billet} € moins ${format(prix)} font ${format(rendu)}.`,
      talk: `${objet}… vous vous souvenez du prix que ça faisait, avant ?`
    };
  }
};
