import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { lerp, clamp, createRng } from '../core/rng.js';
import { STAGE_SCALE } from './monster.js';
import { createRig } from './rig.js';

// Chargement des modeles Blender. Si un .glb est absent ou illisible, on
// renvoie null et le jeu retombe sur la creature generee par code.

const loader = new GLTFLoader();
const cache = new Map();

// Chargement paresseux et mis en cache : on ne telecharge le modele d'un stade
// que le jour ou la creature l'atteint. Un echec renvoie null, et le jeu
// retombe sur la creature generee par code.
export function loadModel(url) {
  if (!url) return Promise.resolve(null);
  if (cache.has(url)) return cache.get(url);
  const promise = new Promise((resolve) => {
    loader.load(
      url,
      (gltf) => resolve(gltf),
      undefined,
      () => resolve(null)
    );
  });
  cache.set(url, promise);
  return promise;
}

// Mesure la boite englobante REELLE, apres skinning.
//
// Box3.setFromObject() applique la matrice du noeud a la geometrie brute. Pour
// un maillage skinne c'est faux : la pose est pilotee par les os, pas par le
// noeud. Sur un rig Meshy (armature a l'echelle 0,01, os en centimetres) la
// mesure se trompait d'un facteur 100 — d'ou le monstre geant.
function measureWorld(object) {
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  object.updateWorldMatrix(true, true);
  object.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    if (child.isSkinnedMesh && typeof child.computeBoundingBox === 'function') {
      child.computeBoundingBox(); // tient compte de la pose courante
      tmp.copy(child.boundingBox);
    } else {
      if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
      tmp.copy(child.geometry.boundingBox);
    }
    tmp.applyMatrix4(child.matrixWorld);
    box.union(tmp);
  });
  return box;
}

// Met le modele a la bonne taille en corrigeant par iterations : on mesure, on
// ajuste, on remesure. Trois passes suffisent quel que soit l'exportateur, et
// ca reste juste meme si la mesure initiale est imparfaite.
function fitToHeight(holder, model, height) {
  holder.scale.setScalar(1);
  holder.position.set(0, 0, 0);

  let box = measureWorld(model);
  const size = new THREE.Vector3();

  for (let pass = 0; pass < 3; pass += 1) {
    box.getSize(size);
    if (!(size.y > 1e-9) || !Number.isFinite(size.y)) break;
    const factor = height / size.y;
    if (Math.abs(factor - 1) < 0.005) break;
    holder.scale.multiplyScalar(factor);
    box = measureWorld(model);
  }

  const center = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  // Pieds au sol, centre sur l'axe vertical.
  holder.position.set(-center.x, -box.min.y, -center.z);

  return { height: size.y || height, radius: Math.max(size.x, size.z) / 2 };
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
  // Deux groupes distincts : `holder` porte la mise a l'echelle calculee une
  // fois pour toutes, `anim` porte la respiration et les inclinaisons. Les
  // melanger ferait ecraser l'echelle a chaque image.
  const anim = new THREE.Group();
  const holder = new THREE.Group();
  root.add(anim);
  anim.add(holder);

  // On clone : le meme .glb doit pouvoir etre reinstancie apres un reset,
  // et cloneSkinned preserve le squelette (un clone() simple le casserait).
  const model = cloneSkinned(gltf.scene);
  prepare(model);
  holder.add(model);
  const bounds = fitToHeight(holder, model, 1.5);

  // Couche d'animation os par os : elle fournit tout ce que les clips exportes
  // n'ont pas (repos, sommeil, bouderie, danse, regard, gestes).
  const rig = createRig(model);

  // Si le modele contient des animations Blender, on les utilise.
  // Sinon tout est anime au niveau de l'objet entier.
  const mixer = gltf.animations && gltf.animations.length ? new THREE.AnimationMixer(model) : null;
  const clips = {};
  (gltf.animations || []).forEach((clip) => {
    clips[clip.name.toLowerCase()] = clip;
  });
  let currentClip = null;

  // Correspondance action -> clip, par mots-cles cherches DANS le nom du clip.
  // Un exportateur nomme rarement ses clips "idle" : "Walking", "Running" ou
  // "Armature|clip0" sont plus courants. La recherche par fragment evite d'avoir
  // a renommer quoi que ce soit dans Blender.
  const CLIP_FOR = {
    idle: ['idle', 'repos', 'attente', 'arise'],
    beg: ['agree', 'gesture', 'idle', 'arise'],
    seekAttention: ['agree', 'gesture', 'idle', 'arise'],
    follow: ['walk', 'marche'],
    explore: ['walk', 'marche'],
    play: ['run', 'jump', 'saut', 'play'],
    dance: ['danc', 'run', 'jump'],
    sleep: ['sleep', 'sommeil', 'dormir'],
    sulk: ['sad', 'triste', 'idle', 'arise']
  };

  // Clips qui n'ont de sens qu'une fois : on les fige sur leur derniere image
  // au lieu de les boucler. "Arise" sert ainsi de pose debout au repos.
  const ONE_SHOT = ['arise', 'agree', 'gesture', 'wave'];

  const clipNames = Object.keys(clips);

  function findClip(keywords) {
    for (const keyword of keywords) {
      const name = clipNames.find((n) => n.includes(keyword));
      if (name) return clips[name];
    }
    return null;
  }

  function configure(action, clip) {
    const once = ONE_SHOT.some((k) => clip.name.toLowerCase().includes(k));
    action.clampWhenFinished = once;
    action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    return action;
  }

  function playFor(behaviour) {
    if (!mixer) return;
    const found = findClip(CLIP_FOR[behaviour] || CLIP_FOR.idle);
    if (found === currentClip) return;
    if (currentClip) mixer.clipAction(currentClip).fadeOut(0.35);
    currentClip = found;
    if (!found) return; // aucun clip : l'animation procedurale prend le relais
    configure(mixer.clipAction(found), found).reset().fadeIn(0.35).play();
  }

  // Geste ponctuel joue par-dessus, pour les caresses et les repas.
  function playGesture(keywords) {
    gestureTime = 1.2; // pilote aussi le geste procedural
    if (!mixer) return;
    const found = findClip(keywords);
    if (!found) return;
    const action = mixer.clipAction(found);
    action.clampWhenFinished = false;
    action.setLoop(THREE.LoopOnce, 1);
    action.reset().fadeIn(0.2).play();
    currentClip = null; // force une re-selection au prochain comportement
  }

  let scaleTarget = STAGE_SCALE.baby;
  let currentScale = STAGE_SCALE.baby * 0.25;
  let facing = 0;
  let hop = 0;
  let reaction = null;
  let reactionTime = 0;
  let gestureTime = 0;
  let speed = 0;
  const head = new THREE.Vector3();

  function setStage(stage) {
    scaleTarget = STAGE_SCALE[stage] ?? STAGE_SCALE.baby;
  }

  function react(type, duration = 1.4) {
    reaction = type;
    reactionTime = duration;
    if (type === 'pet' || type === 'eat') playGesture(['agree', 'gesture', 'wave']);
  }

  // Joue le clip de reveil au sortir de l'oeuf, si le modele en a un.
  function playBirth() {
    playGesture(['arise', 'stand', 'wake']);
  }

  function update(dt, time, ctx = {}) {
    const {
      action = 'idle',
      emotion = 'calme',
      target = null,
      lookAt = null,
      speaking = 0
    } = ctx;
    const asleep = action === 'sleep';

    currentScale = lerp(currentScale, scaleTarget, Math.min(dt * 1.2, 1));
    root.scale.setScalar(currentScale);

    // Deplacement au sol. La vitesse monte et retombe progressivement, et la
    // creature pivote avant d'avancer : un demi-tour instantane se voit tout de
    // suite comme une glissade.
    let moving = false;
    let heading = 0;
    if (target && !asleep && action !== 'dance') {
      const dx = target.x - root.position.x;
      const dz = target.z - root.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.22) {
        const wanted = Math.atan2(dx, dz);
        const diff = ((wanted - facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        facing += diff * Math.min(dt * 4.5, 1);
        heading = diff;

        // Tant qu'il n'est pas oriente, il tourne sur place.
        const aligned = Math.max(0, 1 - Math.abs(diff) / 1.2);
        const top = action === 'play' ? 2.1 : action === 'explore' ? 0.9 : 1.25;
        const wish = top * aligned * Math.min(1, dist / 0.6);
        speed = lerp(speed, wish, Math.min(dt * 3.5, 1));
        if (speed > 0.05) {
          moving = true;
          root.position.x += Math.sin(facing) * speed * dt;
          root.position.z += Math.cos(facing) * speed * dt;
        }
      } else {
        speed = lerp(speed, 0, Math.min(dt * 6, 1));
      }
    } else {
      speed = lerp(speed, 0, Math.min(dt * 6, 1));
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
      playFor(moving ? (speed > 1.6 ? 'play' : 'follow') : action);
      // Le clip suit la vitesse reelle : plus de patinage quand il ralentit.
      if (currentClip) {
        const clipAction = mixer.clipAction(currentClip);
        clipAction.timeScale = moving ? clamp(0.6 + speed * 0.7, 0.6, 2.2) : 1;
      }
      mixer.update(dt);
    }

    // Inclinaison dans les virages, comme un coureur qui prend l'appui.
    const bank = clamp(heading * Math.min(speed, 1.6) * 0.35, -0.3, 0.3);

    // Animation d'objet : respiration, sautillement, inclinaison.
    // Elle s'ajoute aux clips Blender sans les contrarier.
    const breath = Math.sin(time * (asleep ? 1.1 : 2.2));
    const excited = emotion === 'joyeux' || emotion === 'excite';
    const body = rig ? 0.35 : 1; // le squelette fait deja le gros du travail
    anim.scale.y = 1 + breath * (asleep ? 0.05 : 0.028) * body;
    anim.scale.x = 1 - breath * 0.015 * body;
    anim.scale.z = anim.scale.x;

    hop = moving && !mixer ? Math.abs(Math.sin(time * 8)) : lerp(hop, 0, Math.min(dt * 5, 1));
    const bounce = action === 'dance' ? Math.abs(Math.sin(time * 6)) * 0.2 : 0;
    root.position.y = hop * 0.1 + bounce;

    anim.rotation.x = (asleep ? 0.2 : moving && !mixer ? 0.1 : Math.sin(time * 0.7) * 0.03) * body;
    anim.rotation.z = bank + (excited ? Math.sin(time * 7) * 0.05 : Math.sin(time * 0.9) * 0.02) * body;

    if (asleep) root.position.y -= 0.04;

    // Regard : angles relatifs a l'orientation du corps.
    let lookYaw = 0;
    let lookPitch = 0;
    if (lookAt && !asleep) {
      const dx = lookAt.x - root.position.x;
      const dz = lookAt.z - root.position.z;
      lookYaw = clamp(((Math.atan2(dx, dz) - facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -1.1, 1.1);
      const eye = bounds.height * 0.82;
      lookPitch = clamp(-(lookAt.y - eye) / Math.max(0.6, Math.hypot(dx, dz)), -0.4, 0.4);
    }

    gestureTime = Math.max(0, gestureTime - dt);

    if (rig) {
      rig.apply(dt, time, {
        action,
        emotion,
        moving,
        clipActive: Boolean(mixer && currentClip),
        lookYaw,
        lookPitch,
        reaction,
        gesture: Math.min(1, gestureTime / 0.6),
        speaking
      });
    }

    // Reactions ponctuelles
    if (reaction) {
      reactionTime -= dt;
      if (reaction === 'eat') anim.rotation.x += Math.sin(time * 20) * 0.12;
      if (reaction === 'wash') root.rotation.y += Math.sin(time * 24) * 0.12;
      if (reaction === 'play') root.position.y += Math.abs(Math.sin(time * 10)) * 0.16;
      if (reaction === 'pet') anim.rotation.z += Math.sin(time * 16) * 0.06;
      if (reactionTime <= 0) reaction = null;
    }

    // Petit scintillement pour eviter la fixite parfaite
    anim.position.x = Math.sin(time * 0.6 + jitterPhase) * 0.004;
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

  return { group: root, setStage, react, playBirth, update, headWorldPosition, dispose, bounds };
}

/* -------------------------------------------------------------------------
   Oeuf issu d'un .glb
   Pas de fissures dessinees ici : le modele a sa propre texture. La montee
   en tension passe par les secousses, de plus en plus nerveuses.
   ------------------------------------------------------------------------- */

export function createModelEgg(gltf, seed) {
  const group = new THREE.Group();
  const anim = new THREE.Group();
  const holder = new THREE.Group();
  group.add(anim);
  anim.add(holder);

  const model = cloneSkinned(gltf.scene);
  prepare(model);
  holder.add(model);
  const bounds = fitToHeight(holder, model, 1.25);

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
    anim.visible = false;
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
      anim.rotation.z = Math.sin(time * 1.4) * 0.02 + Math.sin(time * 15) * 0.09 * tension;
      anim.rotation.x = Math.sin(time * 12.5) * 0.05 * tension;
      anim.position.y = Math.abs(Math.sin(time * 7)) * 0.05 * tension;
      anim.scale.setScalar(1 + Math.sin(time * 3) * 0.012);
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
