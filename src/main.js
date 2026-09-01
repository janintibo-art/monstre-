import * as THREE from 'three';
import { loadTextures } from './core/assets.js';
import { createLoop } from './core/loop.js';
import { createWorld } from './game/world.js';
import { createEgg } from './game/egg.js';
import { createMonster } from './game/monster.js';
import { loadModel, createModelMonster, createModelEgg } from './game/gltf.js';
import { speciesById, pickSpecies, eggUrl, stageUrl } from './game/species.js';
import { createParticles } from './game/particles.js';
import { createBrain } from './ai/brain.js';
import { applyEffects, wellbeing } from './ai/needs.js';
import { nudge } from './ai/personality.js';
import { remember } from './ai/memory.js';
import { speak, spontaneousLine } from './ai/dialogue/index.js';
import { load, save, reset, autosave, SAVE_KEY } from './state/save.js';
import { advance, hatch, createPet } from './state/pet.js';
import { createHud } from './ui/hud.js';
import { createActionBar } from './ui/actions.js';
import { createChat } from './ui/chat.js';
import { createPanels } from './ui/panels.js';

// Affiche l'erreur a l'ecran plutot que de laisser l'application figee en
// silence, et propose la seule action qui debloque a coup sur.
function showFatal(error) {
  if (document.getElementById('fatal')) return;
  const box = document.createElement('div');
  box.id = 'fatal';
  box.className = 'fatal';
  box.innerHTML = `
    <strong>Quelque chose a cassé.</strong>
    <span>${String((error && error.message) || error)}</span>
    <button type="button">Recommencer avec un nouvel œuf</button>
  `;
  box.querySelector('button').addEventListener('click', () => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* rien a faire */
    }
    window.location.reload();
  });
  document.body.appendChild(box);
}

async function boot() {
  const canvas = document.getElementById('scene');
  // Les textures sont facultatives ; les modeles se chargent a la demande,
  // stade par stade. Ce qui manque est remplace par la version generee par code.
  const textures = await loadTextures();

  let { pet, offlineSeconds } = load();

  const world = createWorld(canvas, textures);
  const particles = createParticles(world.scene);
  const hud = createHud();

  let egg = null;
  let monster = null;
  let brain = createBrain(pet.seed);
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
  let chatterTimer = 12 + Math.random() * 14;
  let decision = { action: 'idle', emotion: 'calme', urgency: 0 };
  let hatching = 0;

  // ------------------------------------------------------------- entites 3D
  async function spawnEgg() {
    const gltf = await loadModel(eggUrl(species));
    egg = gltf ? createModelEgg(gltf, pet.seed) : createEgg(pet.seed, textures);
    world.scene.add(egg.group);
    hud.showVials(false);
  }

  async function spawnMonster(at = null) {
    const url = stageUrl(species, pet.stage);
    const gltf = await loadModel(url);
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
    const at = monster ? monster.group.position.clone() : null;
    try {
      const gltf = await loadModel(url);
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
      particles.burst(monster.headWorldPosition(), 26, 0xa98bff, 2);
      hud.showBubble('Je me sens... différent.', 4000);
    } finally {
      swapping = false;
    }
  }

  if (pet.hatched) await spawnMonster();
  else await spawnEgg();

  // ------------------------------------------------------------- interface
  const panels = createPanels({
    getPet: () => pet,
    onRename: (name) => {
      pet.name = name;
      save(pet);
    },
    onReset: () => {
      reset();
      pet = createPet();
      brain = createBrain(pet.seed);
      species = speciesById(pet.species);
      currentModelUrl = null;
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
      hud.showBubble(`${name}… d’accord. C’est moi.`);
      save(pet);
    }
  });
  panels.syncName(pet.name);

  const chat = createChat(async (message) => {
    remember(pet.memory, 'talk');
    applyEffects(pet.needs, { affection: 4 });
    const { text } = await speak(message, pet, decision.emotion);
    hud.showBubble(text, 5200);
    return text;
  });

  const actionBar = createActionBar((care) => {
    if (!pet.hatched) return;

    if (care.id === 'talk') {
      chat.open();
      return;
    }

    if (care.id === 'sleep') {
      asleep = !asleep;
      actionBar.setSleepLabel(asleep);
      brain.forceAction(asleep ? 'sleep' : 'idle', 4);
      hud.showBubble(asleep ? 'Bonne nuit…' : 'Déjà le matin ?');
      return;
    }

    // Un soin pendant le sommeil reveille le monstre.
    if (asleep) {
      asleep = false;
      actionBar.setSleepLabel(false);
    }

    applyEffects(pet.needs, care.effects);
    remember(pet.memory, care.id);
    Object.keys(care.drift).forEach((trait) => nudge(pet.personality, trait, care.drift[trait]));
    if (care.reaction && monster) monster.react(care.reaction);
    if (monster) {
      const head = monster.headWorldPosition();
      const color = care.id === 'pet' ? 0xff8fb1 : care.id === 'wash' ? 0x8fd4ff : 0x6fe3c4;
      particles.burst(head, 18, color, 1.6);
    }
    if (care.line) hud.showBubble(care.line, 2600);
    save(pet);
  });

  // -------------------------------------------------------------- pointeur
  function onPointerDown(event) {
    const x = event.clientX;
    const y = event.clientY;
    pointerActive = 2.5;

    if (!pet.hatched && egg) {
      const hits = world.objectsUnder(x, y, [egg.group]);
      if (hits.length) {
        egg.poke();
        pet.taps += 1;
        pet.hatchProgress = Math.min(1, pet.hatchProgress + 0.07);
        particles.burst(new THREE.Vector3(0, 1.1, 0), 8, 0xffe9c2, 1.2);
      }
      return;
    }

    if (monster) {
      const hits = world.objectsUnder(x, y, [monster.group]);
      if (hits.length) {
        // Toucher directement le monstre = caresse.
        applyEffects(pet.needs, { affection: 6, fun: 2 });
        remember(pet.memory, 'pet');
        monster.react('pet', 1);
        particles.burst(monster.headWorldPosition(), 10, 0xff8fb1, 1.3);
        return;
      }
    }

    const ground = world.groundPointFrom(x, y);
    if (ground) {
      ground.y = 0;
      ground.clampLength(0, 5.4);
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
      ground.clampLength(0, 5.4);
      pointerTarget.copy(ground);
      pointerActive = 2.5;
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);

  // ---------------------------------------------------------------- eclosion
  function triggerHatch() {
    if (hatching || pet.hatched) return;
    hatching = 1.1;
    egg.burst();
    particles.burst(new THREE.Vector3(0, 1, 0), 60, 0xfff0c4, 3.2);
  }

  function finishHatch() {
    hatch(pet, pet.name === 'Œuf' ? 'Nyx' : pet.name);
    world.scene.remove(egg.group);
    egg.dispose();
    egg = null;
    spawnMonster().then(() => {
      if (monster && monster.playBirth) monster.playBirth();
      particles.burst(new THREE.Vector3(0, 0.8, 0), 30, 0x6fe3c4, 2);
    });
    panels.askName(pet.name);
    save(pet);
  }

  // ------------------------------------------------------ cible de deplacement
  function updateTarget(action, dt) {
    wanderTimer -= dt;
    switch (action) {
      case 'follow':
        moveTarget.copy(pointerTarget);
        break;
      case 'beg':
      case 'seekAttention':
        // Il vient au premier plan, face a la camera.
        moveTarget.set(0, 0, 2.1);
        break;
      case 'sulk':
        moveTarget.set(Math.sin(pet.seed) * 3.2, 0, -3);
        break;
      case 'sleep':
        moveTarget.copy(monster.group.position);
        break;
      case 'dance':
      case 'play':
      case 'explore':
      default:
        if (wanderTimer <= 0) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 1 + Math.random() * 3.4;
          moveTarget.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
          wanderTimer = action === 'idle' ? 5 + Math.random() * 5 : 2 + Math.random() * 3;
        }
        break;
    }
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
            hourOfDay: new Date().getHours(),
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

      monster.update(dt, time, {
        action: decision.action,
        emotion: decision.emotion,
        target: moveTarget,
        lookAt: lookTarget
      });

      hud.placeBubble(world.toScreen(monster.headWorldPosition()));

      // Prise de parole spontanee
      chatterTimer -= dt;
      if (chatterTimer <= 0) {
        chatterTimer = 18 + Math.random() * 26;
        if (!chat.isOpen && !sleeping) hud.showBubble(spontaneousLine(pet, decision.emotion));
      }
    }

    particles.update(dt);
    actionBar.update(dt, { hatched: pet.hatched });

    hudTimer -= dt;
    if (hudTimer <= 0) {
      hudTimer = 0.2;
      hud.update(pet, decision);
    }

    world.update(dt);
    world.render();
  }

  const loop = createLoop((dt, time) => {
    try {
      step(dt, time);
    } catch (error) {
      errorCount += 1;
      console.error(error);
      if (errorCount === 1) showFatal(error);
      if (errorCount > 30) loop.stop();
    }
  });

  autosave(() => pet);
  loop.start();

  // Message de retour apres une absence
  if (offlineSeconds > 900 && pet.hatched) {
    const hours = Math.floor(offlineSeconds / 3600);
    setTimeout(() => {
      hud.showBubble(
        hours >= 1 ? `Tu es parti ${hours} h. J’ai compté.` : 'Te revoilà. Enfin.',
        5000
      );
    }, 1200);
  }
}

boot().catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML(
    'beforeend',
    `<div style="position:fixed;inset:auto 16px 16px;padding:14px;border-radius:12px;background:#2a1620;color:#ffd8d8;font:14px system-ui">
       Le monde n'a pas pu démarrer : ${String(error && error.message)}. Recharge la page.
     </div>`
  );
});
