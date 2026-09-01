import * as THREE from 'three';

// Le monde : un petit terrarium nocturne. Une seule lumiere directionnelle
// porte les ombres, le reste n'est que remplissage colore.

export function createWorld(canvas, textures = {}, biome = null) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b0f1e, 9, 26);

  // Ciel : un dome en degrade vertical. Deux uniformes de couleur suffisent a
  // le faire passer de la nuit a midi, image par image, sans rien redessiner.
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(0x101a3c) },
      bottom: { value: new THREE.Color(0x05070f) }
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 top;
      uniform vec3 bottom;
      varying vec3 vPos;
      void main() {
        float h = clamp(normalize(vPos).y * 0.5 + 0.5, 0.0, 1.0);
        gl_FragColor = vec4(mix(bottom, top, pow(h, 0.75)), 1.0);
      }
    `
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(45, 32, 16), skyMat);
  sky.frustumCulled = false;
  scene.add(sky);

  // Etoiles : un semis fixe qui s'efface au lever du jour.
  const starCount = 420;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    // Reparties sur la calotte superieure seulement : sous l'horizon, le sol
    // les masquerait de toute facon.
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.95);
    const r = 40;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi);
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      color: 0xdce9ff,
      size: 0.42,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false
    })
  );
  stars.frustumCulled = false;
  scene.add(stars);

  // L'astre : soleil ou lune selon l'heure, toujours dans l'axe de la lumiere.
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false })
  );
  sun.frustumCulled = false;
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 2.1, 5.4);

  const cameraTarget = new THREE.Vector3(0, 1, 0);
  camera.lookAt(cameraTarget);

  // --- Lumieres ---
  const hemi = new THREE.HemisphereLight(0x8fb6ff, 0x2a1f3d, 0.55);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfff1d8, 1.9);
  key.position.set(4, 7, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 20;
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0008;
  scene.add(key);

  const rim = new THREE.PointLight(0x6fe3c4, 12, 12, 2);
  rim.position.set(-2.4, 1.4, -2);
  scene.add(rim);

  // --- Sol ---
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x2a3358,
    roughness: 0.95,
    metalness: 0
  });
  if (textures.ground) {
    textures.ground.wrapS = THREE.RepeatWrapping;
    textures.ground.wrapT = THREE.RepeatWrapping;
    textures.ground.repeat.set(3, 3);
    groundMat.map = textures.ground;
    groundMat.color.set(0xffffff);
  }
  const ground = new THREE.Mesh(new THREE.CircleGeometry(6.5, 64), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Anneau lumineux qui delimite l'aire de jeu
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x6fe3c4,
    transparent: true,
    opacity: 0.28
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(6.2, 6.5, 64), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  scene.add(ring);

  // Applique un decor. Depuis l'ajout du cycle jour/nuit, la lumiere n'est plus
  // fixee ici : le decor ne fournit que son sol et sa couleur d'accent, l'heure
  // fait le reste. Sinon un decor imposerait une ambiance de nuit en plein midi.
  function applyBiome(next, groundTexture) {
    if (!next) return;
    if (groundTexture) {
      groundTexture.wrapS = THREE.RepeatWrapping;
      groundTexture.wrapT = THREE.RepeatWrapping;
      groundTexture.repeat.set(next.repeat || 3, next.repeat || 3);
      groundTexture.colorSpace = THREE.SRGBColorSpace;
      if (groundMat.map) groundMat.map.dispose();
      groundMat.map = groundTexture;
      groundMat.color.set(0xffffff);
      groundMat.needsUpdate = true;
    }
    ringMat.color.setHex(next.accent);
    rim.color.setHex(next.accent);
  }

  if (biome) applyBiome(biome, textures.ground || null);

  // --- Pointeur ---
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPoint = new THREE.Vector3();
  const parallax = { x: 0, y: 0 };

  function updatePointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    parallax.x = pointer.x;
    parallax.y = pointer.y;
  }

  // Position au sol visee par le pointeur, ou null si le rayon part vers le ciel.
  function groundPointFrom(clientX, clientY) {
    updatePointer(clientX, clientY);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.ray.intersectPlane(groundPlane, hitPoint);
    return hit ? hitPoint.clone() : null;
  }

  function objectsUnder(clientX, clientY, objects) {
    updatePointer(clientX, clientY);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(objects, true);
  }

  // Projection monde -> pixels ecran, pour poser la bulle de dialogue.
  const projected = new THREE.Vector3();
  function toScreen(vec3) {
    projected.copy(vec3).project(camera);
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((projected.x + 1) / 2) * rect.width + rect.left,
      y: ((1 - projected.y) / 2) * rect.height + rect.top,
      visible: projected.z < 1
    };
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function update(dt) {
    // Leger parallaxe : la camera suit mollement le pointeur.
    camera.position.x += (parallax.x * 0.6 - camera.position.x) * Math.min(dt * 1.6, 1);
    camera.position.y += (2.1 + parallax.y * 0.35 - camera.position.y) * Math.min(dt * 1.6, 1);
    camera.lookAt(cameraTarget);
    rim.intensity = 10 + Math.sin(performance.now() * 0.0012) * 3;
  }

  function render() {
    renderer.render(scene, camera);
  }

  // Tout ce que le cycle jour/nuit pilote, rassemble en un point.
  const env = { scene, fog: scene.fog, skyMat, stars, sun, hemi, key, rim, ringMat, groundMat };

  return {
    renderer,
    scene,
    camera,
    ground,
    env,
    applyBiome,
    update,
    render,
    resize,
    groundPointFrom,
    objectsUnder,
    toScreen
  };
}
