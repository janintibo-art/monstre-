import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { lerp, clamp, createRng } from '../core/rng.js';
import { STAGE_SCALE } from './monster.js';

// Chargement des modeles Blender. Si un .glb est absent ou illisible, on
// renvoie null et le jeu retombe sur la creature generee par code.

const loader = new GLTFLoader();

export function loadModel(url) {
  return new Promise((resolve) => {
    loader.load(
      url,
      (gltf) => resolve(gltf),
      undefined,
      () => resolve(null)
    );
  });
}

export async function loadModels(base = import.meta.env.BASE_URL || './') {
  const [monster, egg] = await Promise.all([
    loadModel(`${base}assets/models/Monstre.glb`),
    loadModel(`${base}assets/models/Oeuf.glb`)
  ]);
  return { monster, egg };
}

// Recentre le modele et le met a l'echelle voulue : les exports Blender
// arrivent avec des tailles et des origines tres variables.
function fitToHeight(object, height) {
  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const scale = height / (size.y || 1);
  object.scale.setScalar(scale);
  object.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  return { height, radius: (Math.max(size.x, size.z) / 2) * scale };
}

function prepare(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = false;
    // Les maillages skinnes disparaissent parfois au bord de l'ecran
    // si on laisse le culling automatique faire son travail.
    child.frustumCulled = false;
    if (child.material) child.material.side = THREE.FrontSide;
  });
}

/* -------------------------------------------------------------------------
   Monstre issu d'un .glb
   Meme interface publique que createMonster() : group, setStage, react,
   update, headWorldPosition, dispose. main.js n'a pas a savoir lequel tourne.
   ------------------------------------------------------------------------- */

export function createModelMonster(gltf, genome) {
  const rng = createRng((genome && genome.seed) || 1);
  const jitterPhase = rng() * Math.PI * 2;
  const root = new THREE.Group();
  const holder = new THREE.Group();
  root.add(holder);

  // On clone : le meme .glb doit pouvoir etre reinstancie apres un reset,
  // et cloneSkinned preserve le squelette (un clone() simple le casserait).
  const model = cloneSkinned(gltf.scene);
  prepare(model);
  const bounds = fitToHeight(model, 1.5);
  holder.add(model);

  // Si le modele contient des animations Blender, on les utilise.
  // Sinon tout est anime au niveau de l'objet entier.
  const mixer = gltf.animations && gltf.animations.length ? new THREE.AnimationMixer(model) : null;
  const clips = {};
  (gltf.animations || []).forEach((clip) => {
    clips[clip.name.toLowerCase()] = clip;
  });
  let currentClip = null;

  const CLIP_FOR = {
    idle: ['idle', 'repos', 'attente'],
    follow: ['walk', 'marche', 'run'],
    explore: ['walk', 'marche'],
    play: ['play', 'jump', 'saut'],
    dance: ['dance', 'danse'],
    sleep: ['sleep', 'sommeil', 'dormir'],
    sulk: ['sad', 'triste', 'idle'],
    beg: ['idle'],
    seekAttention: ['idle']
  };

  function playFor(action) {
    if (!mixer) return;
    const names = CLIP_FOR[action] || ['idle'];
    const found = names.map((n) => clips[n]).find(Boolean);
    if (!found || found === currentClip) return;
    const next = mixer.clipAction(found);
    next.reset().fadeIn(0.3).play();
    if (currentClip) mixer.clipAction(currentClip).fadeOut(0.3);
    currentClip = found;
  }

  let scaleTarget = STAGE_SCALE.baby;
  let currentScale = STAGE_SCALE.baby * 0.25;
  let facing = 0;
  let hop = 0;
  let reaction = null;
  let reactionTime = 0;
  const head = new THREE.Vector3();

  function setStage(stage) {
    scaleTarget = STAGE_SCALE[stage] ?? STAGE_SCALE.baby;
  }

  function react(type, duration = 1.4) {
    reaction = type;
    reactionTime = duration;
  }

  function update(dt, time, ctx = {}) {
    const { action = 'idle', emotion = 'calme', target = null, lookAt = null } = ctx;
    const asleep = action === 'sleep';

    currentScale = lerp(currentScale, scaleTarget, Math.min(dt * 1.2, 1));
    root.scale.setScalar(currentScale);

    // Deplacement au sol
    let moving = false;
    if (target && !asleep) {
      const dx = target.x - root.position.x;
      const dz = target.z - root.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.2) {
        moving = true;
        const speed = action === 'play' || action === 'dance' ? 2 : 1.1;
        root.position.x += (dx / dist) * speed * dt;
        root.position.z += (dz / dist) * speed * dt;
        const wanted = Math.atan2(dx, dz);
        const diff = ((wanted - facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        facing += diff * Math.min(dt * 5, 1);
      }
    }

    if (action === 'sulk') {
      const diff = ((Math.PI - facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      facing += diff * Math.min(dt * 2, 1);
    } else if (!moving && lookAt && !asleep) {
      // Au repos il pivote lentement vers ce qu'il regarde.
      const wanted = Math.atan2(lookAt.x - root.position.x, lookAt.z - root.position.z);
      const diff = ((wanted - facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      facing += clamp(diff, -1.2, 1.2) * Math.min(dt * 1.5, 1);
    }
    root.rotation.y = facing;

    if (mixer) {
      playFor(action);
      mixer.update(dt);
    }

    // Animation d'objet : respiration, sautillement, inclinaison.
    // Elle s'ajoute aux clips Blender sans les contrarier.
    const breath = Math.sin(time * (asleep ? 1.1 : 2.2));
    const excited = emotion === 'joyeux' || emotion === 'excite';
    holder.scale.y = 1 + breath * (asleep ? 0.05 : 0.028);
    holder.scale.x = 1 - breath * 0.015;
    holder.scale.z = holder.scale.x;

    hop = moving && !mixer ? Math.abs(Math.sin(time * 8)) : lerp(hop, 0, Math.min(dt * 5, 1));
    const bounce = action === 'dance' ? Math.abs(Math.sin(time * 6)) * 0.2 : 0;
    root.position.y = hop * 0.1 + bounce;

    holder.rotation.x = asleep ? 0.35 : moving && !mixer ? 0.1 : Math.sin(time * 0.7) * 0.03;
    holder.rotation.z = excited ? Math.sin(time * 7) * 0.05 : Math.sin(time * 0.9) * 0.02;

    if (asleep) root.position.y -= 0.04;

    // Reactions ponctuelles
    if (reaction) {
      reactionTime -= dt;
      if (reaction === 'eat') holder.rotation.x += Math.sin(time * 20) * 0.12;
      if (reaction === 'wash') root.rotation.y += Math.sin(time * 24) * 0.12;
      if (reaction === 'play') root.position.y += Math.abs(Math.sin(time * 10)) * 0.16;
      if (reaction === 'pet') holder.rotation.z += Math.sin(time * 16) * 0.06;
      if (reactionTime <= 0) reaction = null;
    }

    // Petit scintillement pour eviter la fixite parfaite
    holder.position.x = Math.sin(time * 0.6 + jitterPhase) * 0.004;
  }

  function headWorldPosition(out = new THREE.Vector3()) {
    root.getWorldPosition(out);
    out.y += bounds.height * currentScale + 0.25 * currentScale;
    return out;
  }

  function dispose() {
    // Geometries et materiaux viennent du .glb et sont partages entre
    // instances : on detache seulement, sans les detruire.
    if (mixer) mixer.stopAllAction();
    holder.remove(model);
  }

  return { group: root, setStage, react, update, headWorldPosition, dispose, bounds };
}

/* -------------------------------------------------------------------------
   Oeuf issu d'un .glb
   Pas de fissures dessinees ici : le modele a sa propre texture. La montee
   en tension passe par les secousses, de plus en plus nerveuses.
   ------------------------------------------------------------------------- */

export function createModelEgg(gltf, seed) {
  const group = new THREE.Group();
  const holder = new THREE.Group();
  group.add(holder);

  const model = cloneSkinned(gltf.scene);
  prepare(model);
  const bounds = fitToHeight(model, 1.25);
  holder.add(model);

  const nest = new THREE.Mesh(
    new THREE.TorusGeometry(Math.max(0.42, bounds.radius * 0.9), 0.16, 12, 32),
    new THREE.MeshStandardMaterial({ color: 0x35506a, roughness: 1 })
  );
  nest.rotation.x = Math.PI / 2;
  nest.position.y = 0.14;
  nest.receiveShadow = true;
  nest.castShadow = true;
  group.add(nest);

  let progress = 0;
  let shake = 0;
  let hatched = false;
  const debris = [];

  function setProgress(value) {
    progress = clamp(value, 0, 1);
  }

  function poke() {
    shake = 1;
  }

  function burst() {
    if (hatched) return;
    hatched = true;
    holder.visible = false;
    const rng = createRng(seed + 7);
    const material = new THREE.MeshStandardMaterial({ color: 0xe8d9bd, roughness: 0.6 });
    for (let i = 0; i < 14; i += 1) {
      const piece = new THREE.Mesh(new THREE.TetrahedronGeometry(0.06 + rng() * 0.07), material);
      piece.position.set(0, 0.8, 0);
      piece.castShadow = true;
      piece.userData.velocity = new THREE.Vector3(
        (rng() - 0.5) * 2.6,
        1.4 + rng() * 2.2,
        (rng() - 0.5) * 2.6
      );
      piece.userData.spin = new THREE.Vector3(rng() * 6, rng() * 6, rng() * 6);
      group.add(piece);
      debris.push(piece);
    }
  }

  function update(dt, time) {
    if (!hatched) {
      shake = Math.max(0, shake - dt * 2.2);
      const tension = progress + shake;
      holder.rotation.z = Math.sin(time * 1.4) * 0.02 + Math.sin(time * 15) * 0.09 * tension;
      holder.rotation.x = Math.sin(time * 12.5) * 0.05 * tension;
      holder.position.y = Math.abs(Math.sin(time * 7)) * 0.05 * tension;
      holder.scale.setScalar(1 + Math.sin(time * 3) * 0.012);
    }

    for (let i = debris.length - 1; i >= 0; i -= 1) {
      const piece = debris[i];
      const v = piece.userData.velocity;
      v.y -= 9.8 * dt;
      piece.position.addScaledVector(v, dt);
      piece.rotation.x += piece.userData.spin.x * dt;
      piece.rotation.y += piece.userData.spin.y * dt;
      if (piece.position.y < 0.05) {
        piece.position.y = 0.05;
        v.multiplyScalar(0);
      }
    }
  }

  function dispose() {
    holder.remove(model);
    nest.geometry.dispose();
    nest.material.dispose();
    debris.forEach((piece) => piece.geometry.dispose());
    if (debris.length) debris[0].material.dispose();
  }

  return { group, setProgress, poke, burst, update, dispose, bounds };
}
