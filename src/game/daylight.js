import * as THREE from 'three';

// Cycle jour/nuit.
//
// Sept moments, interpoles en continu : la lumiere ne saute jamais d'un etat a
// l'autre. Chaque moment definit sa palette complete — ciel, brouillard,
// lumieres, etoiles — parce qu'un ciel d'aube sous une lumiere de midi sonnerait
// aussi faux qu'une prairie eclairee en violet.
//
// La course du soleil est calculee, pas scriptee : son elevation suit une
// sinusoide sur la journee, ce qui donne des ombres qui s'allongent le soir.

export const CYCLE_MODES = {
  real: 'Heure réelle',
  fast: 'Accéléré (24 min)',
  day: 'Toujours jour',
  night: 'Toujours nuit'
};

const KEY = 'monstre.cycle';

export function loadCycleMode() {
  try {
    return localStorage.getItem(KEY) || 'real';
  } catch {
    return 'real';
  }
}

export function saveCycleMode(mode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* stockage indisponible */
  }
}

// `at` est la position dans la journee, de 0 (minuit) a 1 (minuit suivant).
const PHASES = [
  {
    at: 0.0,
    name: 'nuit',
    skyTop: 0x101a3c,
    skyBottom: 0x05070f,
    fog: 0x070b18,
    fogNear: 7,
    fogFar: 22,
    hemiSky: 0x5a74b0,
    hemiGround: 0x171226,
    hemi: 0.4,
    key: 0xb9cdff,
    keyIntensity: 0.45,
    rim: 2.6,
    stars: 1,
    sun: 0xdfe8ff,
    sunSize: 0.9
  },
  {
    at: 0.23,
    name: 'aube',
    skyTop: 0x3b4a86,
    skyBottom: 0xd98a6a,
    fog: 0x6b5a72,
    fogNear: 8,
    fogFar: 26,
    hemiSky: 0xffc9a8,
    hemiGround: 0x3a2c3a,
    hemi: 0.7,
    key: 0xffb277,
    keyIntensity: 1.5,
    rim: 1.2,
    stars: 0.25,
    sun: 0xffb47a,
    sunSize: 1.5
  },
  {
    at: 0.34,
    name: 'matin',
    skyTop: 0x4f8fd6,
    skyBottom: 0xbfe4f5,
    fog: 0x9fc4dd,
    fogNear: 12,
    fogFar: 34,
    hemiSky: 0xdff0ff,
    hemiGround: 0x6a6a55,
    hemi: 0.85,
    key: 0xfff2da,
    keyIntensity: 1.9,
    rim: 0.35,
    stars: 0,
    sun: 0xfff4d8,
    sunSize: 1.1
  },
  {
    at: 0.5,
    name: 'midi',
    skyTop: 0x3f86dc,
    skyBottom: 0xcdeaff,
    fog: 0xb4d6ec,
    fogNear: 14,
    fogFar: 38,
    hemiSky: 0xeaf6ff,
    hemiGround: 0x7a7a60,
    hemi: 0.95,
    key: 0xfffaf0,
    keyIntensity: 2.2,
    rim: 0.2,
    stars: 0,
    sun: 0xffffff,
    sunSize: 1
  },
  {
    at: 0.68,
    name: 'après-midi',
    skyTop: 0x4a80c8,
    skyBottom: 0xe8d4b0,
    fog: 0xc0b39a,
    fogNear: 12,
    fogFar: 34,
    hemiSky: 0xffeccd,
    hemiGround: 0x6b5a44,
    hemi: 0.95,
    key: 0xffe3b0,
    keyIntensity: 1.8,
    rim: 0.4,
    stars: 0,
    sun: 0xffe1a8,
    sunSize: 1.2
  },
  {
    at: 0.79,
    name: 'crépuscule',
    skyTop: 0x35306e,
    skyBottom: 0xe0714f,
    fog: 0x6a4258,
    fogNear: 9,
    fogFar: 27,
    hemiSky: 0xffb08a,
    hemiGround: 0x33223a,
    hemi: 0.65,
    key: 0xff8f52,
    keyIntensity: 1.4,
    rim: 1.4,
    stars: 0.3,
    sun: 0xff8a4a,
    sunSize: 1.7
  },
  {
    at: 0.88,
    name: 'nuit',
    skyTop: 0x101a3c,
    skyBottom: 0x05070f,
    fog: 0x070b18,
    fogNear: 7,
    fogFar: 22,
    hemiSky: 0x5a74b0,
    hemiGround: 0x171226,
    hemi: 0.4,
    key: 0xb9cdff,
    keyIntensity: 0.45,
    rim: 2.6,
    stars: 1,
    sun: 0xdfe8ff,
    sunSize: 0.9
  }
];

const NUMERIC = ['fogNear', 'fogFar', 'hemi', 'keyIntensity', 'rim', 'stars', 'sunSize'];
const COLORS = ['skyTop', 'skyBottom', 'fog', 'hemiSky', 'hemiGround', 'key', 'sun'];

function smooth(t) {
  return t * t * (3 - 2 * t); // adoucit les entrees et sorties de phase
}

// Palette interpolee pour une position quelconque dans la journee.
function sample(t, out) {
  let a = PHASES[PHASES.length - 1];
  let b = PHASES[0];
  let span = 1 - a.at + b.at;
  let local = t >= a.at ? (t - a.at) / span : (t + 1 - a.at) / span;

  for (let i = 0; i < PHASES.length - 1; i += 1) {
    if (t >= PHASES[i].at && t < PHASES[i + 1].at) {
      a = PHASES[i];
      b = PHASES[i + 1];
      span = b.at - a.at;
      local = (t - a.at) / span;
      break;
    }
  }

  const k = smooth(Math.min(1, Math.max(0, local)));
  COLORS.forEach((key) => {
    out[key].setHex(a[key]).lerp(out.scratch.setHex(b[key]), k);
  });
  NUMERIC.forEach((key) => {
    out[key] = a[key] + (b[key] - a[key]) * k;
  });
  out.name = k < 0.5 ? a.name : b.name;
  return out;
}

function makePalette() {
  const palette = { scratch: new THREE.Color(), name: 'nuit' };
  COLORS.forEach((key) => {
    palette[key] = new THREE.Color();
  });
  NUMERIC.forEach((key) => {
    palette[key] = 0;
  });
  return palette;
}

// Choix des deux images d'horizon à fondre, selon l'heure.
//
// Les moments fournis sont matin, midi et soir. La nuit n'a pas d'image
// propre : on reprend celle du soir en l'assombrissant, ce qui est cohérent —
// un paysage nocturne, c'est un paysage de fin de jour privé de lumière.
// Bleu de nuit servant de plancher au lointain de l'horizon.
const NUIT_HORIZON = new THREE.Color(0x2c3a5c);

const HORIZON_ETAPES = [
  { at: 0.0, moment: 'soir' },
  { at: 0.24, moment: 'matin' },
  { at: 0.4, moment: 'midi' },
  { at: 0.62, moment: 'midi' },
  { at: 0.82, moment: 'soir' },
  { at: 1.0, moment: 'soir' }
];

function horizonPair(t) {
  for (let i = 0; i < HORIZON_ETAPES.length - 1; i += 1) {
    const a = HORIZON_ETAPES[i];
    const b = HORIZON_ETAPES[i + 1];
    if (t >= a.at && t <= b.at) {
      const span = Math.max(b.at - a.at, 1e-6);
      return { a: a.moment, b: b.moment, k: smooth((t - a.at) / span) };
    }
  }
  return { a: 'soir', b: 'soir', k: 0 };
}

export function createDaylight(world) {
  const palette = makePalette();
  const tinted = new THREE.Color();
  let mode = loadCycleMode();
  let fastClock = 0.4; // le mode accelere demarre en fin de matinee
  let biome = null;
  let current = 0.5;

  function targetTime() {
    if (mode === 'day') return 0.5;
    if (mode === 'night') return 0.0;
    if (mode === 'fast') return fastClock % 1;
    const now = new Date();
    return (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
  }

  function setBiome(next) {
    biome = next;
  }

  function setMode(next) {
    mode = next;
    saveCycleMode(next);
    if (next === 'fast') fastClock = current;
  }

  function update(dt) {
    if (mode === 'fast') fastClock += dt / 1440; // un tour complet en 24 minutes

    // On rejoint la cible en douceur : un changement de mode ne doit pas
    // provoquer un flash, il doit se voir comme un lever de soleil accelere.
    const wanted = targetTime();
    let diff = wanted - current;
    if (diff > 0.5) diff -= 1;
    if (diff < -0.5) diff += 1;
    current = (current + diff * Math.min(dt * 1.5, 1) + 1) % 1;

    sample(current, palette);

    const env = world.env;
    const mood = biome && biome.mood !== undefined ? biome.mood : null;
    const moodMix = biome && biome.moodMix !== undefined ? biome.moodMix : 0.22;

    // Le decor teinte le ciel et le brouillard sans jamais dicter l'heure.
    tinted.copy(palette.skyTop);
    if (mood !== null) tinted.lerp(palette.scratch.setHex(mood), moodMix);
    env.skyMat.uniforms.top.value.copy(tinted);

    tinted.copy(palette.skyBottom);
    if (mood !== null) tinted.lerp(palette.scratch.setHex(mood), moodMix * 0.5);
    env.skyMat.uniforms.bottom.value.copy(tinted);

    tinted.copy(palette.fog);
    if (mood !== null) tinted.lerp(palette.scratch.setHex(mood), moodMix);
    env.fog.color.copy(tinted);
    env.fog.near = palette.fogNear;
    env.fog.far = palette.fogFar;

    // Le ciel reçoit la position et la couleur du soleil : c'est ce qui donne
    // le halo, plus fort à l'aube et au couchant quand il rase l'horizon.
    const rasant = 1 - Math.min(1, Math.abs(Math.sin((current - 0.25) * Math.PI * 2)) * 1.6);
    env.skyMat.uniforms.sunColor.value.copy(palette.sun);
    env.skyMat.uniforms.sunPower.value = 0.5 + rasant * 0.9;

    // Nuages : blancs en plein jour, teintés par le soleil quand il rase, à
    // peine visibles la nuit. Ils dérivent avec l'horloge du jeu.
    // En SECONDES, pas en images : incrémenter d'une unité par image donnait
    // 43 unités de dérive par minute, soit des nuages qui filent comme en
    // accéléré. Ici, une masse traverse le ciel en une minute environ.
    env.skyMat.uniforms.nuageTemps.value += dt;
    env.skyMat.uniforms.nuageCouleur.value
      .copy(palette.skyBottom)
      .lerp(palette.sun, 0.45)
      .lerp(NUIT_HORIZON, palette.stars * 0.7);
    env.skyMat.uniforms.nuageForce.value = 0.42 - palette.stars * 0.24;

    env.hemi.color.copy(palette.hemiSky);
    env.hemi.groundColor.copy(palette.hemiGround);
    env.hemi.intensity = palette.hemi;

    env.key.color.copy(palette.key);
    env.key.intensity = palette.keyIntensity;

    // Course du soleil : il se leve a l'est, culmine a midi, se couche a l'ouest.
    const angle = (current - 0.25) * Math.PI * 2;
    const elevation = Math.sin(angle);
    const azimuth = Math.cos(angle);
    env.key.position.set(azimuth * 8, Math.max(0.6, elevation * 9), 4 + elevation * 2);
    env.skyMat.uniforms.sunDir.value.copy(env.key.position).normalize();

    // La lampe d'appoint compense la nuit : c'est elle qui fait luire la
    // creature quand le soleil est couche.
    env.rim.intensity = 4 + palette.rim * 6;
    if (biome) env.rim.color.setHex(biome.accent);

    // Horizon : on fond les deux images du moment, puis on assombrit selon la
    // nuit. Le même facteur qui allume les étoiles éteint le paysage.
    const horizonMat = env.horizonMat;
    if (horizonMat && horizonMat.userData.textures) {
      const paire = horizonPair(current);
      const jeu = horizonMat.userData.textures;
      horizonMat.uniforms.mapA.value = jeu[paire.a] || jeu.midi;
      horizonMat.uniforms.mapB.value = jeu[paire.b] || jeu.midi;
      horizonMat.uniforms.melange.value = paire.k;

      // De 1 en plein jour à 0,55 en pleine nuit. Descendre plus bas écrasait
      // le relief : l'image du soir est déjà sombre, la multiplier par 0,3 n'en
      // laissait qu'une masse grise.
      const nuit = palette.stars;
      const luminosite = 1 - nuit * 0.45;
      horizonMat.uniforms.teinte.value.setRGB(
        luminosite * (1 - nuit * 0.1),
        luminosite * (1 - nuit * 0.05),
        luminosite * (1 + nuit * 0.12)
      );
      horizonMat.uniforms.presence.value = 1;
      horizonMat.uniforms.brume.value.copy(env.fog.color);

      // Les deux bornes de la perspective atmosphérique.
      //
      // Le premier plan tire vers la couleur du sol assombrie : c'est une
      // silhouette, elle reçoit peu de lumière. Le lointain tire vers le ciel
      // au ras de l'horizon, de sorte que les crêtes les plus éloignées s'y
      // dissolvent. Au couchant, on obtient donc des plans violets devant un
      // fond orangé — sans redessiner une seule image.
      // Premier plan nettement plus sombre que le ciel, lointain nettement
      // plus sombre que lui aussi. Une silhouette dont la teinte lointaine
      // égale celle du ciel disparaît dedans : c'est physiquement juste, mais
      // il ne reste alors rien à voir.
      horizonMat.uniforms.proche.value
        .copy(palette.fog)
        .lerp(palette.skyBottom, 0.15)
        .multiplyScalar(0.32);

      horizonMat.uniforms.loin.value
        .copy(palette.skyBottom)
        .lerp(palette.sun, 0.15 * (1 - palette.stars))
        .multiplyScalar(0.82)
        // La nuit, le ciel et le sol tombent tous deux au noir : sans ce
        // relèvement, la ligne de crête s'effacerait complètement. Un bleu très
        // sourd suffit à la faire lire sous les étoiles.
        .lerp(NUIT_HORIZON, palette.stars * 0.6);
    }

    env.starMat.uniforms.presence.value = palette.stars;
    env.starMat.uniforms.temps.value += dt;
    if (env.majFilante) env.majFilante(dt, palette.stars);
    if (env.moteMaterial) env.moteMaterial.opacity = 0.24 + palette.stars * 0.38;
    env.stars.visible = palette.stars > 0.02;
    env.starMat.uniforms.echelle.value = 1 + palette.stars * 0.35;

    // L'astre visible : soleil le jour, lune la nuit, au meme endroit du ciel.
    env.sun.position.copy(env.key.position).multiplyScalar(2.2);
    env.sun.material.color.copy(palette.sun);
    env.sun.scale.setScalar(palette.sunSize);
    env.sun.material.opacity = elevation > -0.35 || palette.stars > 0.5 ? 0.9 : 0;

    // L'anneau du sol s'efface en plein jour, il n'aurait aucun sens.
    env.ringMat.color.setHex(biome ? biome.accent : 0x6fe3c4);
    env.ringMat.opacity = 0.08 + palette.stars * 0.26;
  }

  return {
    update,
    setBiome,
    setMode,
    get mode() {
      return mode;
    },
    get phase() {
      return palette.name;
    },
    get nightFactor() {
      return palette.stars;
    },
    get hourOfDay() {
      return Math.floor(current * 24) % 24;
    }
  };
}
