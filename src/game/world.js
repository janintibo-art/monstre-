import * as THREE from 'three';

// Le monde : un petit terrarium nocturne. Une seule lumiere directionnelle
// porte les ombres, le reste n'est que remplissage colore.

export function createWorld(canvas, textures = {}, biome = null) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Courbe tonale filmique. Sans elle, les couleurs saturent et s'écrasent dès
  // qu'une lumière forte les touche : le vert de la prairie devenait un aplat
  // fluorescent. La courbe comprime les hautes lumières au lieu de les couper,
  // ce qui rend les matières et fait ressortir le relief.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  // Filtrage anisotrope au maximum de ce que la carte accepte. C'est ce qui
  // évite qu'un sol vu de biais tourne à la bouillie scintillante.
  const anisotropie = renderer.capabilities.getMaxAnisotropy();

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
      bottom: { value: new THREE.Color(0x05070f) },
      // Halo autour du soleil et frange lumineuse au ras de l'horizon. Sans
      // eux, le ciel n'est qu'un dégradé à deux couleurs : lisible, mais plat
      // à toute heure. Ce sont eux qui font un lever de soleil.
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      sunColor: { value: new THREE.Color(0xffffff) },
      sunPower: { value: 0 }
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
      uniform vec3 sunDir;
      uniform vec3 sunColor;
      uniform float sunPower;
      varying vec3 vPos;
      void main() {
        vec3 dir = normalize(vPos);
        float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 base = mix(bottom, top, pow(h, 0.75));

        // Halo : un noyau serré pour le disque, une nappe large pour la
        // diffusion dans l'atmosphère.
        float d = max(dot(dir, normalize(sunDir)), 0.0);
        float halo = pow(d, 24.0) * 0.9 + pow(d, 3.0) * 0.28;

        // Frange claire juste au-dessus de la ligne d'horizon, là où l'air est
        // le plus épais. Elle donne la profondeur qui manque à un dégradé nu.
        float frange = pow(1.0 - abs(dir.y), 9.0) * 0.22;

        gl_FragColor = vec4(base + sunColor * (halo + frange) * sunPower, 1.0);
      }
    `
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24), skyMat);
  sky.frustumCulled = false;
  scene.add(sky);

  // Bande d'horizon.
  //
  // Un cylindre ouvert, vu de l'intérieur, portant DEUX images fondues l'une
  // dans l'autre selon l'heure : matin, midi, soir. C'est plus juste qu'une
  // silhouette teintée — la lumière rasante du matin et celle du couchant ne
  // se déduisent pas d'une même image par un filtre.
  //
  // Le haut des images est transparent : le dôme de ciel et les étoiles
  // apparaissent au travers.
  const horizonMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    // Pas de brouillard : c'est un fond, pas un objet de la scène. Le laisser
    // se noyer dans la brume reviendrait à l'effacer.
    fog: false,
    uniforms: {
      mapA: { value: null },
      mapB: { value: null },
      melange: { value: 0 },
      teinte: { value: new THREE.Color(1, 1, 1) },
      presence: { value: 0 },
      // Couleur de la brume, pour fondre le bas du paysage dans la distance
      // au lieu de le poser sur le sol par une ligne nette.
      brume: { value: new THREE.Color(0x0b0f1e) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D mapA;
      uniform sampler2D mapB;
      uniform float melange;
      uniform vec3 teinte;
      uniform float presence;
      varying vec2 vUv;
      void main() {
        vec4 a = texture2D(mapA, vUv);
        vec4 b = texture2D(mapB, vUv);
        vec4 c = mix(a, b, melange);
        if (c.a < 0.01) discard;

        // La courbe tonale délave le fond : on lui rend un peu de saturation
        // avant de l'envoyer, sinon le paysage lointain paraît terne à côté du
        // décor proche, qui bénéficie de la lumière directe.
        float luma = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
        vec3 vive = mix(vec3(luma), c.rgb, 1.25);
        vive *= teinte;

        // Le pied du paysage se noie dans la brume : sans cela, la base du
        // relief tranche net sur le sol, comme un décor découpé et posé là.
        //
        // Les bornes de smoothstep doivent aller en CROISSANT. Écrites à
        // l'envers, la spécification GLSL déclare le résultat indéfini : selon
        // le pilote, la fonction renvoie 1 partout, et c'est toute la bande qui
        // se noie dans la brume au lieu de son seul pied. Pour inverser, on
        // soustrait à 1, on n'échange pas les bornes.
        float bas = 1.0 - smoothstep(0.02, 0.30, vUv.y);
        vive = mix(vive, brume, bas * 0.8);

        gl_FragColor = vec4(vive, c.a * presence);
      }
    `
  });

  // Quatre répétitions autour du cylindre, et une hauteur qui respecte le
  // rapport 4:1 des images. La hauteur perçue du paysage ne dépend que de ce
  // nombre : à trois, il occupait 47 % de l'écran et écrasait la scène ; à
  // quatre, 36 %, ce qui laisse respirer le ciel.
  const HORIZON_RAYON = 30;
  const HORIZON_REPET = 4;
  const HORIZON_HAUT = (2 * Math.PI * HORIZON_RAYON) / HORIZON_REPET / 4;

  const horizon = new THREE.Mesh(
    new THREE.CylinderGeometry(HORIZON_RAYON, HORIZON_RAYON, HORIZON_HAUT, 64, 1, true),
    horizonMat
  );
  // Le bas du cylindre passe légèrement sous le sol : aucune fente ne peut
  // apparaître entre les deux.
  horizon.position.y = HORIZON_HAUT / 2 - 1;
  horizon.frustumCulled = false;
  horizon.renderOrder = -1;
  horizon.visible = false;
  scene.add(horizon);

  // Applique les trois images d'un décor. Elles sont répétées trois fois autour
  // du cylindre : une seule fois, l'image serait étirée de façon grotesque ;
  // trois fois, le rapport hauteur/largeur retombe juste et l'on n'en voit
  // jamais deux copies à la fois dans le champ.
  function setHorizon(textures) {
    const valides = textures && textures.matin && textures.midi && textures.soir;
    horizon.visible = Boolean(valides);
    if (!valides) return;
    ['matin', 'midi', 'soir'].forEach((moment) => {
      const texture = textures[moment];
      texture.wrapS = THREE.RepeatWrapping;
      texture.repeat.set(HORIZON_REPET, 1);
      texture.anisotropy = anisotropie;
      texture.colorSpace = THREE.SRGBColorSpace;
    });
    horizonMat.userData.textures = textures;
    horizonMat.uniforms.mapA.value = textures.midi;
    horizonMat.uniforms.mapB.value = textures.midi;
    horizonMat.uniforms.presence.value = 1;
  }

  // Etoiles : un semis fixe qui s'efface au lever du jour.
  const starCount = 420;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    // Reparties sur la calotte superieure seulement : sous l'horizon, le sol
    // les masquerait de toute facon.
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.95);
    const r = 52;
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

  // Sur un ecran de telephone tenu verticalement, le champ horizontal est
  // minuscule : avec 42 degres en vertical et un rapport de 0,46, il ne reste
  // qu'une vingtaine de degres en largeur. A 5,5 unites de distance, cela fait
  // moins d'un metre de part et d'autre du centre. D'ou une aire de jeu calculee
  // depuis le cadrage reel, et non fixee en dur.
  const playBounds = { x: 1.8, z: 2.8 };
  const focus = new THREE.Vector3(0, 0, 0);
  const focusTarget = new THREE.Vector3(0, 0, 0);
  const FOLLOW = 0.55; // part du deplacement repercutee sur la camera

  function setFocus(vec) {
    focusTarget.set(vec.x, 0, vec.z);
  }

  // Secousse de camera. Elle retombe vite : au-dela d'une demi-seconde, ce n'est
  // plus un impact, c'est un tremblement de terre.
  let shakeAmount = 0;
  function shake(amount = 0.25) {
    shakeAmount = Math.min(0.6, shakeAmount + amount);
  }

  // --- Lumieres ---
  const hemi = new THREE.HemisphereLight(0x8fb6ff, 0x2a1f3d, 0.55);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfff1d8, 1.9);
  key.position.set(4, 7, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -9;
  key.shadow.camera.right = 9;
  key.shadow.camera.top = 9;
  key.shadow.camera.bottom = -9;
  key.shadow.bias = -0.0004;
  // Décale le point de test le long de la normale : supprime les rayures
  // d'ombre sur les surfaces éclairées de biais, sans creuser le contact.
  key.shadow.normalBias = 0.03;
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
    textures.ground.repeat.set(12, 12);
    textures.ground.anisotropy = anisotropie;
    groundMat.map = textures.ground;
    groundMat.color.set(0xffffff);
  }

  // Le sol est bien plus large que l'aire de jeu : à 6,5 unités, son bord
  // dessinait une courbe nette au milieu de l'image, comme une petite planète.
  // À 26, le bord passe derrière le décor et l'horizon.
  const ground = new THREE.Mesh(new THREE.CircleGeometry(26, 96), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Anneau lumineux qui delimite l'aire de jeu
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x6fe3c4,
    transparent: true,
    opacity: 0.28
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(5.4, 5.7, 96), ringMat);
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
      // Le motif se répète quatre fois plus qu'avant sur un sol quatre fois
      // plus large : la densité de texels reste la même, le carrelage se voit
      // moins parce que chaque dalle est plus petite à l'écran.
      const dalles = (next.repeat || 3) * 4;
      groundTexture.repeat.set(dalles, dalles);
      groundTexture.anisotropy = anisotropie;
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

    // Angle de vue fixe. Le jeu est verrouille en paysage, ou la largeur
    // visible depasse neuf unites : il n'y a plus rien a compenser, et ouvrir
    // l'angle ne ferait que rapetisser la creature pour rien.
    const distance = Math.hypot(camera.position.y - 1, camera.position.z);
    const halfWidth = distance * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;

    // La camera suit une partie du deplacement, donc la creature peut s'ecarter
    // davantage que la demi-largeur brute sans sortir du cadre. Le plafond la
    // garde sur le sol et a portee de regard.
    playBounds.x = Math.min(4, Math.max(1.4, (halfWidth / (1 - FOLLOW)) * 0.7));
    playBounds.z = 3;
  }

  // Ramene un point dans l'aire visible. Utilise aussi bien pour les cibles de
  // deplacement que pour la position reelle de la creature : si l'ecran pivote,
  // l'aire retrecit d'un coup et il faut pouvoir la faire rentrer.
  function clampToArena(vec, margin = 1) {
    const over = Math.hypot(vec.x / (playBounds.x * margin), vec.z / (playBounds.z * margin));
    if (over > 1) {
      vec.x /= over;
      vec.z /= over;
    }
    return vec;
  }
  window.addEventListener('resize', resize);
  // Sur Android, le redimensionnement suit parfois la rotation avec un retard :
  // on repasse un coup apres coup pour ne pas rester sur l'ancien cadrage.
  window.addEventListener('orientationchange', () => {
    resize();
    setTimeout(resize, 250);
  });
  resize();

  function update(dt) {
    // La camera suit la creature, avec du retard : elle ne peut plus sortir du
    // cadre, et le mouvement reste doux au lieu d'etre colle a elle.
    focus.lerp(focusTarget, Math.min(dt * 2.2, 1));

    const motion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1;
    const wantedX = parallax.x * 0.35 * motion + focus.x * FOLLOW;
    const wantedY = 2.1 + parallax.y * 0.3 * motion;
    camera.position.x += (wantedX - camera.position.x) * Math.min(dt * 2.2, 1);
    camera.position.y += (wantedY - camera.position.y) * Math.min(dt * 1.6, 1);

    if (shakeAmount > 0.001) {
      shakeAmount = Math.max(0, shakeAmount - dt * 1.8);
      const k = shakeAmount * shakeAmount; // decroissance perçue plus naturelle
      camera.position.x += (Math.random() - 0.5) * k * 2;
      camera.position.y += (Math.random() - 0.5) * k * 2;
    }

    cameraTarget.set(focus.x * 0.85, 1, focus.z * 0.35);
    camera.lookAt(cameraTarget);
  }

  function render() {
    renderer.render(scene, camera);
  }

  // Tout ce que le cycle jour/nuit pilote, rassemble en un point.
  const env = {
    scene,
    fog: scene.fog,
    skyMat,
    stars,
    sun,
    hemi,
    key,
    rim,
    ringMat,
    groundMat,
    horizonMat
  };

  return {
    renderer,
    scene,
    camera,
    ground,
    env,
    setHorizon,
    playBounds,
    clampToArena,
    setFocus,
    shake,
    applyBiome,
    update,
    render,
    resize,
    groundPointFrom,
    objectsUnder,
    toScreen
  };
}
