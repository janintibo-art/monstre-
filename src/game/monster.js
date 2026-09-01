import * as THREE from 'three';
import { createRng, clamp, lerp } from '../core/rng.js';

// Le monstre est entierement genere par code a partir de son genome.
// Aucune image n'est requise : si tu fournis monster_skin.png, elle est
// simplement appliquee sur le corps a la place de la couleur unie.

export const STAGE_SCALE = {
  egg: 0,
  baby: 0.58,
  child: 0.76,
  teen: 0.92,
  adult: 1.1
};

export function createGenome(seed) {
  const rng = createRng(seed);
  return {
    seed,
    hue: rng(),
    saturation: 0.42 + rng() * 0.3,
    horns: Math.floor(rng() * 3), // 0, 1 ou 2 cornes
    ears: rng() > 0.45,
    tailSegments: 3 + Math.floor(rng() * 3),
    spots: 3 + Math.floor(rng() * 5),
    stubby: rng() > 0.5
  };
}

export function createMonster(genome, textures = {}) {
  const rng = createRng(genome.seed + 101);
  const root = new THREE.Group();

  const skinColor = new THREE.Color().setHSL(genome.hue, genome.saturation, 0.56);
  const bellyColor = new THREE.Color().setHSL((genome.hue + 0.07) % 1, genome.saturation, 0.8);
  const glowColor = new THREE.Color().setHSL((genome.hue + 0.45) % 1, 0.75, 0.62);

  const skinMat = new THREE.MeshStandardMaterial({
    color: textures.monsterSkin ? 0xffffff : skinColor,
    map: textures.monsterSkin || null,
    roughness: 0.62,
    metalness: 0.04
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: textures.monsterBelly ? 0xffffff : bellyColor,
    map: textures.monsterBelly || null,
    roughness: 0.75
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1626, roughness: 0.4 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfbfdff, roughness: 0.25 });
  const glowMat = new THREE.MeshBasicMaterial({ color: glowColor });

  // ---------------------------------------------------------------- corps
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 24), skinMat);
  body.scale.set(1, genome.stubby ? 0.84 : 0.95, 0.88);
  body.position.y = 0.52;
  body.castShadow = true;
  root.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 18), bellyMat);
  belly.scale.set(1, 0.86, 0.6);
  belly.position.set(0, 0.46, 0.26);
  root.add(belly);

  // Points bioluminescents sur le dos
  for (let i = 0; i < genome.spots; i += 1) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035 + rng() * 0.02, 10, 8), glowMat);
    const a = rng() * Math.PI * 2;
    dot.position.set(Math.cos(a) * 0.34, 0.62 + rng() * 0.24, -0.3 - rng() * 0.12);
    root.add(dot);
  }

  // ---------------------------------------------------------------- pattes
  const legs = [];
  [-1, 1].forEach((side) => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.12, 4, 12), skinMat);
    leg.position.set(0.19 * side, 0.16, 0.05);
    leg.castShadow = true;
    root.add(leg);
    legs.push(leg);
  });

  const arms = [];
  [-1, 1].forEach((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.44 * side, 0.6, 0.02);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.16, 4, 12), skinMat);
    arm.position.y = -0.12;
    arm.castShadow = true;
    pivot.add(arm);
    pivot.rotation.z = 0.35 * -side;
    root.add(pivot);
    arms.push(pivot);
  });

  // ---------------------------------------------------------------- queue
  const tailSegments = [];
  let tailParent = new THREE.Group();
  tailParent.position.set(0, 0.42, -0.42);
  root.add(tailParent);
  for (let i = 0; i < genome.tailSegments; i += 1) {
    const seg = new THREE.Group();
    seg.position.z = -0.16;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.13 - i * 0.022, 14, 12),
      i === genome.tailSegments - 1 ? glowMat : skinMat
    );
    mesh.castShadow = true;
    seg.add(mesh);
    tailParent.add(seg);
    tailSegments.push(seg);
    tailParent = seg;
  }

  // ---------------------------------------------------------------- tete
  const head = new THREE.Group();
  head.position.set(0, 1.03, 0.04);
  root.add(head);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 24), skinMat);
  skull.scale.set(1, 0.94, 0.96);
  skull.castShadow = true;
  head.add(skull);

  const eyes = [];
  [-1, 1].forEach((side) => {
    const eye = new THREE.Group();
    eye.position.set(0.15 * side, 0.06, 0.3);
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 16), whiteMat);
    eye.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 12), darkMat);
    pupil.position.z = 0.075;
    eye.add(pupil);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), whiteMat);
    shine.position.set(0.024, 0.03, 0.115);
    eye.add(shine);
    eye.userData.pupil = pupil;
    head.add(eye);
    eyes.push(eye);
  });

  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.085, 0.022, 8, 20, Math.PI),
    darkMat
  );
  mouth.position.set(0, -0.14, 0.34);
  mouth.rotation.z = Math.PI; // sourire par defaut
  head.add(mouth);

  for (let i = 0; i < genome.horns; i += 1) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.2, 10), bellyMat);
    const side = genome.horns === 1 ? 0 : i === 0 ? -1 : 1;
    horn.position.set(0.16 * side, 0.36, 0.02);
    horn.rotation.z = -0.25 * side;
    horn.castShadow = true;
    head.add(horn);
  }

  if (genome.ears) {
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), skinMat);
      ear.scale.set(0.45, 1, 0.7);
      ear.position.set(0.33 * side, 0.24, -0.02);
      ear.rotation.z = 0.4 * side;
      head.add(ear);
    });
  }

  // ------------------------------------------------------------- animation
  let scaleTarget = STAGE_SCALE.baby;
  let currentScale = STAGE_SCALE.baby * 0.2;
  let blinkTimer = 1 + rng() * 3;
  let blinking = 0;
  let facing = 0;
  let hop = 0;
  let reaction = null;
  let reactionTime = 0;
  const velocity = new THREE.Vector3();
  const lookTarget = new THREE.Vector3(0, 1.1, 3);
  const worldHead = new THREE.Vector3();

  function setStage(stage) {
    scaleTarget = STAGE_SCALE[stage] ?? STAGE_SCALE.baby;
  }

  function react(type, duration = 1.4) {
    reaction = type;
    reactionTime = duration;
  }

  function setMouth(emotion) {
    // Bouche retournee = moue. Une seule rotation pilote toute l'expression.
    const sad = emotion === 'triste' || emotion === 'boudeur' || emotion === 'seul';
    mouth.rotation.z = sad ? 0 : Math.PI;
    mouth.scale.setScalar(emotion === 'excite' ? 1.35 : 1);
  }

  function update(dt, time, ctx = {}) {
    const { action = 'idle', emotion = 'calme', target = null, lookAt = null } = ctx;

    // Croissance progressive
    currentScale = lerp(currentScale, scaleTarget, Math.min(dt * 1.2, 1));
    root.scale.setScalar(currentScale);

    // --- Deplacement ---
    let moving = false;
    if (target && action !== 'sleep') {
      const dx = target.x - root.position.x;
      const dz = target.z - root.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.18) {
        moving = true;
        const speed = action === 'play' || action === 'dance' ? 2.1 : 1.15;
        velocity.set((dx / dist) * speed, 0, (dz / dist) * speed);
        root.position.x += velocity.x * dt;
        root.position.z += velocity.z * dt;
        const wanted = Math.atan2(dx, dz);
        let diff = ((wanted - facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        facing += diff * Math.min(dt * 6, 1);
      }
    }
    if (action === 'sulk') {
      // Il tourne le dos : le plus lisible des langages corporels.
      let diff = ((Math.PI - facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      facing += diff * Math.min(dt * 2, 1);
    }
    root.rotation.y = facing;

    // --- Respiration, saut, pose ---
    const asleep = action === 'sleep';
    const breath = Math.sin(time * (asleep ? 1.1 : 2.3));
    body.scale.y = (genome.stubby ? 0.84 : 0.95) * (1 + breath * (asleep ? 0.05 : 0.03));

    hop = moving ? Math.abs(Math.sin(time * 9)) : lerp(hop, 0, Math.min(dt * 5, 1));
    const bounce = action === 'dance' ? Math.abs(Math.sin(time * 6)) * 0.22 : 0;
    root.position.y = hop * 0.09 + bounce + (asleep ? -0.06 : 0);

    head.position.y = 1.03 + breath * 0.015;
    head.rotation.x = asleep ? 0.5 : moving ? -0.08 : Math.sin(time * 0.8) * 0.05;
    body.rotation.x = moving ? 0.12 : 0;

    // --- Regard ---
    if (lookAt && !asleep) lookTarget.lerp(lookAt, Math.min(dt * 3, 1));
    head.getWorldPosition(worldHead);
    const toTarget = lookTarget.clone().sub(worldHead);
    const yaw = clamp(Math.atan2(toTarget.x, toTarget.z) - facing, -0.7, 0.7);
    head.rotation.y = asleep ? 0.3 : lerp(head.rotation.y, yaw, Math.min(dt * 4, 1));
    eyes.forEach((eye) => {
      eye.userData.pupil.position.x = clamp(yaw * 0.06, -0.03, 0.03);
    });

    // --- Clignement ---
    blinkTimer -= dt;
    if (blinkTimer <= 0) {
      blinking = 0.14;
      blinkTimer = 2 + rng() * 4;
    }
    blinking = Math.max(0, blinking - dt);
    const lidClosed = asleep ? 1 : blinking > 0 ? 1 : 0;
    eyes.forEach((eye) => {
      eye.scale.y = lerp(eye.scale.y, lidClosed ? 0.12 : 1, Math.min(dt * 18, 1));
    });

    // --- Bras ---
    const armSwing = moving ? Math.sin(time * 9) * 0.5 : Math.sin(time * 1.6) * 0.08;
    arms.forEach((pivot, i) => {
      const side = i === 0 ? -1 : 1;
      let base = 0.35 * -side;
      if (action === 'dance') base = -1.6 * -side + Math.sin(time * 8) * 0.4;
      if (reaction === 'pet') base += Math.sin(time * 14) * 0.3;
      pivot.rotation.z = lerp(pivot.rotation.z, base, Math.min(dt * 8, 1));
      pivot.rotation.x = armSwing * side;
    });

    // --- Pattes ---
    legs.forEach((leg, i) => {
      leg.position.z = 0.05 + (moving ? Math.sin(time * 9 + i * Math.PI) * 0.09 : 0);
    });

    // --- Queue ---
    const wagSpeed = emotion === 'joyeux' || emotion === 'excite' ? 9 : asleep ? 1.2 : 3;
    const wagAmp = emotion === 'joyeux' || emotion === 'excite' ? 0.35 : 0.14;
    tailSegments.forEach((seg, i) => {
      seg.rotation.y = Math.sin(time * wagSpeed - i * 0.6) * wagAmp;
      seg.rotation.x = Math.sin(time * wagSpeed * 0.5 - i * 0.4) * 0.08;
    });

    setMouth(emotion);

    // --- Reactions ponctuelles ---
    if (reaction) {
      reactionTime -= dt;
      if (reaction === 'eat') head.rotation.x += Math.sin(time * 22) * 0.18;
      if (reaction === 'wash') root.rotation.y += Math.sin(time * 26) * 0.14;
      if (reaction === 'play') root.position.y += Math.abs(Math.sin(time * 11)) * 0.18;
      if (reaction === 'scold') head.rotation.x = 0.4;
      if (reactionTime <= 0) reaction = null;
    }
  }

  function headWorldPosition(out = new THREE.Vector3()) {
    head.getWorldPosition(out);
    out.y += 0.45 * currentScale;
    return out;
  }

  function dispose() {
    root.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
    });
    [skinMat, bellyMat, darkMat, whiteMat, glowMat].forEach((m) => m.dispose());
  }

  return {
    group: root,
    body,
    head,
    setStage,
    react,
    update,
    headWorldPosition,
    dispose,
    get scale() {
      return currentScale;
    }
  };
}
