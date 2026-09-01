import * as THREE from 'three';
import { createRng } from '../core/rng.js';

// L'oeuf. Sa coquille est une texture dessinee en canvas : les fissures
// apparaissent au fur et a mesure, sans avoir besoin d'images.

function makeShellTexture(seed, cracks) {
  const rng = createRng(seed);
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Fond nacre
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#f6efe2');
  grad.addColorStop(1, '#d9c8ad');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Mouchetures
  ctx.fillStyle = 'rgba(120, 96, 70, 0.28)';
  for (let i = 0; i < 220; i += 1) {
    const r = 2 + rng() * 7;
    ctx.beginPath();
    ctx.arc(rng() * size, rng() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fissures : une branche par palier atteint
  ctx.strokeStyle = 'rgba(40, 30, 24, 0.85)';
  ctx.lineCap = 'round';
  for (let c = 0; c < cracks; c += 1) {
    let x = size * (0.25 + rng() * 0.5);
    let y = size * (0.2 + rng() * 0.55);
    let angle = rng() * Math.PI * 2;
    ctx.lineWidth = 3 + rng() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segments = 6 + Math.floor(rng() * 6);
    for (let s = 0; s < segments; s += 1) {
      angle += (rng() - 0.5) * 1.4;
      x += Math.cos(angle) * (12 + rng() * 22);
      y += Math.sin(angle) * (12 + rng() * 22);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createEgg(seed, textures = {}) {
  const group = new THREE.Group();
  let cracks = 0;
  let shake = 0;
  let hatched = false;

  const material = new THREE.MeshStandardMaterial({
    map: textures.eggShell || makeShellTexture(seed, 0),
    roughness: 0.55,
    metalness: 0.02
  });

  // Forme d'oeuf : sphere etiree, plus etroite en haut.
  const geometry = new THREE.SphereGeometry(0.62, 40, 32);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    const taper = 1 - Math.max(0, y / 0.62) * 0.22;
    pos.setX(i, pos.getX(i) * taper);
    pos.setZ(i, pos.getZ(i) * taper);
    pos.setY(i, y * 1.32);
  }
  geometry.computeVertexNormals();

  const shell = new THREE.Mesh(geometry, material);
  shell.castShadow = true;
  shell.position.y = 0.82;
  group.add(shell);

  // Socle de mousse
  const nest = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.16, 12, 32),
    new THREE.MeshStandardMaterial({ color: 0x35506a, roughness: 1 })
  );
  nest.rotation.x = Math.PI / 2;
  nest.position.y = 0.14;
  nest.receiveShadow = true;
  nest.castShadow = true;
  group.add(nest);

  const debris = [];

  function setProgress(progress) {
    // 4 paliers de fissures avant l'eclosion
    const target = Math.min(4, Math.floor(progress * 5));
    if (target !== cracks && !textures.eggShell) {
      cracks = target;
      material.map = makeShellTexture(seed, cracks);
      material.needsUpdate = true;
    } else {
      cracks = target;
    }
  }

  function poke() {
    shake = 1;
  }

  // Fait exploser la coquille en morceaux qui retombent.
  function burst() {
    if (hatched) return;
    hatched = true;
    shell.visible = false;
    const rng = createRng(seed + 7);
    for (let i = 0; i < 14; i += 1) {
      const piece = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.06 + rng() * 0.07),
        material.clone()
      );
      piece.position.set(0, 0.85, 0);
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
      const idle = Math.sin(time * 1.4) * 0.02;
      const nervous = (0.05 + cracks * 0.04) * Math.sin(time * 14);
      shell.rotation.z = idle + nervous * (0.3 + shake);
      shell.position.y = 0.82 + Math.abs(Math.sin(time * 6)) * 0.02 * (cracks + shake * 3);
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
        piece.material.opacity = 1;
      }
    }
  }

  function dispose() {
    group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }

  return { group, shell, nest, setProgress, poke, burst, update, dispose };
}
