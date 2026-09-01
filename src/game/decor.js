import * as THREE from 'three';
import { createRng } from '../core/rng.js';
import { loadModel } from './gltf.js';
import { TREE_MODEL } from './biomes.js';

// Les arbres qui entourent l'aire de jeu.
//
// Ils passent par un InstancedMesh : une seule geometrie, un seul appel de
// rendu, quel que soit leur nombre. Avec 56 000 triangles par arbre, les
// dupliquer en objets separes couterait bien plus cher sur telephone.
//
// Ils sont plantes sur un anneau, avec une trouee cote camera pour ne jamais
// masquer la creature.

const OPENING = 0.62; // demi-angle, en radians, de la trouee devant la camera

function firstMesh(object) {
  let found = null;
  object.traverse((child) => {
    if (!found && child.isMesh && child.geometry) found = child;
  });
  return found;
}

export function createDecor(scene) {
  let instanced = null;
  const swayers = [];

  function clear() {
    if (!instanced) return;
    scene.remove(instanced);
    instanced.geometry.dispose();
    instanced = null;
    swayers.length = 0;
  }

  async function build(biome, seed, base = import.meta.env.BASE_URL || './') {
    clear();
    const count = biome.trees || 0;
    if (!count) return;

    const gltf = await loadModel(base + TREE_MODEL);
    const source = gltf && firstMesh(gltf.scene);
    if (!source) return; // modele absent : la scene reste nue, sans planter

    // Mise a l'echelle : le modele arrive minuscule (12 cm de haut).
    source.updateWorldMatrix(true, false);
    const box = new THREE.Box3().setFromObject(source);
    const size = new THREE.Vector3();
    box.getSize(size);
    const unit = 1 / Math.max(size.y, 1e-6);

    const geometry = source.geometry.clone();
    geometry.applyMatrix4(source.matrixWorld);
    geometry.translate(0, -box.min.y, 0); // pied a l'origine

    const material = Array.isArray(source.material)
      ? source.material[0].clone()
      : source.material.clone();
    material.side = THREE.FrontSide;

    instanced = new THREE.InstancedMesh(geometry, material, count);
    instanced.castShadow = true;
    instanced.receiveShadow = false;
    instanced.frustumCulled = false;
    instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const rng = createRng(seed + 4242);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (let i = 0; i < count; i += 1) {
      // Angles repartis puis brouilles : ni alignement, ni tas.
      let angle = ((i + rng() * 0.6) / count) * Math.PI * 2;
      // On repousse hors de la trouee, sans changer le nombre d'arbres.
      const toFront = Math.atan2(Math.sin(angle), Math.cos(angle));
      if (Math.abs(toFront - Math.PI / 2) < OPENING) {
        angle += OPENING * 1.6;
      }

      const radius = 7 + rng() * 2.6;
      const height = (3.4 + rng() * 2.2) * unit;

      position.set(Math.cos(angle) * radius, -0.1, Math.sin(angle) * radius);
      quaternion.setFromEuler(new THREE.Euler(0, rng() * Math.PI * 2, 0));
      scale.set(height * (0.9 + rng() * 0.2), height, height * (0.9 + rng() * 0.2));
      matrix.compose(position, quaternion, scale);
      instanced.setMatrixAt(i, matrix);

      swayers.push({
        position: position.clone(),
        baseY: quaternion.clone(),
        scale: scale.clone(),
        phase: rng() * Math.PI * 2,
        amount: 0.012 + rng() * 0.018
      });
    }

    instanced.instanceMatrix.needsUpdate = true;
    scene.add(instanced);
  }

  // Balancement au vent. Sept arbres a recomposer par image, c'est negligeable,
  // et c'est ce qui empeche le decor d'avoir l'air peint.
  const matrix = new THREE.Matrix4();
  const tilt = new THREE.Quaternion();
  const axis = new THREE.Euler();

  function update(dt, time) {
    if (!instanced) return;
    for (let i = 0; i < swayers.length; i += 1) {
      const tree = swayers[i];
      const wind = Math.sin(time * 0.7 + tree.phase) * tree.amount;
      const gust = Math.sin(time * 1.9 + tree.phase * 1.7) * tree.amount * 0.4;
      axis.set(gust, 0, wind);
      tilt.setFromEuler(axis).premultiply(tree.baseY);
      matrix.compose(tree.position, tilt, tree.scale);
      instanced.setMatrixAt(i, matrix);
    }
    instanced.instanceMatrix.needsUpdate = true;
  }

  return { build, update, clear };
}
