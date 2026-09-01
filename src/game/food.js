import * as THREE from 'three';
import { loadModel } from './gltf.js';
import { FOODS } from './food-catalog.js';

export { FOODS };

// Les repas.
//
// Jusqu'ici, nourrir la creature remplissait une jauge et lancait quelques
// miettes : rien n'apparaissait dans la scene. Ici, le plat est **pose au sol**,
// la creature le voit, s'en approche, le mange en trois bouchees, et la jauge
// ne monte qu'une fois le plat termine.
//
// Ca change deux choses. Le geste devient visible, et surtout il prend du temps
// — on regarde sa creature manger au lieu de voir un chiffre augmenter.

const BASE = 'assets/models/food/';

// Trois bouchees : assez pour qu'on voie le plat diminuer, assez peu pour ne pas
// immobiliser la creature trop longtemps.
const BITES = 3;
const BITE_DELAY = 0.55;
const REACH = 0.75; // distance a partir de laquelle elle peut manger

export function createKitchen(scene, { onArrive, onBite, onFinish } = {}) {
  const group = new THREE.Group();
  scene.add(group);

  let current = null; // { food, object, phase, ... }
  let lastId = null;

  function clear() {
    if (!current) return;
    group.remove(current.object);
    current = null;
  }

  // Choisit un plat au hasard, jamais deux fois le meme d'affilee : servir deux
  // burgers de suite casserait l'effet de decouverte.
  function pickFood() {
    const pool = FOODS.filter((f) => f.id !== lastId);
    const food = pool[Math.floor(Math.random() * pool.length)] || FOODS[0];
    lastId = food.id;
    return food;
  }

  async function serve(near, base = import.meta.env.BASE_URL || './') {
    clear();
    const food = pickFood();
    const gltf = await loadModel(base + BASE + food.file);
    if (!gltf) return null;

    // On clone : le meme plat peut etre resservi plus tard.
    const object = gltf.scene.clone(true);
    object.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.frustumCulled = false;
      }
    });

    // Mise a l'echelle depuis la boite englobante : les exports arrivent avec
    // des tailles tres variables, et un burger de trois metres serait ennuyeux.
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = food.height / Math.max(size.y, 1e-6);
    object.scale.setScalar(scale);
    object.position.set(0, -box.min.y * scale, 0);

    const holder = new THREE.Group();
    holder.add(object);

    // Devant la creature, un peu de cote : elle doit avoir a se deplacer, mais
    // pas traverser toute la scene.
    const angle = Math.random() * Math.PI * 2;
    const distance = 1.1 + Math.random() * 0.7;
    holder.position.set(
      (near ? near.x : 0) + Math.cos(angle) * distance,
      2.2, // il tombe du ciel
      (near ? near.z : 0) + Math.sin(angle) * distance
    );
    holder.rotation.y = Math.random() * Math.PI * 2;
    group.add(holder);

    current = {
      food,
      object: holder,
      inner: object,
      phase: 'falling',
      velocity: 0,
      bites: 0,
      timer: 0,
      baseScale: 1
    };
    return food;
  }

  function update(dt, time, monsterPosition) {
    if (!current) return;
    const item = current;
    const holder = item.object;

    if (item.phase === 'falling') {
      item.velocity -= 12 * dt;
      holder.position.y += item.velocity * dt;
      if (holder.position.y <= 0) {
        holder.position.y = 0;
        item.phase = 'waiting';
        item.timer = 0;
        if (onArrive) onArrive(item.food, holder.position, 'landed');
      }
      return;
    }

    if (item.phase === 'waiting') {
      // Il gigote sur place : ce sont des plats vivants, ils ne restent pas
      // sagement posés.
      item.timer += dt;
      holder.rotation.z = Math.sin(time * 3.2) * 0.06;
      holder.position.y = Math.abs(Math.sin(time * 2.4)) * 0.04;

      if (monsterPosition) {
        const distance = Math.hypot(
          monsterPosition.x - holder.position.x,
          monsterPosition.z - holder.position.z
        );
        if (distance < REACH) {
          item.phase = 'eating';
          item.timer = 0;
          if (onArrive) onArrive(item.food, holder.position, 'reached');
        }
      }

      // Personne ne vient : le plat s'en va tout seul plutot que de rester
      // planté là pour toujours.
      if (item.timer > 45) {
        clear();
      }
      return;
    }

    if (item.phase === 'eating') {
      item.timer += dt;
      // Secousses entre deux bouchees : le plat se debat un peu.
      holder.rotation.z = Math.sin(time * 22) * 0.12;

      if (item.timer >= BITE_DELAY) {
        item.timer = 0;
        item.bites += 1;
        if (onBite) onBite(item.food, holder.position, item.bites);

        if (item.bites >= BITES) {
          const food = item.food;
          const at = holder.position.clone();
          clear();
          if (onFinish) onFinish(food, at);
          return;
        }
        // Il rapetisse à chaque bouchée : on voit le repas avancer.
        item.baseScale = 1 - item.bites / BITES;
        item.inner.scale.multiplyScalar(item.baseScale > 0 ? 0.72 : 1);
      }
    }
  }

  return {
    serve,
    update,
    clear,
    get target() {
      // La creature ne se dirige vers le plat que s'il est pose et l'attend.
      if (!current || current.phase !== 'waiting') return null;
      return current.object.position;
    },
    get busy() {
      return Boolean(current) && current.phase === 'eating';
    },
    get hasFood() {
      return Boolean(current);
    }
  };
}
