import * as THREE from 'three';
import { lerp, clamp } from '../core/rng.js';

// Animation procedurale du squelette.
//
// Les modeles exportes n'ont que Walking et Running. Tout le reste — respiration,
// regard, sommeil, bouderie, danse, mendicite — est calcule ici, os par os.
// Cette couche s'applique APRES le mixer : quand un clip tourne, elle ajoute ses
// rotations par-dessus ; quand aucun clip ne tourne, elle repart de la pose de
// repos. Un modele sans os reconnu la traverse sans rien faire.
//
// Les trois creatures partagent un squelette de type Mixamo. Les noms cherches
// sont en minuscules et sans espaces, ce qui absorbe la plupart des variantes.

const BONE_NAMES = {
  hips: ['hips', 'bassin', 'pelvis'],
  spine: ['spine', 'spine1'],
  spine01: ['spine01', 'spine_01', 'spine2'],
  spine02: ['spine02', 'spine_02', 'chest', 'spine3'],
  neck: ['neck', 'cou'],
  head: ['head', 'tete'],
  shoulderL: ['leftshoulder'],
  armL: ['leftarm'],
  foreArmL: ['leftforearm'],
  handL: ['lefthand'],
  shoulderR: ['rightshoulder'],
  armR: ['rightarm'],
  foreArmR: ['rightforearm'],
  handR: ['righthand'],
  upLegL: ['leftupleg'],
  legL: ['leftleg'],
  footL: ['leftfoot'],
  upLegR: ['rightupleg'],
  legR: ['rightleg'],
  footR: ['rightfoot']
};

const KEYS = Object.keys(BONE_NAMES);

function normalize(name) {
  return String(name || '').toLowerCase().replace(/[\s._-]/g, '');
}

export function createRig(model) {
  const found = {};
  const rest = new Map();

  const index = new Map();
  model.traverse((node) => {
    if (node.isBone || node.type === 'Bone') index.set(normalize(node.name), node);
  });

  KEYS.forEach((key) => {
    const bone = BONE_NAMES[key].map((n) => index.get(n)).find(Boolean);
    if (!bone) return;
    found[key] = bone;
    rest.set(key, bone.quaternion.clone());
  });

  const available = Object.keys(found).length;
  if (available < 4) return null; // squelette non reconnu : on n'y touche pas

  // Cible et valeur courante de chaque os, en angles d'Euler locaux.
  const target = {};
  const current = {};
  KEYS.forEach((key) => {
    target[key] = { x: 0, y: 0, z: 0 };
    current[key] = { x: 0, y: 0, z: 0 };
  });

  const euler = new THREE.Euler();
  const delta = new THREE.Quaternion();

  // Pose de reference de chaque os pour l'image courante. Quand un clip tourne,
  // c'est la sortie du mixer ; quand il s'arrete, elle glisse doucement vers la
  // pose de repos. Sans ce tampon, la fin d'un clip provoquerait un a-coup.
  const base = new Map();
  KEYS.forEach((key) => {
    if (rest.has(key)) base.set(key, rest.get(key).clone());
  });

  function clear() {
    KEYS.forEach((key) => {
      const t = target[key];
      t.x = 0;
      t.y = 0;
      t.z = 0;
    });
  }

  function add(key, x, y, z) {
    const t = target[key];
    if (!t) return;
    t.x += x;
    t.y += y;
    t.z += z;
  }

  // Bras symetriques : le cote droit recoit les angles miroir.
  function arms(pitch, spread, bend) {
    add('armL', pitch, 0, spread);
    add('armR', pitch, 0, -spread);
    add('foreArmL', bend, 0, 0);
    add('foreArmR', bend, 0, 0);
  }

  /* ----------------------------------------------------------------- poses */

  function poseIdle(t) {
    // Respiration : la cage thoracique s'ouvre, la tete suit avec un retard.
    const breath = Math.sin(t * 1.8);
    add('spine01', -breath * 0.035, 0, 0);
    add('spine02', -breath * 0.03, 0, 0);
    add('head', breath * 0.025, 0, 0);
    // Report de poids d'une jambe sur l'autre, tres lent.
    const sway = Math.sin(t * 0.45);
    add('hips', 0, sway * 0.06, sway * 0.04);
    add('spine', 0, -sway * 0.03, -sway * 0.03);
    arms(Math.sin(t * 0.7) * 0.05, 0.08 + breath * 0.02, -0.15);
  }

  function poseSleep(t) {
    const breath = Math.sin(t * 0.9);
    add('head', 0.55 + breath * 0.04, 0, 0.12);
    add('neck', 0.25, 0, 0);
    add('spine02', 0.28 + breath * 0.05, 0, 0);
    add('spine01', 0.2, 0, 0);
    add('spine', 0.14, 0, 0);
    add('hips', 0.1, 0, 0);
    arms(0.15, -0.25, -0.5);
    add('upLegL', 0.5, 0, 0.12);
    add('upLegR', 0.5, 0, -0.12);
    add('legL', -0.8, 0, 0);
    add('legR', -0.8, 0, 0);
  }

  function poseSulk(t) {
    // Epaules rentrees, menton bas, micro-mouvements agaces.
    add('head', 0.32 + Math.sin(t * 0.6) * 0.03, 0, 0);
    add('neck', 0.16, 0, 0);
    add('spine02', 0.16, 0, 0);
    add('shoulderL', 0, 0, 0.18);
    add('shoulderR', 0, 0, -0.18);
    arms(0.1, -0.18, -0.35);
  }

  function poseBeg(t) {
    // Tend les bras vers l'avant et leve le menton.
    const pulse = Math.sin(t * 4.5);
    add('head', -0.22, 0, 0);
    add('neck', -0.12, 0, 0);
    add('spine02', -0.1, 0, 0);
    arms(-1.15 + pulse * 0.12, 0.15, -0.85 - pulse * 0.15);
    add('hips', 0, 0, Math.sin(t * 2.2) * 0.04);
  }

  function poseDance(t) {
    const beat = Math.sin(t * 5.2);
    const half = Math.sin(t * 2.6);
    add('hips', 0, half * 0.3, beat * 0.18);
    add('spine', 0, -half * 0.15, -beat * 0.12);
    add('spine02', 0, half * 0.2, 0);
    add('head', -0.1 + beat * 0.15, half * 0.35, 0);
    add('armL', -2.1 + beat * 0.4, 0, 0.5);
    add('armR', -2.1 - beat * 0.4, 0, -0.5);
    add('foreArmL', -0.9, 0, 0);
    add('foreArmR', -0.9, 0, 0);
    add('upLegL', beat * 0.12, 0, 0);
    add('upLegR', -beat * 0.12, 0, 0);
  }

  function poseExcited(t) {
    const wiggle = Math.sin(t * 8);
    add('hips', 0, wiggle * 0.16, 0);
    add('spine02', 0, -wiggle * 0.1, 0);
    add('head', -0.12, wiggle * 0.18, 0);
    arms(-0.55, 0.3 + wiggle * 0.1, -0.7);
  }

  function poseLook(yaw, pitch) {
    // Le regard se repartit entre la nuque et la tete : plus naturel qu'un
    // simple pivot du crane, et ca evite le torticolis aux grands angles.
    add('head', pitch * 0.62, yaw * 0.62, 0);
    add('neck', pitch * 0.28, yaw * 0.28, 0);
    add('spine02', 0, yaw * 0.14, 0);
  }

  function poseEat(t) {
    const chew = Math.sin(t * 16);
    add('head', 0.3 + chew * 0.12, 0, 0);
    add('neck', 0.14, 0, 0);
    arms(-1.5, 0.1, -1.5 + chew * 0.15);
  }

  function posePet(t) {
    // Se penche vers la main et ferme les epaules de plaisir.
    add('head', -0.15, Math.sin(t * 2.5) * 0.2, 0.28);
    add('neck', -0.08, 0, 0.14);
    add('spine02', 0, 0, 0.1);
    arms(0.2, -0.1, -0.3);
  }

  function poseWash(t) {
    const shake = Math.sin(t * 22);
    add('hips', 0, shake * 0.12, 0);
    add('spine01', 0, -shake * 0.1, 0);
    add('head', 0, shake * 0.22, 0);
  }

  function poseGesture(t, amount) {
    // Salut de la main, module par `amount` pour entrer et sortir en douceur.
    add('armR', -1.6 * amount, 0, -0.6 * amount);
    add('foreArmR', -0.7 * amount, 0, Math.sin(t * 9) * 0.5 * amount);
    add('handR', 0, 0, Math.sin(t * 9) * 0.3 * amount);
    add('head', -0.1 * amount, 0, 0);
  }

  /* ----------------------------------------------------------------- rendu */

  function apply(dt, time, state = {}) {
    const {
      action = 'idle',
      emotion = 'calme',
      moving = false,
      clipActive = false,
      lookYaw = 0,
      lookPitch = 0,
      reaction = null,
      gesture = 0
    } = state;

    clear();

    // Pendant un clip exporte, on n'ajoute qu'une couche legere pour ne pas le
    // deformer. Sans clip, la pose procedurale porte toute l'animation.
    const weight = clipActive ? 0.35 : 1;

    if (action === 'sleep') poseSleep(time);
    else if (action === 'sulk') poseSulk(time);
    else if (action === 'dance') poseDance(time);
    else if (action === 'beg' || action === 'seekAttention') poseBeg(time);
    else if (emotion === 'excite' && !moving) poseExcited(time);
    else poseIdle(time);

    if (action !== 'sleep') poseLook(lookYaw, lookPitch);

    if (reaction === 'eat') poseEat(time);
    if (reaction === 'pet') posePet(time);
    if (reaction === 'wash') poseWash(time);
    if (gesture > 0.01) poseGesture(time, gesture);

    // Lissage : on rejoint la pose cible au lieu d'y sauter, sinon chaque
    // changement de comportement provoquerait un a-coup.
    const speed = Math.min(dt * 7, 1);

    KEYS.forEach((key) => {
      const bone = found[key];
      if (!bone) return;
      const c = current[key];
      const t = target[key];
      c.x = lerp(c.x, t.x * weight, speed);
      c.y = lerp(c.y, t.y * weight, speed);
      c.z = lerp(c.z, t.z * weight, speed);

      euler.set(clamp(c.x, -1.6, 1.6), clamp(c.y, -1.6, 1.6), clamp(c.z, -1.6, 1.6));
      delta.setFromEuler(euler);

      const reference = base.get(key);
      if (clipActive) reference.copy(bone.quaternion); // sortie du mixer
      else reference.slerp(rest.get(key), Math.min(dt * 4, 1));

      bone.quaternion.copy(reference).multiply(delta);
    });
  }

  function reset() {
    KEYS.forEach((key) => {
      const bone = found[key];
      if (bone) bone.quaternion.copy(rest.get(key));
      if (base.has(key)) base.get(key).copy(rest.get(key));
      current[key].x = 0;
      current[key].y = 0;
      current[key].z = 0;
    });
  }

  return { apply, reset, bones: found, available };
}
