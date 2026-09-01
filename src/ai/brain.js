import { neglectScore, favouriteCare, hoursSinceCare } from './memory.js';
import { createRng } from '../core/rng.js';

// IA utilitaire ("utility AI") : chaque comportement possible recoit un score,
// le plus haut gagne. C'est plus lisible qu'une machine a etats et ca produit
// des arbitrages nuances — un monstre affame mais epuise ira dormir.
//
// Trois garde-fous evitent le clignotement de comportement :
//   - un bonus d'inertie pour l'action en cours,
//   - une duree minimale avant de rebasculer,
//   - un bruit deterministe qui casse les egalites.

export const BEHAVIOURS = [
  'sleep',
  'beg',
  'seekAttention',
  'play',
  'sulk',
  'explore',
  'follow',
  'dance',
  'idle'
];

export const EMOTIONS = {
  sleep: 'fatigue',
  beg: 'affame',
  seekAttention: 'seul',
  play: 'joyeux',
  sulk: 'boudeur',
  explore: 'curieux',
  follow: 'joyeux',
  dance: 'excite',
  idle: 'calme'
};

export function createBrain(seed) {
  const rng = createRng(seed + 999);
  let current = 'idle';
  let holdFor = 0;
  let lastScores = {};

  function score(pet, ctx) {
    const { needs, personality, memory } = pet;
    const night = ctx.hourOfDay >= 22 || ctx.hourOfDay < 6;
    const neglect = neglectScore(memory);
    const dirty = 100 - needs.hygiene;

    const s = {
      // Dormir : dette d'energie, renforcee la nuit.
      sleep: (100 - needs.energy) * 1.1 + (night ? 34 : 0) - personality.energy * 18,

      // Reclamer a manger : urgence quasi lineaire, les gourmands insistent.
      beg: (100 - needs.hunger) * 1.25 + personality.greed * 16 - 18,

      // Chercher un cablin : dépend de la sociabilite.
      seekAttention:
        (100 - needs.affection) * (0.7 + personality.sociability * 0.8) - personality.shyness * 22,

      // Jouer : besoin de jeu + energie disponible.
      play: (100 - needs.fun) * 0.95 + personality.energy * 20 - (100 - needs.energy) * 0.6,

      // Bouder : uniquement si on l'a laisse tomber ou s'il est sale.
      sulk: neglect * 95 + dirty * 0.35 - needs.affection * 0.35 - 12,

      // Explorer : comportement de fond, plus fort chez les curieux.
      explore: 18 + personality.curiosity * 42 - personality.shyness * 16,

      // Suivre le doigt : seulement si le joueur touche l'ecran.
      follow: ctx.pointerActive ? 46 + personality.sociability * 30 : -100,

      // Danser : la recompense d'un monstre pleinement satisfait.
      dance: ctx.wellbeing > 85 ? 40 + personality.energy * 30 : -60,

      // Ne rien faire : plancher.
      idle: 16
    };

    // Un timide sursaute quand on le touche : il fuit au lieu de suivre.
    if (ctx.pointerActive && personality.shyness > 0.72) {
      s.follow -= 55;
      s.explore += 20;
    }

    // La nuit, tout le reste devient moins attirant.
    if (night) {
      s.play *= 0.5;
      s.explore *= 0.6;
      s.dance *= 0.3;
    }

    // Il attend son activite favorite quand elle tarde.
    const fav = favouriteCare(memory);
    if (fav === 'play' && hoursSinceCare(memory) > 1) s.play += 14;
    if (fav === 'pet' && hoursSinceCare(memory) > 1) s.seekAttention += 14;

    // Bruit + inertie
    BEHAVIOURS.forEach((b) => {
      s[b] += (rng() - 0.5) * 9;
      if (b === current) s[b] += 12;
    });

    return s;
  }

  // Appele quelques fois par seconde, pas a chaque image.
  function think(pet, ctx, dt = 0) {
    holdFor -= dt;
    const scores = score(pet, ctx);
    lastScores = scores;

    let best = current;
    BEHAVIOURS.forEach((b) => {
      if (scores[b] > scores[best]) best = b;
    });

    // Une urgence forte peut couper court a la duree minimale.
    const urgent = scores[best] > scores[current] + 35;
    if (holdFor <= 0 || urgent) {
      if (best !== current) {
        current = best;
        holdFor = 2.5 + rng() * 3.5;
      }
    }

    const urgency = Math.min(1, Math.max(0, (scores[current] - 20) / 110));
    return {
      action: current,
      emotion: EMOTIONS[current] || 'calme',
      urgency,
      scores
    };
  }

  function forceAction(action, seconds = 3) {
    current = action;
    holdFor = seconds;
  }

  return {
    think,
    forceAction,
    get scores() {
      return lastScores;
    },
    get action() {
      return current;
    }
  };
}
