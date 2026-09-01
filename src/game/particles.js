import * as THREE from 'three';

// Particules minimalistes : un seul THREE.Points recycle. Assez pour des
// gerbes d'eclosion, des coeurs de caresse ou des bulles de bain.

const MAX = 240;

export function createParticles(scene) {
  const positions = new Float32Array(MAX * 3);
  const colors = new Float32Array(MAX * 3);
  const velocities = new Float32Array(MAX * 3);
  const life = new Float32Array(MAX);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.09,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  let cursor = 0;
  const color = new THREE.Color();

  function burst(origin, count = 30, hex = 0x6fe3c4, power = 2.4) {
    color.set(hex);
    for (let i = 0; i < count; i += 1) {
      const idx = cursor % MAX;
      cursor += 1;
      positions[idx * 3] = origin.x;
      positions[idx * 3 + 1] = origin.y;
      positions[idx * 3 + 2] = origin.z;
      const a = Math.random() * Math.PI * 2;
      const up = 0.4 + Math.random();
      velocities[idx * 3] = Math.cos(a) * Math.random() * power;
      velocities[idx * 3 + 1] = up * power;
      velocities[idx * 3 + 2] = Math.sin(a) * Math.random() * power;
      colors[idx * 3] = color.r;
      colors[idx * 3 + 1] = color.g;
      colors[idx * 3 + 2] = color.b;
      life[idx] = 1;
    }
  }

  function update(dt) {
    let alive = false;
    for (let i = 0; i < MAX; i += 1) {
      if (life[i] <= 0) {
        // Hors champ tant que la particule est morte
        positions[i * 3 + 1] = -999;
        continue;
      }
      alive = true;
      life[i] -= dt * 0.85;
      velocities[i * 3 + 1] -= 5.2 * dt;
      positions[i * 3] += velocities[i * 3] * dt;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    points.visible = alive;
  }

  return { burst, update, points };
}
