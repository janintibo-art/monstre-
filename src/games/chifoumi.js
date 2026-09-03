// Chifoumi.
//
// Module pur : la logique du jeu, sans rendu ni son. C'est ce qui permet de la
// tester — et il y a de quoi tester, car la partie intéressante n'est pas de
// désigner le gagnant, c'est de décider ce que joue la créature.

export const COUPS = ['pierre', 'feuille', 'ciseaux'];

export const BAT = {
  pierre: 'ciseaux',
  feuille: 'pierre',
  ciseaux: 'feuille'
};

export const NOMS = {
  pierre: 'Pierre',
  feuille: 'Feuille',
  ciseaux: 'Ciseaux'
};

// Ce qui bat un coup donné.
export function contre(coup) {
  return COUPS.find((c) => BAT[c] === coup);
}

export function resultat(joueur, creature) {
  if (joueur === creature) return 'egalite';
  return BAT[joueur] === creature ? 'gagne' : 'perd';
}

// Le coup de la créature.
//
// Un tirage parfaitement aléatoire ferait du chifoumi un pile ou face : rien à
// apprendre, rien à contrer, aucune raison de rejouer. Une créature qui joue
// **comme quelqu'un** est un adversaire.
//
// Elle observe donc ce que le joueur a joué le plus souvent et tente de le
// contrer — c'est exactement ce que font les humains entre eux. Le reste du
// temps, elle joue au hasard, sans quoi elle deviendrait prévisible à son tour.
//
// Elle ne regarde **jamais** le coup en cours : elle ne triche pas. C'est la
// seule règle non négociable d'un jeu d'adresse, même contre une créature de
// dessin animé.
export function coupCreature(historique, personnalite = {}, rng = Math.random) {
  // L'audace décide de la part de calcul. Une créature timide joue au hasard
  // et se laisse battre ; une créature effrontée lit le jeu.
  const audace = 1 - (personnalite.shyness ?? 0.5);
  const partCalcul = 0.25 + audace * 0.45;

  const recents = historique.slice(-6);
  if (recents.length >= 3 && rng() < partCalcul) {
    const comptes = { pierre: 0, feuille: 0, ciseaux: 0 };
    // Les coups les plus récents pèsent davantage : on suit le joueur qui
    // change d'habitude au lieu de rester sur sa moyenne de toute la partie.
    recents.forEach((coup, i) => {
      comptes[coup] += i + 1;
    });

    let favori = COUPS[0];
    COUPS.forEach((c) => {
      if (comptes[c] > comptes[favori]) favori = c;
    });

    // Égalité parfaite : rien à lire, on retombe sur le hasard.
    const exaequo = COUPS.filter((c) => comptes[c] === comptes[favori]);
    if (exaequo.length === 1) return contre(favori);
  }

  return COUPS[Math.floor(rng() * COUPS.length) % COUPS.length];
}

// Phrases de la créature. Elle commente sans jamais se moquer : un enfant qui
// perd trois fois de suite doit avoir envie de rejouer.
const PHRASES = {
  gagne: ['Ah, tu m’as eu !', 'Bien joué !', 'Tu es fort à ce jeu.', 'Encore perdu…'],
  perd: ['Gagné !', 'Cette fois c’est moi.', 'Hop !', 'J’avais deviné.'],
  egalite: ['Pareil !', 'On a pensé à la même chose.', 'Égalité.', 'Deux fois la même !']
};

export function phrase(issue, rng = Math.random) {
  const liste = PHRASES[issue] || PHRASES.egalite;
  return liste[Math.floor(rng() * liste.length) % liste.length];
}

// Bilan de fin de manche.
export function bilan({ gagne, perd, egalite }) {
  const total = gagne + perd + egalite;
  if (!total) return 'On n’a pas encore joué.';
  if (gagne > perd) return `Tu m’as battu ${gagne} à ${perd} ! On refait ?`;
  if (perd > gagne) return `J’ai gagné ${perd} à ${gagne}. Tu veux ta revanche ?`;
  return `${gagne} partout. Il faut départager, non ?`;
}
