import * as THREE from 'three';
import { createRng } from '../core/rng.js';
import { loadModel } from './gltf.js';
import { DECOR_MODELS } from './biomes.js';

// Le decor qui entoure l'aire de jeu : arbres, plantes, champignons.
//
// Un InstancedMesh par modele : une seule geometrie et un seul appel de rendu,
// quel que soit le nombre d'exemplaires. Avec des modeles a 20 000 ou 48 000
// triangles, les dupliquer en objets separes couterait bien plus cher.
//
// Les elements sont plantes sur un anneau, avec une trouee cote camera pour ne
// jamais masquer la creature.

const OPENING = 0.7; // demi-angle, en radians, de la trouee devant la camera

function firstMesh(object) {
  let found = null;
  object.traverse((child) => {
    if (!found && child.isMesh && child.geometry) found = child;
  });
  return found;
}

export function createDecor(scene) {
  const groups = []; // { mesh, items:[...] }
  let landmark = null;

  function clear() {
    groups.forEach((g) => {
      scene.remove(g.mesh);
      g.mesh.geometry.dispose();
    });
    groups.length = 0;
    landmark = null;
  }

  async function build(biome, seed, base = import.meta.env.BASE_URL || './') {
    clear();
    const plan = biome.decor || [];
    if (!plan.length) return;

    const rng = createRng(seed + 4242);

    // On charge tous les modeles du decor avant de placer quoi que ce soit :
    // sinon les positions dependraient de l'ordre d'arrivee des fichiers et
    // changeraient d'une partie a l'autre malgre la graine.
    const loaded = await Promise.all(
      plan.map((entry) => loadModel(base + DECOR_MODELS[entry.model]))
    );

    plan.forEach((entry, planIndex) => {
      const gltf = loaded[planIndex];
      const source = gltf && firstMesh(gltf.scene);
      if (!source || !entry.count) return; // modele absent : on continue sans

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
      // On NE force PAS FrontSide.
      //
      // Ces modèles déclarent `doubleSided: true`, et pour une bonne raison :
      // moins de 60 % de leurs triangles sont orientés vers l'extérieur. La
      // simplification du maillage inverse le sens de certaines faces, ce que
      // le rendu ne peut pas deviner. En supprimant les faces arrière, on
      // effaçait donc près de la moitié du feuillage — d'où les trous par
      // lesquels on voyait le ciel.
      //
      // Le surcoût du double affichage est réel mais modeste ; un arbre troué
      // ne l'est pas.
      material.transparent = false;
      material.depthWrite = true;
      if (material.map) material.map.anisotropy = 16;

      const mesh = new THREE.InstancedMesh(geometry, material, entry.count);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      const items = [];

      for (let i = 0; i < entry.count; i += 1) {
        // Un repère — la maison — est posé à un endroit fixe, jamais au hasard :
        // la créature doit pouvoir y aller dormir, et le joueur doit le
        // retrouver au même endroit d'une fois sur l'autre.
        let angle = entry.landmark
          ? entry.angle || -0.9
          : ((i + rng() * 0.7) / entry.count) * Math.PI * 2 + planIndex * 0.9;

        if (!entry.landmark) {
          const front = Math.atan2(Math.sin(angle), Math.cos(angle));
          if (Math.abs(front - Math.PI / 2) < OPENING) angle += OPENING * 1.8;
        }

        const radius = entry.radius[0] + rng() * (entry.radius[1] - entry.radius[0]);
        const height = (entry.height[0] + rng() * (entry.height[1] - entry.height[0])) * unit;
        const altitude = entry.altitude
          ? entry.altitude[0] + rng() * (entry.altitude[1] - entry.altitude[0])
          : -0.05;

        position.set(Math.cos(angle) * radius, altitude, Math.sin(angle) * radius);
        quaternion.setFromEuler(new THREE.Euler(0, rng() * Math.PI * 2, 0));
        scale.set(height * (0.92 + rng() * 0.16), height, height * (0.92 + rng() * 0.16));
        matrix.compose(position, quaternion, scale);
        mesh.setMatrixAt(i, matrix);

        if (entry.landmark) {
          // Le point d'accueil se trouve devant la façade, entre la maison et
          // le centre de la scène : la créature s'y arrête au lieu d'entrer
          // dans le mur.
          landmark = {
            position: position.clone(),
            devant: new THREE.Vector3(
              Math.cos(angle) * (radius - 1.4),
              0,
              Math.sin(angle) * (radius - 1.4)
            )
          };
        }

        items.push({
          position: position.clone(),
          baseY: quaternion.clone(),
          scale: scale.clone(),
          orbit: entry.orbit || 0,
          derive: rng() * Math.PI * 2,
          rayon: radius,
          altitude,
          phase: rng() * Math.PI * 2,
          // Un champignon ne se balance pas comme un arbre : l'amplitude vient
          // du type de decor, pas d'une valeur unique pour tout le monde.
          amount: entry.sway * (0.7 + rng() * 0.6)
        });
      }

      mesh.instanceMatrix.needsUpdate = true;
      scene.add(mesh);
      groups.push({ mesh, items });
    });
  }

  const matrix = new THREE.Matrix4();
  const tilt = new THREE.Quaternion();
  const axis = new THREE.Euler();

  function update(dt, time) {
    groups.forEach((g) => {
      if (!g.items.length) return;
      for (let i = 0; i < g.items.length; i += 1) {
        const item = g.items[i];
        if (item.amount < 0.001 && !item.orbit) continue;

        // Les objets du ciel dérivent lentement autour de la scène et montent
        // et descendent : une île immobile aurait l'air posée sur un socle
        // invisible.
        if (item.orbit) {
          const a = item.derive + time * item.orbit;
          item.position.set(
            Math.cos(a) * item.rayon,
            item.altitude + Math.sin(time * 0.25 + item.phase) * 0.5,
            Math.sin(a) * item.rayon
          );
        }

        const wind = Math.sin(time * 0.7 + item.phase) * item.amount;
        const gust = Math.sin(time * 1.9 + item.phase * 1.7) * item.amount * 0.4;
        axis.set(gust, 0, wind);
        tilt.setFromEuler(axis).premultiply(item.baseY);
        matrix.compose(item.position, tilt, item.scale);
        g.mesh.setMatrixAt(i, matrix);
      }
      g.mesh.instanceMatrix.needsUpdate = true;
    });
  }

  return {
    build,
    update,
    clear,
    // Position d'accueil devant la maison, ou null si le décor n'en a pas.
    get home() {
      return landmark ? landmark.devant : null;
    }
  };
}
