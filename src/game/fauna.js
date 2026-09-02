import * as THREE from 'three';

// La petite faune.
//
// Quelques papillons près du sol, quelques oiseaux en altitude. Ils ne servent
// à rien et c'est exactement le point : un monde où seule la créature bouge est
// un monde qui l'attend. Un papillon qui traverse sans s'occuper de personne
// donne l'impression que la scène existait avant qu'on arrive.
//
// Tout est dessiné sur canvas et affiché en points : aucun modèle, aucune
// texture à charger, et le coût reste celui d'un seul objet de rendu.

// Les papillons vaquent le jour, les oiseaux passent surtout au lever et au
// coucher, comme les vrais.
const PAPILLONS = 7;
const OISEAUX = 5;

function silhouette(dessiner) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  dessiner(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function textureAile() {
  return silhouette((ctx) => {
    ctx.fillStyle = '#ffffff';
    // Deux ailes arrondies et un corps fin : à la taille où on les voit, la
    // silhouette compte, pas le détail.
    ctx.beginPath();
    ctx.ellipse(22, 26, 15, 18, -0.4, 0, Math.PI * 2);
    ctx.ellipse(42, 26, 15, 18, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(24, 44, 10, 12, -0.3, 0, Math.PI * 2);
    ctx.ellipse(40, 44, 10, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(31, 20, 2, 28);
  });
}

function textureOiseau() {
  return silhouette((ctx) => {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    // La mouette stylisée : deux arcs. C'est la forme que l'œil lit comme
    // « oiseau » à n'importe quelle distance.
    ctx.beginPath();
    ctx.moveTo(8, 40);
    ctx.quadraticCurveTo(20, 22, 32, 36);
    ctx.quadraticCurveTo(44, 22, 56, 40);
    ctx.stroke();
  });
}

export function createFauna(scene) {
  const total = PAPILLONS + OISEAUX;
  const positions = new Float32Array(total * 3);
  const tailles = new Float32Array(total);
  const bestioles = [];

  function replacer(i, premier = false) {
    const oiseau = i >= PAPILLONS;
    const angle = Math.random() * Math.PI * 2;
    const rayon = oiseau ? 16 + Math.random() * 8 : 3 + Math.random() * 6;

    bestioles[i] = {
      oiseau,
      angle,
      rayon,
      // Les oiseaux tournent lentement et haut, les papillons flânent bas.
      vitesse: (oiseau ? 0.09 + Math.random() * 0.05 : 0.22 + Math.random() * 0.3) * (Math.random() < 0.5 ? -1 : 1),
      hauteur: oiseau ? 7 + Math.random() * 4 : 0.6 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      // Une bestiole n'est visible qu'une partie du temps : elle entre et sort
      // du champ, ce qui vaut mieux qu'un ballet permanent.
      vie: premier ? Math.random() * 18 : 0,
      duree: oiseau ? 16 + Math.random() * 14 : 22 + Math.random() * 20
    };
    tailles[i] = oiseau ? 1.1 : 0.5;
  }

  for (let i = 0; i < total; i += 1) replacer(i, true);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('taille', new THREE.BufferAttribute(tailles, 1));

  const materiau = (texture, couleur) =>
    new THREE.PointsMaterial({
      map: texture,
      color: couleur,
      size: 0.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      alphaTest: 0.02
    });

  // Deux nuages de points : les papillons et les oiseaux n'ont ni la même
  // image ni la même couleur.
  const papillonsGeo = new THREE.BufferGeometry();
  papillonsGeo.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, PAPILLONS * 3), 3));
  const oiseauxGeo = new THREE.BufferGeometry();
  oiseauxGeo.setAttribute('position', new THREE.BufferAttribute(positions.subarray(PAPILLONS * 3), 3));

  const matPapillons = materiau(textureAile(), 0xffd9f2);
  matPapillons.size = 0.34;
  const matOiseaux = materiau(textureOiseau(), 0x2a2f45);
  matOiseaux.size = 0.9;
  matOiseaux.opacity = 0.6;

  const papillons = new THREE.Points(papillonsGeo, matPapillons);
  const oiseaux = new THREE.Points(oiseauxGeo, matOiseaux);
  papillons.frustumCulled = false;
  oiseaux.frustumCulled = false;
  scene.add(papillons);
  scene.add(oiseaux);

  function setBiome(biome) {
    if (biome && biome.accent) matPapillons.color.setHex(biome.accent).lerp(new THREE.Color(0xffffff), 0.5);
  }

  function update(dt, time, nuit = 0, monsterPosition = null) {
    // La nuit, les papillons se posent et les oiseaux rentrent.
    matPapillons.opacity = 0.85 * (1 - nuit);
    matOiseaux.opacity = 0.6 * (1 - nuit * 0.85);
    papillons.visible = nuit < 0.95;
    oiseaux.visible = nuit < 0.85;

    for (let i = 0; i < total; i += 1) {
      const b = bestioles[i];
      b.vie += dt;
      if (b.vie > b.duree) replacer(i);

      b.angle += b.vitesse * dt;

      let x = Math.cos(b.angle) * b.rayon;
      let z = Math.sin(b.angle) * b.rayon;
      let y = b.hauteur + Math.sin(time * (b.oiseau ? 0.7 : 2.6) + b.phase) * (b.oiseau ? 0.5 : 0.35);

      // Les papillons sont attirés par la créature, sans jamais l'atteindre :
      // ils tournent autour d'elle à distance.
      if (!b.oiseau && monsterPosition) {
        const dx = monsterPosition.x - x;
        const dz = monsterPosition.z - z;
        const d = Math.hypot(dx, dz);
        if (d > 1.2 && d < 7) {
          x += (dx / d) * 0.55;
          z += (dz / d) * 0.55;
        }
      }

      // Fondu à l'entrée et à la sortie, pour que rien n'apparaisse ni ne
      // disparaisse d'un coup.
      const p = i * 3;
      positions[p] = x;
      positions[p + 1] = y;
      positions[p + 2] = z;
    }

    papillonsGeo.attributes.position.needsUpdate = true;
    oiseauxGeo.attributes.position.needsUpdate = true;
  }

  return { update, setBiome };
}
