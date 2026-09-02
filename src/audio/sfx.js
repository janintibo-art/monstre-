// Sons d'interface.
//
// C'est le manque le plus audible d'un logiciel qui se veut fini : on touche un
// bouton et il ne se passe rien. L'œil voit la réaction, l'oreille n'en a
// aucune, et l'ensemble paraît inerte quelle que soit la qualité de l'image.
//
// Tout est **calculé**, comme l'ambiance : aucun fichier, quelques dizaines de
// lignes. Trois règles de conception :
//
//   1. **Court.** Moins de 200 ms pour un retour de touche. Au-delà, on entend
//      le son au lieu de sentir le bouton.
//   2. **Doux.** Des ondes sinusoïdales et triangulaires, jamais de carrée pour
//      l'interface : une onde carrée est agressive à faible volume.
//   3. **Varié.** La hauteur change légèrement à chaque fois. Un son
//      rigoureusement identique répété devient vite insupportable.

let ctx = null;
let sortie = null;
let coupe = false;

function contexte() {
  if (ctx) return ctx;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return null;
  ctx = new Audio();
  sortie = ctx.createGain();
  sortie.gain.value = 0.28;
  sortie.connect(ctx.destination);
  return ctx;
}

export function setMuted(valeur) {
  coupe = Boolean(valeur);
}

// Brique de base : une note à l'enveloppe douce.
function note({ frequence, duree = 0.12, type = 'sine', volume = 1, glisse = 0, retard = 0 }) {
  const a = contexte();
  if (!a || coupe) return;

  const t = a.currentTime + retard;
  const osc = a.createOscillator();
  const gain = a.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequence, t);
  if (glisse) osc.frequency.exponentialRampToValueAtTime(frequence * glisse, t + duree);

  // Attaque très courte mais non nulle : à zéro, on entend un clic parasite.
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.22 * volume, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duree);

  osc.connect(gain);
  gain.connect(sortie);
  osc.start(t);
  osc.stop(t + duree + 0.05);
}

function variation(base, ecart = 0.03) {
  return base * (1 + (Math.random() - 0.5) * ecart * 2);
}

export const sfx = {
  // Toucher un bouton : une note brève et mate.
  touche() {
    note({ frequence: variation(660), duree: 0.07, volume: 0.55, type: 'sine' });
  },

  // Confirmer : deux notes qui montent.
  valide() {
    note({ frequence: variation(587), duree: 0.09, volume: 0.6 });
    note({ frequence: variation(880), duree: 0.13, volume: 0.5, retard: 0.07 });
  },

  // Refuser : une note qui descend, sans dureté — ce n'est pas une punition.
  refuse() {
    note({ frequence: variation(360), duree: 0.16, volume: 0.5, glisse: 0.75, type: 'triangle' });
  },

  // Bonne réponse dans un jeu : un petit arpège.
  reussite() {
    [523, 659, 784].forEach((f, i) => {
      note({ frequence: variation(f), duree: 0.16, volume: 0.5, retard: i * 0.075 });
    });
  },

  // Un soin donné : une note ronde et chaude.
  soin() {
    note({ frequence: variation(494), duree: 0.18, volume: 0.55, type: 'triangle', glisse: 1.18 });
  },

  // La coquille craque : un bruit court et sec, filtré.
  craque() {
    const a = contexte();
    if (!a || coupe) return;
    const t = a.currentTime;
    const taille = Math.floor(a.sampleRate * 0.07);
    const tampon = a.createBuffer(1, taille, a.sampleRate);
    const d = tampon.getChannelData(0);
    for (let i = 0; i < taille; i += 1) {
      // Décroissance rapide : un craquement, pas un souffle.
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / taille, 3);
    }
    const src = a.createBufferSource();
    src.buffer = tampon;
    const filtre = a.createBiquadFilter();
    filtre.type = 'bandpass';
    filtre.frequency.value = variation(1400, 0.25);
    filtre.Q.value = 1.2;
    const gain = a.createGain();
    gain.gain.value = 0.5;
    src.connect(filtre);
    filtre.connect(gain);
    gain.connect(sortie);
    src.start(t);
  },

  // L'éclosion : une montée large, le seul son long de l'application.
  eclosion() {
    [392, 523, 659, 784, 1047].forEach((f, i) => {
      note({ frequence: f, duree: 0.5, volume: 0.45, retard: i * 0.11, type: 'triangle' });
    });
  }
};

// Le son ne peut démarrer qu'après un geste : les navigateurs l'imposent.
export function unlockSfx() {
  const a = contexte();
  if (a && a.state === 'suspended') a.resume().catch(() => {});
}
