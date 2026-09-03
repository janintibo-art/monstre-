import * as THREE from 'three';
import { hauteurSol } from './terrain.js';
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

export function createDecor(scene, options = {}) {
  const groups = []; // { mesh, items:[...] }
  let landmark = null;
  let density = Number.isFinite(options.density) ? Math.max(0.4, Math.min(1.2, options.density)) : 1;
  let buildGeneration = 0;

  // La maison habitée : un filet de fumée à la cheminée, et une lueur chaude
  // aux fenêtres dès que le soir tombe. Deux détails minuscules qui changent
  // tout — une maison éteinte et sans fumée est un décor, une maison qui fume
  // est un lieu où quelqu'un vit.
  const FUMEE = 26;
  const fumeePos = new Float32Array(FUMEE * 3);
  const fumeeVie = new Float32Array(FUMEE);
  for (let i = 0; i < FUMEE; i += 1) fumeeVie[i] = Math.random();

  const fumeeGeo = new THREE.BufferGeometry();
  fumeeGeo.setAttribute('position', new THREE.BufferAttribute(fumeePos, 3));

  const fumeeCanvas = document.createElement('canvas');
  fumeeCanvas.width = 32;
  fumeeCanvas.height = 32;
  const fctx = fumeeCanvas.getContext('2d');
  const fgrad = fctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  fgrad.addColorStop(0, 'rgba(255,255,255,0.75)');
  fgrad.addColorStop(0.55, 'rgba(255,255,255,0.22)');
  fgrad.addColorStop(1, 'rgba(255,255,255,0)');
  fctx.fillStyle = fgrad;
  fctx.fillRect(0, 0, 32, 32);

  const fumee = new THREE.Points(
    fumeeGeo,
    new THREE.PointsMaterial({
      map: new THREE.CanvasTexture(fumeeCanvas),
      color: 0xbfc6d4,
      size: 0.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.34,
      depthWrite: false
    })
  );
  fumee.frustumCulled = false;
  fumee.visible = false;
  scene.add(fumee);

  // Lueur des fenêtres : une lampe chaude de faible portée, allumée la nuit.
  const lampe = new THREE.PointLight(0xffb765, 0, 7, 2);
  lampe.visible = false;
  scene.add(lampe);

  // Le feu de camp. Sa lumière vacille : une flamme d'intensité constante ne
  // ressemble à rien. Deux sinusoïdes de périodes incommensurables plus un
  // sursaut aléatoire, pour qu'aucune pulsation régulière ne se devine.
  const flamme = new THREE.PointLight(0xff8a3c, 0, 9, 2);
  flamme.visible = false;
  scene.add(flamme);

  const braises = { position: null, secousse: 0 };

  function disposeMaterial(material) {
    const list = Array.isArray(material) ? material : [material];
    list.filter(Boolean).forEach((m) => m.dispose());
  }

  function clear(cancelBuild = true) {
    if (cancelBuild) buildGeneration += 1;
    groups.forEach((g) => {
      scene.remove(g.mesh);
      g.mesh.geometry.dispose();
      // Les matériaux sont clonés pour chaque InstancedMesh. Les textures, elles,
      // viennent du cache GLTF et restent partagées : on libère donc le matériau
      // sans détruire sa map, sinon le prochain décor réutiliserait une texture
      // déjà invalidée côté GPU.
      disposeMaterial(g.mesh.material);
    });
    groups.length = 0;
    landmark = null;
    fumee.visible = false;
    lampe.visible = false;
    flamme.visible = false;
    braises.position = null;
  }

  async function build(biome, seed, base = import.meta.env.BASE_URL || './') {
    const mine = ++buildGeneration;
    clear(false);
    const plan = biome.decor || [];
    if (!plan.length) return;

    const rng = createRng(seed + 4242);

    // On charge tous les modeles du decor avant de placer quoi que ce soit :
    // sinon les positions dependraient de l'ordre d'arrivee des fichiers et
    // changeraient d'une partie a l'autre malgre la graine.
    const loaded = await Promise.all(
      plan.map((entry) => loadModel(base + DECOR_MODELS[entry.model]))
    );

    // Un autre build a pu démarrer pendant le chargement des GLB. Dans ce cas
    // celui-ci n'a plus le droit de poser quoi que ce soit dans la scène.
    if (mine !== buildGeneration) return false;

    plan.forEach((entry, planIndex) => {
      const gltf = loaded[planIndex];
      const source = gltf && firstMesh(gltf.scene);
      if (!source || !entry.count) return; // modele absent : on continue sans

      // Maison, feu et île restent toujours présents. Seule la végétation
      // répétée varie avec le niveau graphique.
      const critique = entry.landmark || entry.feu || entry.altitude;
      const count = critique ? entry.count : Math.max(1, Math.round(entry.count * density));

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

      const mesh = new THREE.InstancedMesh(geometry, material, count);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      const items = [];

      for (let i = 0; i < count; i += 1) {
        // Un repère — la maison — est posé à un endroit fixe, jamais au hasard :
        // la créature doit pouvoir y aller dormir, et le joueur doit le
        // retrouver au même endroit d'une fois sur l'autre.
        let angle = entry.landmark
          ? entry.angle || -0.9
          : ((i + rng() * 0.7) / count) * Math.PI * 2 + planIndex * 0.9;

        if (!entry.landmark) {
          const front = Math.atan2(Math.sin(angle), Math.cos(angle));
          if (Math.abs(front - Math.PI / 2) < OPENING) angle += OPENING * 1.8;
        }

        const radius = entry.radius[0] + rng() * (entry.radius[1] - entry.radius[0]);
        const height = (entry.height[0] + rng() * (entry.height[1] - entry.height[0])) * unit;
        const altitude = entry.altitude
          ? entry.altitude[0] + rng() * (entry.altitude[1] - entry.altitude[0])
          : -0.05;

        const px = Math.cos(angle) * radius;
        const pz = Math.sin(angle) * radius;
        // Les objets posés suivent le relief ; ceux du ciel gardent leur
        // altitude. Sans cela, un arbre du rang lointain flotterait au-dessus
        // d'un creux ou s'enfoncerait dans une bosse.
        const sol = entry.altitude ? altitude : hauteurSol(px, pz) - 0.05;
        position.set(px, sol, pz);
        // Rotation libre autour de la verticale, plus une inclinaison de
        // quelques degrés : rien ne pousse parfaitement droit, et un décor dont
        // tout est d'aplomb se repère immédiatement comme artificiel. La maison
        // et l'île y échappent — une maison de travers, c'est autre chose.
        const penche = entry.landmark || entry.altitude ? 0 : 0.13;
        quaternion.setFromEuler(
          new THREE.Euler(
            (rng() - 0.5) * penche,
            rng() * Math.PI * 2,
            (rng() - 0.5) * penche
          )
        );
        scale.set(height * (0.92 + rng() * 0.16), height, height * (0.92 + rng() * 0.16));
        matrix.compose(position, quaternion, scale);
        mesh.setMatrixAt(i, matrix);

        if (entry.feu) {
          flamme.visible = true;
          flamme.position.set(px, sol + height * 0.55, pz);
          braises.position = new THREE.Vector3(px, sol + height * 0.35, pz);
        }

        if (entry.landmark) {
          // Le point d'accueil se trouve devant la façade, entre la maison et
          // le centre de la scène : la créature s'y arrête au lieu d'entrer
          // dans le mur.
          fumee.visible = true;
          lampe.visible = true;
          // La cheminée sort du toit : on émet un peu au-dessus et de côté.
          fumee.userData.source = new THREE.Vector3(
            position.x - Math.cos(angle) * height * 0.18,
            height * 0.92,
            position.z - Math.sin(angle) * height * 0.18
          );
          lampe.position.set(
            position.x - Math.cos(angle) * 0.5,
            height * 0.35,
            position.z - Math.sin(angle) * 0.5
          );

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
    return mine === buildGeneration;
  }

  function setDensity(value) {
    density = Number.isFinite(value) ? Math.max(0.4, Math.min(1.2, value)) : 1;
  }

  const matrix = new THREE.Matrix4();
  const tilt = new THREE.Quaternion();
  const axis = new THREE.Euler();

  // Direction du vent. Elle tourne très lentement, sur plusieurs minutes.
  const VENT = new THREE.Vector2(1, 0.35).normalize();

  // Intensité de la lampe, pilotée par le cycle jour/nuit.
  function setNight(facteur) {
    lampe.intensity = facteur * 2.4;
    nuit = facteur;
  }

  let nuit = 0;

  function update(dt, time, monsterPosition = null) {
    // Le feu brûle jour et nuit, mais on ne le voit qu'au crépuscule : en plein
    // soleil, une lumière ponctuelle de plus ne se remarque pas et coûte pour
    // rien.
    if (flamme.visible) {
      braises.secousse += dt;
      const vacille =
        0.72 +
        0.18 * Math.sin(braises.secousse * 7.3) +
        0.12 * Math.sin(braises.secousse * 17.1 + 1.3);
      const sursaut = Math.random() < 0.04 ? 0.25 : 0;
      flamme.intensity = (0.55 + nuit * 2.6) * (vacille + sursaut);
    }

    // La fumée monte, s'incline dans le vent et s'évase en montant.
    if (fumee.visible && fumee.userData.source) {
      const src = fumee.userData.source;
      const pos = fumeeGeo.attributes.position.array;
      for (let i = 0; i < FUMEE; i += 1) {
        fumeeVie[i] += dt * 0.16;
        if (fumeeVie[i] > 1) fumeeVie[i] -= 1;
        const v = fumeeVie[i];
        const large = v * 1.1;
        pos[i * 3] = src.x + Math.sin(v * 5 + i) * large * 0.5 + v * 1.4;
        pos[i * 3 + 1] = src.y + v * 3.4;
        pos[i * 3 + 2] = src.z + Math.cos(v * 4 + i * 1.7) * large * 0.5 + v * 0.5;
      }
      fumeeGeo.attributes.position.needsUpdate = true;
    }

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

        // Le vent est une VAGUE qui traverse la scène, pas un balancement
        // propre à chaque plante. Le déphasage dépend de la position le long de
        // la direction du vent : les objets se couchent les uns après les
        // autres, et l'on voit la rafale passer.
        const long = item.position.x * VENT.x + item.position.z * VENT.y;
        const vague = time * 1.05 - long * 0.35;
        const wind = Math.sin(vague + item.phase * 0.25) * item.amount;
        const gust = Math.sin(vague * 2.3 + item.phase * 0.4) * item.amount * 0.45;

        // Le décor s'écarte au passage de la créature. C'est le détail qui fait
        // qu'elle habite le monde au lieu de glisser dessus.
        let ecartX = 0;
        let ecartZ = 0;
        if (monsterPosition) {
          const dx = item.position.x - monsterPosition.x;
          const dz = item.position.z - monsterPosition.z;
          const d2 = dx * dx + dz * dz;
          if (d2 < 2.6) {
            const force = (1 - d2 / 2.6) * 0.5;
            const d = Math.sqrt(d2) || 1;
            ecartZ += (dx / d) * force;
            ecartX -= (dz / d) * force;
          }
        }

        axis.set(gust + ecartX, 0, wind + ecartZ);
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
    setNight,
    setDensity,
    // Position d'accueil devant la maison, ou null si le décor n'en a pas.
    get home() {
      return landmark ? landmark.devant : null;
    }
  };
}
