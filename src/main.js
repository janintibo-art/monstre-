import * as THREE from 'three';
import { loadTextures, loadTexture } from './core/assets.js';
import { createLoop } from './core/loop.js';
import { lockLandscape, setPanelOpen } from './core/orientation.js';
import { createWorld } from './game/world.js';
import { createEgg } from './game/egg.js';
import { createMonster } from './game/monster.js';
import { loadModel, createModelMonster, createModelEgg } from './game/gltf.js';
import { speciesById, pickSpecies, eggUrl, stageUrl } from './game/species.js';
import { createVfx } from './game/vfx.js';
import { createDecor } from './game/decor.js';
import { createKitchen } from './game/food.js';
import { resolveBiome } from './game/biomes.js';
import { createDaylight } from './game/daylight.js';
import { createBrain } from './ai/brain.js';
import { applyEffects, wellbeing } from './ai/needs.js';
import { nudge } from './ai/personality.js';
import {
  remember,
  learn,
  learnFrom,
  recordSpeech,
  recordMoment,
  playerName,
  consolidate
} from './ai/memory.js';
import { speak, spontaneousLine, getLastError } from './ai/dialogue/index.js';
import { load, save, reset, autosave } from './state/save.js';
import { advance, hatch, createPet } from './state/pet.js';
import { createVoice, voiceProfile } from './audio/voice.js';
import { createListener } from './audio/listen.js';
import { createGamesUi } from './ui/games.js';
import { createGuide } from './ui/guide.js';
import { comfortEnabled, applyComfortClass } from './state/profile.js';
import {
  currentBand,
  getActiveProfile,
  migrateLegacy,
  listProfiles,
  seedFacts
} from './state/profiles.js';
import { createProfilePicker } from './ui/profiles.js';
import { createHud } from './ui/hud.js';
import { createActionBar } from './ui/actions.js';
import { createChat } from './ui/chat.js';
import { createPanels } from './ui/panels.js';

// Affiche l'erreur a l'ecran plutot que de laisser l'application figee en
// silence, et propose la seule action qui debloque a coup sur.
function showFatal(error) {
  const boot = document.getElementById('boot');
  if (boot) boot.remove(); // sinon l'erreur resterait cachee derriere le logo
  if (document.getElementById('fatal')) return;
  // Construit avec textContent : un message d'erreur peut venir d'une URL ou
  // d'un fournisseur distant, il ne doit jamais etre interprete comme du HTML.
  const box = document.createElement('div');
  box.id = 'fatal';
  box.className = 'fatal';
  const title = document.createElement('strong');
  title.textContent = 'Quelque chose a cassé.';
  const detail = document.createElement('span');
  detail.textContent = String((error && error.message) || error).slice(0, 300);
  const reload = document.createElement('button');
  reload.type = 'button';
  reload.textContent = 'Recharger';
  reload.addEventListener('click', () => window.location.reload());
  const restart = document.createElement('button');
  restart.type = 'button';
  restart.className = 'fatal__secondary';
  restart.textContent = 'Recommencer avec un nouvel œuf';
  restart.addEventListener('click', () => {
    // Le monstre courant part en copie de secours avant d'etre remplace.
    reset();
    window.location.reload();
  });
  box.append(title, detail, reload, restart);
  document.body.appendChild(box);
}

const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function applyProfileComfort() {
  const profile = getActiveProfile();
  return applyComfortClass(comfortEnabled(currentBand(), profile ? profile.comfort : null));
}

// Choix du profil avant tout le reste : la sauvegarde chargee depend de qui
// joue, donc rien ne peut demarrer tant que la question n'est pas tranchee.
function askProfile() {
  return new Promise((resolve) => {
    const picker = createProfilePicker({
      onChoose: (profile, info) => {
        picker.close();
        resolve({ profile, ...info });
      }
    });
    picker.open({ closable: false });
  });
}

async function boot() {
  lockLandscape();

  // Une installation anterieure aux profils devient le premier profil : sa
  // creature et ses souvenirs sont conserves.
  migrateLegacy();

  let seeded = false;
  if (!getActiveProfile() || !listProfiles().length) {
    const chosen = await askProfile();
    seeded = Boolean(chosen.isNew);
  }
  applyProfileComfort();
  const canvas = document.getElementById('scene');
  // Les textures sont facultatives ; les modeles se chargent a la demande,
  // stade par stade. Ce qui manque est remplace par la version generee par code.
  const textures = await loadTextures();

  let { pet, offlineSeconds } = load();

  // Profil tout juste cree : ce que la personne a coche devient des souvenirs.
  // La creature la connait donc un peu des la premiere phrase, au lieu de
  // demander son prenom a quelqu'un qui vient de l'ecrire.
  if (seeded) {
    const profile = getActiveProfile();
    if (profile) {
      seedFacts(profile).forEach((fact) => learn(pet.memory, fact));
      save(pet);
    }
  }

  // Le decor decoule de la graine, sauf si le joueur en a choisi un.
  let biome = resolveBiome(pet);
  const base = import.meta.env.BASE_URL || './';
  const groundTexture = await loadTexture(base + biome.ground);

  const world = createWorld(canvas, { ...textures, ground: groundTexture }, biome);
  const decor = createDecor(world.scene);
  decor.build(biome, pet.seed);

  const daylight = createDaylight(world);
  daylight.setBiome(biome);
  const vfx = createVfx(world.scene, { reducedMotion: REDUCED_MOTION });

  // Les repas. La jauge de faim ne monte qu'une fois le plat termine : c'est ce
  // qui donne au geste une duree, et donc quelque chose a regarder.
  const kitchen = createKitchen(world.scene, {
    onArrive: (food, at, how) => {
      if (how === 'landed') {
        vfx.shockwave(at, { color: 0xffd9a0, size: 1.4, duration: 0.5 });
        vfx.emit('eat', at, { count: 8 });
        world.shake(0.08);
        say(`Oh ! ${food.line}`, 4200);
      } else if (monster) {
        monster.react('eat', 2.4);
      }
    },
    onBite: (food, at) => {
      const mouth = at.clone();
      mouth.y += 0.25;
      vfx.emit('chomp', mouth, { count: 5 });
      vfx.emit('eat', mouth);
      if (monster) monster.react('eat', 0.8);
    },
    onFinish: (food, at) => {
      applyEffects(pet.needs, food.effects);
      remember(pet.memory, 'feed', { food: food.id });
      nudge(pet.personality, 'greed', 0.012);
      vfx.emit('hearts', at.clone().setY(at.y + 0.4), { count: 5 });
      vfx.shockwave(at, { color: 0x9dffd0, size: 1.6, duration: 0.6 });
      say(pickLine(food), 3200);
      save(pet);
    }
  });

  // Le commentaire d'apres-repas depend du plat : un soda ne se commente pas
  // comme une soupe.
  function pickLine(food) {
    const generiques = ['Miam.', 'C’était bon.', 'Encore ?', 'Merci.'];
    if (food.effects.energy && food.effects.energy > 4) return 'Oh là. Je me sens tout électrique.';
    if (food.effects.hygiene && food.effects.hygiene < 0) return 'J’en ai partout. Ça valait le coup.';
    if (food.effects.hunger >= 34) return 'Je crois que je ne bougerai plus pendant un moment.';
    return generiques[Math.floor(Math.random() * generiques.length)];
  }
  if (REDUCED_MOTION) world.shake = () => {};
  const hud = createHud();
  const voice = createVoice();

  // Tout ce que la creature dit passe par ici : bulle a l'ecran ET voix.
  function say(text, duration) {
    hud.showBubble(text, duration);
    if (pet.hatched) voice.speak(text, voiceProfile(pet, currentBand()));
  }

  let egg = null;
  let monster = null;
  let brain = createBrain(pet.seed);

  // Jeton de generation. Chaque operation asynchrone note la generation au
  // depart ; si elle a change a l'arrivee (reset, changement de decor rapide),
  // le resultat est jete au lieu d'etre applique par-dessus l'etat courant.
  let generation = 0;
  const stale = (g) => g !== generation;
  let species = speciesById(pet.species || pickSpecies(pet.seed).id);
  let currentModelUrl = null;
  let swapping = false;

  // --- Etat de session (non sauvegarde) ---
  let asleep = false;
  let pointerActive = 0; // secondes restantes ou le doigt compte comme present
  const pointerTarget = new THREE.Vector3(0, 0, 1.4);
  const moveTarget = new THREE.Vector3(0, 0, 0);
  const lookTarget = new THREE.Vector3(0, 1.1, 3);
  let wanderTimer = 0;
  let thinkTimer = 0;
  let hudTimer = 0;
  let forgetTimer = 30;
  let ambientTimer = 0;
  let chatterTimer = 12 + Math.random() * 14;
  let decision = { action: 'idle', emotion: 'calme', urgency: 0 };
  let hatching = 0;

  // ------------------------------------------------------------- entites 3D
  async function spawnEgg() {
    const g = generation;
    const gltf = await loadModel(eggUrl(species));
    if (stale(g) || egg) return;
    egg = gltf ? createModelEgg(gltf, pet.seed) : createEgg(pet.seed, textures);
    world.scene.add(egg.group);
    hud.showVials(false);
  }

  async function spawnMonster(at = null) {
    const g = generation;
    const url = stageUrl(species, pet.stage);
    const gltf = await loadModel(url);
    if (stale(g) || monster) return;
    currentModelUrl = url;
    monster = gltf
      ? createModelMonster(gltf, pet.genome)
      : createMonster(pet.genome, textures);
    monster.setStage(pet.stage);
    if (at) monster.group.position.copy(at);
    world.scene.add(monster.group);
    hud.showVials(true);
  }

  // La creature change de corps en grandissant. On garde sa position pour que
  // la transformation se voie sur place, sans teleportation.
  async function swapModel() {
    const url = stageUrl(species, pet.stage);
    if (!url || url === currentModelUrl || swapping) return;
    swapping = true;
    const g = generation;
    const at = monster ? monster.group.position.clone() : null;
    try {
      const gltf = await loadModel(url);
      if (stale(g)) return;
      if (!gltf) {
        currentModelUrl = url;
        return;
      }
      if (monster) {
        world.scene.remove(monster.group);
        monster.dispose();
      }
      monster = createModelMonster(gltf, pet.genome);
      monster.setStage(pet.stage);
      if (at) monster.group.position.copy(at);
      world.scene.add(monster.group);
      currentModelUrl = url;
      const at = monster.group.position.clone();
      vfx.lightBeam(at, { color: 0xd8c4ff, duration: 1.3 });
      vfx.emit('growth', at);
      vfx.shockwave(at, { color: 0xa98bff, size: 3.2, duration: 0.9 });
      vfx.flash('#e6d9ff', 0.35, 500);
      world.shake(0.2);
      recordMoment(pet.memory, 'croissance', `J'ai grandi et changé de corps.`);
      say('Je me sens... différent.', 4000);
    } finally {
      swapping = false;
    }
  }

  if (pet.hatched) await spawnMonster();
  else await spawnEgg();

  // ------------------------------------------------------------- interface
  const panels = createPanels({
    getPet: () => pet,
    voice,
    onMemoryChange: () => save(pet),
    onGuide: () => guide.open(),
    onProfiles: () => {
      // Changer de profil change la sauvegarde a charger : on repart proprement
      // plutot que de recabler le monde a chaud.
      save(pet);
      const picker = createProfilePicker({
        onChoose: () => window.location.reload()
      });
      picker.open({ closable: true });
    },
    onAgeChange: () => {
      applyProfileComfort();
      // Les jeux proposes changent avec l'age : on rafraichit si le panneau est
      // deja ouvert, sinon la liste resterait celle de l'ancienne tranche.
      if (games.isOpen) games.open();
    },
    onImport: (imported) => {
      reset(); // l'actuel devient la copie de secours
      save(imported);
      window.location.reload(); // repartir propre est plus sur que recabler a chaud
    },
    onPanelToggle: setPanelOpen,
    onBiome: async (next) => {
      biome = next;
      const g = generation;
      const wanted = next;
      const texture = await loadTexture(base + biome.ground);
      // Deux changements rapides : seule la derniere demande s'applique.
      if (stale(g) || biome !== wanted) return;
      world.applyBiome(biome, texture);
      daylight.setBiome(biome);
      decor.build(biome, pet.seed);
    },
    daylight,
    onRename: (name) => {
      pet.name = name;
      save(pet);
    },
    onReset: () => {
      generation += 1; // tout chargement en cours devient caduc
      kitchen.clear();
      reset();
      pet = createPet();
      brain = createBrain(pet.seed);
      species = speciesById(pet.species);
      currentModelUrl = null;
      biome = resolveBiome(pet);
      const g = generation;
      loadTexture(base + biome.ground).then((texture) => {
        if (stale(g)) return;
        world.applyBiome(biome, texture);
        daylight.setBiome(biome);
        decor.build(biome, pet.seed);
      });
      if (monster) {
        world.scene.remove(monster.group);
        monster.dispose();
        monster = null;
      }
      if (egg) {
        world.scene.remove(egg.group);
        egg.dispose();
        egg = null;
      }
      spawnEgg();
      save(pet);
    },
    onNamed: (name) => {
      pet.name = name;
      panels.syncName(name);
      remember(pet.memory, 'named', { name });
      recordMoment(pet.memory, 'naissance', `Tu m'as appelé ${name} le jour de mon éclosion.`);
      say(`${name}… d’accord. C’est moi.`);
      save(pet);
    }
  });
  panels.syncName(pet.name);

  // Clavier et micro aboutissent au meme endroit : une seule voie de reponse,
  // donc un seul comportement a maintenir.
  let answering = false;
  async function answer(message, options = {}) {
    if (answering) return null; // double envoi : on ignore le second
    answering = true;
    try {
      return await answerInner(message, options);
    } finally {
      answering = false;
    }
  }

  async function answerInner(message, { silent = false } = {}) {
    remember(pet.memory, 'talk');
    applyEffects(pet.needs, { affection: 4 });
    if (monster) monster.react('pet', 0.8);

    // On retient AVANT de repondre : ce que tu viens de dire fait deja partie
    // de ce qu'elle sait au moment ou elle repond.
    recordSpeech(pet.memory, 'you', message);
    const learned = learnFrom(pet.memory, message);

    const { text, source } = await speak(message, pet, decision.emotion);

    // En mode papoter, le panneau affiche et lit lui-meme : une bulle en plus
    // sur la scene ferait doublon, et deux voix se chevaucheraient.
    if (silent) recordSpeech(pet.memory, 'pet', text);
    else say(text, 5200);

    // Le joueur a choisi un fournisseur distant et c'est le local qui a repondu :
    // il doit le savoir, sinon il croit parler a un modele qui n'est pas la.
    if (source === 'local' && !getEndpointless()) {
      chat.notice(`Réponse locale : ${getLastError() || 'fournisseur injoignable'}`);
    }

    // Un fait tout juste appris merite un accuse de reception, sinon on ne sait
    // pas si elle a enregistre. Une seule relance, et seulement en mode local.
    if (learned.length && getEndpointless()) {
      setTimeout(() => {
        const fact = learned[0];
        hud.showBubble(
          fact.kind === 'name' ? `${fact.value}. Je retiens.` : `Je note : ${fact.text.toLowerCase()}`,
          4000
        );
      }, 5400);
    }

    save(pet);
    return text;
  }

  // En mode distant, le modele confirme lui-meme ce qu'il a retenu : une
  // relance de notre part ferait doublon.
  function getEndpointless() {
    try {
      const config = JSON.parse(localStorage.getItem('monstre.ai') || '{}');
      return !config.provider || config.provider === 'local';
    } catch {
      return true;
    }
  }

  const chat = createChat(answer);

  // --- Micro ---
  // Quand la conversation guidee ecoute, le texte lui revient a elle plutot
  // qu'au fil de discussion ordinaire.
  let talkTarget = null;

  const listener = createListener({
    onPartial: (text) => {
      hud.showThought(`« ${text} »`);
    },
    onFinal: async (text) => {
      hud.showThought('');
      if (!text) return;
      if (talkTarget) {
        const target = talkTarget;
        talkTarget = null;
        target(text);
        return;
      }
      chat.append(text, 'you');
      const reply = await answer(text);
      if (reply) chat.append(reply, 'pet');
    },
    onState: (active) => {
      actionBar.setListening(active);
      // On coupe la voix de la creature pendant l'ecoute, sinon le micro la
      // reprend et elle finit par se repondre a elle-meme.
      if (active) voice.stop();
      if (!active) hud.showThought('');
    },
    onError: (message) => {
      actionBar.setListening(false);
      talkTarget = null;
      hud.showThought('');
      hud.showBubble(`Je n'entends rien : ${message}`, 5000);
      chat.open();
    }
  });

  const actionBar = createActionBar((care) => {
    if (!pet.hatched) return;

    if (care.id === 'talk') {
      chat.open();
      return;
    }

    if (care.id === 'games') {
      voice.unlock();
      games.open();
      return;
    }

    if (care.id === 'listen') {
      voice.unlock();
      listener.toggle();
      return;
    }

    if (care.id === 'sleep') {
      asleep = !asleep;
      actionBar.setSleepLabel(asleep);
      brain.forceAction(asleep ? 'sleep' : 'idle', 4);
      if (asleep) voice.stop();
      say(asleep ? 'Bonne nuit…' : 'Déjà le matin ?');
      return;
    }

    // Un soin pendant le sommeil reveille le monstre.
    if (asleep) {
      asleep = false;
      actionBar.setSleepLabel(false);
    }

    if (care.id === 'feed') {
      // On sert, on ne remplit pas : la jauge montera quand le plat sera mange.
      kitchen.serve(monster ? monster.group.position : null);
      return;
    }

    applyEffects(pet.needs, care.effects);
    remember(pet.memory, care.id);
    Object.keys(care.drift).forEach((trait) => nudge(pet.personality, trait, care.drift[trait]));
    if (care.reaction && monster) monster.react(care.reaction);
    if (monster) {
      const head = monster.headWorldPosition();
      const mouth = head.clone();
      mouth.y -= 0.18 * monster.scale;

      if (care.id === 'pet') {
        vfx.emit('hearts', head);
      } else if (care.id === 'wash') {
        vfx.emit('bubbles', head, { radius: 0.4 });
        setTimeout(() => vfx.emit('bubbles', head, { count: 12, radius: 0.5 }), 380);
      } else if (care.id === 'play') {
        vfx.emit('sparkleTrail', head, { count: 14, speedScale: 2 });
        vfx.shockwave(monster.group.position, { color: 0x9dffd0, size: 1.8, duration: 0.5 });
      }
    }
    if (care.line) say(care.line, 2600);
    save(pet);
  });

  // ----------------------------------------------------------- jeux et guide
  // La creature reagit a ce qui se passe dans les jeux : elle se rejouit d'une
  // bonne reponse et encourage apres une erreur. C'est ce qui fait qu'on joue
  // AVEC elle, et pas juste sur un questionnaire pose devant elle.
  const games = createGamesUi({
    getPet: () => pet,
    voice,
    voiceProfile,
    onAnswer: answer,
    onListen: (onHeard) => {
      // Le micro des jeux passe par le meme module que le reste : une seule
      // voie d'ecoute a maintenir, et les memes garde-fous.
      talkTarget = onHeard;
      listener.start();
    },
    onCelebrate: (big = false) => {
      if (!monster) return;
      monster.react('pet', 1.2);
      brain.forceAction(big ? 'dance' : 'play', big ? 6 : 3);
      const head = monster.headWorldPosition();
      vfx.emit(big ? 'growth' : 'sparkleTrail', head, { count: big ? 24 : 10 });
      vfx.emit('hearts', head, { count: big ? 8 : 3 });
      applyEffects(pet.needs, { fun: big ? 6 : 2, affection: 1 });
    },
    onEncourage: () => {
      if (monster) monster.react('pet', 0.6);
    }
  });

  const guide = createGuide({ voice, voiceProfile, getPet: () => pet });

  games.setToggleHandler((open) => panels.setExternalOpen(open));
  guide.setToggleHandler((open) => panels.setExternalOpen(open));

  // -------------------------------------------------------------- pointeur
  function onPointerDown(event) {
    voice.unlock(); // le son reste bloque tant que l'ecran n'a pas ete touche
    const x = event.clientX;
    const y = event.clientY;
    pointerActive = 2.5;

    if (!pet.hatched && egg) {
      // Toucher l'oeuf compte double, mais une tape a cote compte quand meme :
      // viser une petite forme sur un ecran de telephone est ingrat, et rater
      // sans aucun retour donnait l'impression que rien ne se passait.
      const hits = world.objectsUnder(x, y, [egg.group]);
      const gain = hits.length ? 0.1 : 0.045;
      egg.poke();
      pet.taps += 1;
      pet.hatchProgress = Math.min(1, pet.hatchProgress + gain);
      vfx.emit('eggGlow', new THREE.Vector3(0, 1, 0), { count: hits.length ? 5 : 2 });
      if (hits.length) world.shake(0.06);
      return;
    }

    if (monster) {
      const hits = world.objectsUnder(x, y, [monster.group]);
      if (hits.length) {
        // Toucher directement le monstre = caresse.
        applyEffects(pet.needs, { affection: 6, fun: 2 });
        remember(pet.memory, 'pet');
        monster.react('pet', 1);
        vfx.emit('hearts', monster.headWorldPosition(), { count: 4 });
        return;
      }
    }

    const ground = world.groundPointFrom(x, y);
    if (ground) {
      ground.y = 0;
      world.clampToArena(ground);
      pointerTarget.copy(ground);
    }
  }

  function onPointerMove(event) {
    if (event.buttons === 0 && event.pointerType === 'mouse') {
      // Souris sans clic : sert seulement au regard et au parallaxe.
      const ground = world.groundPointFrom(event.clientX, event.clientY);
      if (ground) lookTarget.set(ground.x, 1, ground.z);
      return;
    }
    const ground = world.groundPointFrom(event.clientX, event.clientY);
    if (ground) {
      ground.y = 0;
      world.clampToArena(ground);
      pointerTarget.copy(ground);
      pointerActive = 2.5;
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);

  // ---------------------------------------------------------------- eclosion
  function triggerHatch() {
    if (hatching || pet.hatched) return;
    hatching = 1.4;
    const center = new THREE.Vector3(0, 1, 0);

    // La coquille cede : lumiere d'abord, matiere ensuite. L'inverse se lirait
    // comme une explosion, pas comme une naissance.
    vfx.lightBeam(center, { duration: 1.5 });
    vfx.flash('#fff3d0', 0.85, 520);
    world.shake(0.45);
    egg.burst();
    vfx.emit('hatchBurst', center);
    vfx.emit('shards', center);
    vfx.shockwave(center, { color: 0xffe9b0, size: 4.2, duration: 0.85 });

    // Deuxieme souffle, plus doux, pendant que les eclats retombent.
    setTimeout(() => {
      vfx.emit('hatchDust', new THREE.Vector3(0, 0.5, 0), { radius: 0.6 });
      vfx.shockwave(center, { color: 0x6fe3c4, size: 5.5, duration: 1.1 });
    }, 320);
  }

  function finishHatch() {
    hatch(pet, pet.name === 'Œuf' ? 'Nyx' : pet.name);
    world.scene.remove(egg.group);
    egg.dispose();
    egg = null;
    spawnMonster().then(() => {
      if (monster && monster.playBirth) monster.playBirth();
      const at = new THREE.Vector3(0, 0.4, 0);
      vfx.emit('growth', at, { count: 26 });
      vfx.emit('sparkleTrail', new THREE.Vector3(0, 0.9, 0), { count: 16, speedScale: 1.6 });
      vfx.shockwave(at, { color: 0x9dffd0, size: 2.6, duration: 0.8 });
    });
    panels.askName(pet.name);
    save(pet);
  }

  // ------------------------------------------------------ cible de deplacement
  // La cible du deplacement depend du comportement. Une errance credible n'est
  // pas une suite de points aleatoires : il faut des pauses, des trajets courts
  // et parfois un long, sinon la creature a l'air de patrouiller.
  let orbitAngle = 0;

  function wander(dt, { near = false } = {}) {
    if (wanderTimer > 0) return;
    const roll = Math.random();
    if (roll < 0.32) {
      // Pause sur place : c'est ce qui rend le reste vivant.
      moveTarget.copy(monster.group.position);
      wanderTimer = 1.6 + Math.random() * 3.4;
      return;
    }
    const angle = Math.random() * Math.PI * 2;
    const radius = near ? 0.6 + Math.random() * 1.4 : 1 + Math.random() * 3.4;
    moveTarget.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    wanderTimer = 2 + Math.random() * 3;
  }

  function updateTarget(action, dt) {
    wanderTimer -= dt;

    // Un plat pose au sol passe avant tout le reste : c'est le seul evenement
    // du jeu qui detourne la creature de ce qu'elle etait en train de faire.
    if (kitchen.busy) {
      moveTarget.copy(monster.group.position);
      return;
    }
    if (kitchen.target) {
      moveTarget.copy(kitchen.target);
      world.clampToArena(moveTarget);
      return;
    }

    switch (action) {
      case 'follow':
        moveTarget.copy(pointerTarget);
        break;

      case 'beg':
      case 'seekAttention':
        // Il vient au premier plan, mais pas toujours exactement au meme
        // endroit : un leger decalage evite l'effet de rail.
        if (wanderTimer <= 0) {
          moveTarget.set((Math.random() - 0.5) * 0.8, 0, 1.6 + Math.random() * 0.5);
          wanderTimer = 3 + Math.random() * 3;
        }
        break;

      case 'sulk':
        // Il s'eloigne et reste dos tourne, dans un coin.
        if (wanderTimer <= 0) {
          const a = Math.PI + (Math.random() - 0.5) * 1.2;
          moveTarget.set(Math.cos(a) * 1.6, 0, Math.sin(a) * 1.6 - 1.6);
          wanderTimer = 5 + Math.random() * 4;
        }
        break;

      case 'sleep':
      case 'dance':
        moveTarget.copy(monster.group.position);
        break;

      case 'play':
        // Tourne autour du joueur en zigzag : lisible et joyeux.
        orbitAngle += dt * (1.4 + Math.random() * 0.2);
        moveTarget.set(Math.cos(orbitAngle) * 1.3, 0, Math.sin(orbitAngle) * 1.4 + 0.3);
        break;

      case 'explore':
        wander(dt);
        break;

      default:
        wander(dt, { near: true });
        break;
    }

    // Aire de jeu elliptique, calquee sur ce que la camera voit reellement :
    // etroite en largeur sur un ecran vertical, plus profonde en avant-arriere.
    world.clampToArena(moveTarget);
  }

  // -------------------------------------------------------------- boucle
  // Une exception dans la boucle empechait la frame suivante d'etre planifiee :
  // l'ecran se figeait sans un mot. On l'attrape, on l'affiche, et on continue
  // tant que c'est possible.
  let errorCount = 0;

  function step(dt, time) {
    pointerActive = Math.max(0, pointerActive - dt);

    const sleeping = asleep || decision.action === 'sleep';
    advance(pet, dt, { asleep: sleeping });

    if (!pet.hatched && egg) {
      egg.setProgress(pet.hatchProgress);
      egg.update(dt, time);

      // Passe un certain stade, l'oeuf laisse echapper de la lumiere par ses
      // fissures : le joueur voit que ca approche.
      if (pet.hatchProgress > 0.45 && !hatching) {
        ambientTimer -= dt;
        if (ambientTimer <= 0) {
          ambientTimer = 1.1 - pet.hatchProgress * 0.8;
          vfx.emit('eggGlow', new THREE.Vector3(0, 0.9, 0), { count: 1, radius: 0.35 });
        }
      }
      if (hatching > 0) {
        hatching -= dt;
        if (hatching <= 0) finishHatch();
      } else if (pet.hatchProgress >= 1) {
        triggerHatch();
      }
    } else if (monster) {
      thinkTimer -= dt;
      if (thinkTimer <= 0) {
        thinkTimer = 0.35;
        decision = brain.think(
          pet,
          {
            hourOfDay: daylight.hourOfDay,
            pointerActive: pointerActive > 0,
            wellbeing: wellbeing(pet.needs)
          },
          0.35
        );
        if (asleep) decision = { ...decision, action: 'sleep', emotion: 'fatigue' };
      }

      monster.setStage(pet.stage);
      swapModel();
      updateTarget(decision.action, dt);

      if (pointerActive > 0) lookTarget.set(pointerTarget.x, 1, pointerTarget.z);
      else lookTarget.set(0, 1.1, 3);

      // Elle marche vers son plat et le regarde : sans ca, elle s'en approcherait
      // en regardant ailleurs, ce qui est exactement ce qu'on ne veut pas voir.
      const foodAt = kitchen.target;
      if (foodAt) lookTarget.set(foodAt.x, 0.4, foodAt.z);

      monster.update(dt, time, {
        action: foodAt ? 'follow' : decision.action,
        emotion: decision.emotion,
        target: moveTarget,
        lookAt: lookTarget,
        speaking: voice.level()
      });

      // Effets continus, cadences par un minuteur : emettre a chaque image
      // saturerait la reserve de particules en une seconde.
      ambientTimer -= dt;
      if (ambientTimer <= 0) {
        const head = monster.headWorldPosition();
        if (sleeping) {
          ambientTimer = 1.6;
          vfx.emit('sleep', head);
        } else if (decision.action === 'play' || decision.action === 'dance') {
          ambientTimer = 0.16;
          const foot = monster.group.position.clone();
          foot.y += 0.08;
          vfx.emit('sparkleTrail', foot, { count: 2 });
        } else {
          ambientTimer = 0.4;
        }
      }

      // Garde-fou : on ramene la creature elle-meme, pas seulement sa cible.
      // Si l'ecran pivote, l'aire retrecit d'un coup et elle se retrouverait
      // dehors sans jamais y revenir.
      const here = monster.group.position;
      const outside = Math.hypot(here.x / world.playBounds.x, here.z / world.playBounds.z);
      if (outside > 1.05) {
        // Rappel progressif plutot qu'un saut : on la voit revenir.
        const pull = Math.min(dt * 1.5, 1);
        here.x += (here.x / outside - here.x) * pull;
        here.z += (here.z / outside - here.z) * pull;
      }

      world.setFocus(monster.group.position);
      hud.placeBubble(world.toScreen(monster.headWorldPosition()));

      // Prise de parole spontanee
      chatterTimer -= dt;
      if (chatterTimer <= 0) {
        chatterTimer = 18 + Math.random() * 26;
        // Pas de bavardage pendant un jeu ou la lecture du guide : deux voix
        // qui se chevauchent rendent la consigne incomprehensible.
        if (!chat.isOpen && !games.isOpen && !guide.isOpen && !sleeping && !kitchen.hasFood) {
          say(spontaneousLine(pet, decision.emotion));
        }
      }
    }

    daylight.update(dt);
    vfx.update(dt);
    kitchen.update(dt, time, monster ? monster.group.position : null);
    decor.update(dt, time);
    actionBar.update(dt, { hatched: pet.hatched });

    hudTimer -= dt;
    if (hudTimer <= 0) {
      hudTimer = 0.2;
      hud.update(pet, decision);
    }

    // L'oubli tourne en fond, une fois par minute : inutile plus souvent, et ca
    // evite de parcourir la memoire a chaque image.
    forgetTimer -= dt;
    if (forgetTimer <= 0) {
      forgetTimer = 60;
      consolidate(pet.memory);
    }

    world.update(dt);
    world.render();
  }

  const loop = createLoop((dt, time) => {
    try {
      step(dt, time);
      errorCount = 0; // une image reussie remet le compteur a zero
    } catch (error) {
      errorCount += 1;
      console.error(error);
      if (errorCount === 1) showFatal(error);
      // Trois echecs d'affilee : l'erreur n'est pas transitoire, on cesse de
      // solliciter le GPU pour rien.
      if (errorCount >= 3) loop.stop();
    }
  });

  autosave(() => pet);
  loop.start();

  // On efface l'ecran de demarrage seulement une fois la premiere image rendue,
  // sinon on decouvrirait une scene vide pendant une fraction de seconde.
  requestAnimationFrame(() => {
    const boot = document.getElementById('boot');
    if (!boot) return;
    boot.classList.add('boot--done');
    setTimeout(() => boot.remove(), 600);
  });

  // Message de retour apres une absence
  if (offlineSeconds > 900 && pet.hatched) {
    const hours = Math.floor(offlineSeconds / 3600);
    setTimeout(() => {
      say(hours >= 1 ? `Tu es parti ${hours} h. J’ai compté.` : 'Te revoilà. Enfin.', 5000);
    }, 1200);
  }
}

boot().catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML(
    'beforeend',
    '<div id="boot-error" class="fatal"></div>'
  );
  const el = document.getElementById('boot-error');
  el.textContent = `Le monde n'a pas pu démarrer : ${String(error && error.message).slice(0, 300)}. Recharge la page.`;
});
