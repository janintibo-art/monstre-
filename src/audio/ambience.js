// Ambiance sonore.
//
// Tout est **calculé**, aucun fichier audio : le projet reste léger et rien à
// télécharger. Trois couches, mélangées selon l'heure et le décor :
//
//   • le vent — du bruit filtré, dont la fréquence de coupure ondule ;
//   • les oiseaux — de courts sifflements le jour, plus denses au matin ;
//   • les grillons — des stridulations la nuit.
//
// C'est probablement ce qui apporte le plus de présence pour l'effort. Un
// décor silencieux est un décor derrière une vitre.
//
// Le son ne démarre jamais tout seul : les navigateurs l'interdisent tant que
// l'utilisateur n'a pas touché l'écran, et surtout personne n'aime qu'une
// application se mette à faire du bruit sans prévenir.

const KEY = 'monstre.ambiance';

export function loadAmbience() {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}

export function saveAmbience(actif) {
  try {
    localStorage.setItem(KEY, actif ? '1' : '0');
  } catch {
    /* stockage indisponible */
  }
}

export function createAmbience() {
  let ctx = null;
  let maitre = null;
  let ventGain = null;
  let filtreVent = null;
  let actif = false;
  let nuit = 0;
  let intensite = 1;
  let prochainOiseau = 3;
  let prochainGrillon = 1;

  function demarrer() {
    if (ctx || !loadAmbience()) return false;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return false;

    ctx = new Audio();
    maitre = ctx.createGain();
    maitre.gain.value = 0;
    maitre.connect(ctx.destination);

    // Vent : deux secondes de bruit blanc bouclées, passées dans un filtre
    // passe-bas dont la coupure respire. Une boucle courte s'entend ; une
    // coupure qui bouge la masque entièrement.
    const taille = ctx.sampleRate * 2;
    const tampon = ctx.createBuffer(1, taille, ctx.sampleRate);
    const donnees = tampon.getChannelData(0);
    let precedent = 0;
    for (let i = 0; i < taille; i += 1) {
      const blanc = Math.random() * 2 - 1;
      // Léger lissage : du bruit brun plutôt que blanc, plus proche du vent.
      precedent = (precedent + blanc * 0.06) / 1.06;
      donnees[i] = precedent * 3.2;
    }

    const source = ctx.createBufferSource();
    source.buffer = tampon;
    source.loop = true;

    filtreVent = ctx.createBiquadFilter();
    filtreVent.type = 'lowpass';
    filtreVent.frequency.value = 420;
    filtreVent.Q.value = 0.6;

    ventGain = ctx.createGain();
    ventGain.gain.value = 0.16;

    source.connect(filtreVent);
    filtreVent.connect(ventGain);
    ventGain.connect(maitre);
    source.start();

    actif = true;
    maitre.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2.5);
    return true;
  }

  // Un sifflement d'oiseau : une porteuse dont la hauteur glisse, très courte.
  function oiseau() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    const base = 1600 + Math.random() * 1400;
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.5), t + 0.09);
    osc.frequency.exponentialRampToValueAtTime(base * 0.85, t + 0.19);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.05 * intensite, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);

    osc.connect(gain);
    gain.connect(maitre);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  // Une stridulation : une série de très brèves impulsions aiguës.
  function grillon() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 4200 + Math.random() * 500;

    gain.gain.setValueAtTime(0, t);
    for (let i = 0; i < 4; i += 1) {
      const d = t + i * 0.05;
      gain.gain.setValueAtTime(0.018 * intensite, d);
      gain.gain.setValueAtTime(0, d + 0.022);
    }

    osc.connect(gain);
    gain.connect(maitre);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  function update(dt, facteurNuit, phase = '') {
    if (!ctx || !actif) return;
    nuit = facteurNuit;

    // Le vent souffle par rafales lentes, et il est plus sourd la nuit.
    const t = ctx.currentTime;
    const rafale = 0.5 + 0.5 * Math.sin(t * 0.11) * Math.sin(t * 0.043);
    filtreVent.frequency.setTargetAtTime(280 + rafale * 520 * (1 - nuit * 0.5), t, 0.6);
    ventGain.gain.setTargetAtTime(0.1 + rafale * 0.13, t, 0.8);

    // Les oiseaux chantent le jour, beaucoup au matin. Les grillons prennent
    // le relais la nuit. Entre les deux, un moment presque silencieux — c'est
    // ce silence qui rend le reste crédible.
    prochainOiseau -= dt;
    if (prochainOiseau <= 0) {
      const densite = phase === 'matin' || phase === 'aube' ? 1.8 : 1;
      prochainOiseau = (1.6 + Math.random() * 5) / densite;
      if (nuit < 0.35) oiseau();
    }

    prochainGrillon -= dt;
    if (prochainGrillon <= 0) {
      prochainGrillon = 0.45 + Math.random() * 1.4;
      if (nuit > 0.55) grillon();
    }
  }

  function setVolume(valeur) {
    intensite = valeur;
    if (maitre && ctx) maitre.gain.setTargetAtTime(0.5 * valeur, ctx.currentTime, 0.4);
  }

  function stop() {
    if (!ctx) return;
    maitre.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
    actif = false;
    const fermeture = ctx;
    setTimeout(() => fermeture.close().catch(() => {}), 1200);
    ctx = null;
  }

  return {
    demarrer,
    update,
    setVolume,
    stop,
    get actif() {
      return actif;
    }
  };
}
