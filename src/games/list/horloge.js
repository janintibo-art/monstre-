import { shuffle } from '../session.js';

// Lire l'heure. Une horloge dessinee en SVG, avec de vraies aiguilles : c'est
// la seule facon d'apprendre a lire un cadran, un affichage numerique
// n'apprendrait rien.

export default {
  id: 'horloge',
  name: 'Quelle heure est-il ?',
  icon: '🕒',
  skill: 'Temps',
  ages: [6, 99],
  rounds: 5,

  make(level, rng) {
    // On avance par paliers : heures pleines, puis demies, puis quarts, puis
    // cinq minutes. Sauter une etape et l'enfant decroche.
    const pas = [60, 60, 30, 15, 5][level] || 30;
    const heure = 1 + Math.floor(rng() * 12);
    const minute = Math.floor(rng() * (60 / pas)) * pas;

    const bonne = format(heure, minute);

    // On construit l'ensemble complet des heures possibles a ce palier, puis on
    // y pioche. Un tirage au hasard avec reessai bouclerait a l'infini au
    // niveau le plus facile, ou il n'existe que douze heures differentes.
    const toutes = new Set();
    for (let h = 1; h <= 12; h += 1) {
      for (let m = 0; m < 60; m += pas) toutes.add(format(h, m));
    }
    toutes.delete(bonne);

    // Les heures proches d'abord : se tromper d'une heure est une erreur
    // credible, confondre 3 h et 11 h ne fait pas reflechir.
    const proches = [];
    [-1, 1, -2, 2].forEach((dh) => {
      const h = ((heure + dh + 11) % 12) + 1;
      proches.push(format(h, minute));
    });
    if (pas < 60) {
      [-pas, pas].forEach((dm) => {
        proches.push(format(heure, ((minute + dm) % 60 + 60) % 60));
      });
    }

    const faux = [];
    shuffle(proches, rng).forEach((t) => {
      if (faux.length < 3 && t !== bonne && !faux.includes(t)) faux.push(t);
    });
    // Complement si les voisines ne suffisent pas.
    shuffle([...toutes], rng).forEach((t) => {
      if (faux.length < 3 && !faux.includes(t)) faux.push(t);
    });

    return {
      prompt: 'Quelle heure indique cette horloge ?',
      kind: 'clock',
      clock: { heure, minute },
      choices: shuffle([bonne, ...faux], rng).map((t) => ({
        key: t,
        label: t,
        value: t,
        correct: t === bonne
      })),
      hint: 'La petite aiguille donne les heures, la grande les minutes.',
      explain: `Il était ${bonne}.`
    };
  }
};

function format(heure, minute) {
  if (minute === 0) return `${heure} heures`;
  if (minute === 15) return `${heure} heures et quart`;
  if (minute === 30) return `${heure} heures et demie`;
  if (minute === 45) return `${(heure % 12) + 1} heures moins le quart`;
  return `${heure} heures ${minute}`;
}
