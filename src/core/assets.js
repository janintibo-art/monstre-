import * as THREE from 'three';

// Manifeste des images. Depose tes fichiers dans public/assets/textures/
// avec exactement ces noms : ils seront pris en compte automatiquement.
// Si un fichier est absent, le jeu retombe sur une matiere generee par code,
// donc le projet tourne meme sans une seule image.
export const MANIFEST = {
  monsterSkin: 'assets/textures/monster_skin.png',
  monsterBelly: 'assets/textures/monster_belly.png',
  eggShell: 'assets/textures/egg_shell.png',
  ground: 'assets/textures/ground.png',
  sky: 'assets/textures/sky.png'
};

const loader = new THREE.TextureLoader();

function loadOne(url) {
  return new Promise((resolve) => {
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        resolve(texture);
      },
      undefined,
      () => resolve(null) // absent : on continue sans
    );
  });
}

// Chargement d'une texture isolee : sert aux sols de decor, choisis a la volee.
export function loadTexture(url) {
  return loadOne(url);
}

export async function loadTextures(base = import.meta.env.BASE_URL || './') {
  const keys = Object.keys(MANIFEST);
  const results = await Promise.all(keys.map((k) => loadOne(base + MANIFEST[k])));
  const out = {};
  keys.forEach((key, i) => {
    if (results[i]) out[key] = results[i];
  });
  return out;
}

// Degrade vertical genere en canvas : sert de ciel par defaut.
export function makeGradientTexture(top = '#1b2450', bottom = '#070a16') {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
