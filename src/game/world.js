import * as THREE from 'three';
import { hauteurSol } from './terrain.js';
import { qualityPreset } from './quality.js';

// Le monde : un petit terrarium nocturne. Une seule lumiere directionnelle
// porte les ombres, le reste n'est que remplissage colore.

export function createWorld(canvas, textures = {}, biome = null, options = {}) {
  const mouvementsReduits = Boolean(options.reducedMotion);
  let qualityLevel = options.quality || 'normal';
  let quality = qualityPreset(qualityLevel);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatio));
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
      sunPower: { value: 0 },
      // Nuages calculés, sans image : ils dérivent et changent de forme, et
      // prennent la couleur de l'heure. Le ciel de midi était le moment le
      // plus vide de la journée.
      nuageTemps: { value: 0 },
      nuageCouleur: { value: new THREE.Color(0xffffff) },
      nuageForce: { value: 0.35 }
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
      uniform float nuageTemps;
      uniform vec3 nuageCouleur;
      uniform float nuageForce;
      varying vec3 vPos;

      // Bruit de valeur classique : haché, lissé, puis empilé sur quatre
      // octaves. C'est le minimum pour obtenir des masses nuageuses plutôt
      // qu'un damier, et cela tient en quelques lignes sans aucune texture.
      float hache(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float bruit(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hache(i), hache(i + vec2(1.0, 0.0)), f.x),
          mix(hache(i + vec2(0.0, 1.0)), hache(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      float nuages(vec2 p) {
        float somme = 0.0;
        float poids = 0.5;
        for (int i = 0; i < 4; i += 1) {
          somme += bruit(p) * poids;
          p *= 2.03;
          poids *= 0.5;
        }
        return somme;
      }

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
        vec3 couleur = base + sunColor * (halo + frange) * sunPower;

        // Les nuages ne sont dessinés qu'au-dessus de l'horizon. On projette la
        // direction sur un plan haut placé : les masses s'étirent naturellement
        // près de l'horizon, comme une voûte vue par en dessous.
        if (dir.y > 0.02) {
          vec2 uv = dir.xz / (dir.y + 0.22);
          float n = nuages(uv * 1.35 + vec2(nuageTemps * 0.012, nuageTemps * 0.004));
          float masse = smoothstep(0.52, 0.78, n);
          // Ils s'effacent au ras de l'horizon, sinon ils formeraient une
          // bande dure là où le paysage commence.
          masse *= smoothstep(0.02, 0.30, dir.y);
          couleur = mix(couleur, nuageCouleur, masse * nuageForce);
        }

        gl_FragColor = vec4(couleur, 1.0);
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
  // Les images fournies sont des **silhouettes en niveaux de gris** : aucune
  // couleur, une vingtaine de paliers qui correspondent aux plans de
  // profondeur — sombre au premier plan, clair au fond.
  //
  // Les afficher telles quelles donne une masse grise. Le gris est en réalité
  // une **clé de profondeur** : on le remappe entre deux couleurs fournies par
  // l'heure du jour, la teinte du premier plan et celle du lointain. Les
  // silhouettes proches restent sombres, les crêtes lointaines se fondent dans
  // le ciel — c'est la perspective atmosphérique, et elle suit le couchant
  // sans qu'on ait à redessiner quoi que ce soit.
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
      brume: { value: new THREE.Color(0x0b0f1e) },
      // Les deux bornes de la perspective atmosphérique.
      proche: { value: new THREE.Color(0x241a2e) },
      loin: { value: new THREE.Color(0xc98a5e) }
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
      uniform vec3 brume;
      uniform vec3 proche;
      uniform vec3 loin;
      varying vec2 vUv;
      void main() {
        vec4 a = texture2D(mapA, vUv);
        vec4 b = texture2D(mapB, vUv);
        vec4 c = mix(a, b, melange);
        if (c.a < 0.01) discard;

        // Le gris sert de clé de profondeur. Les images vont de 0,06 à 0,99 :
        // on étale cette plage sur toute la course entre les deux couleurs,
        // sinon une partie du dégradé serait inutilisée et tout se ressemblerait.
        float profondeur = clamp((dot(c.rgb, vec3(0.299, 0.587, 0.114)) - 0.06) / 0.93, 0.0, 1.0);

        // Exposant 2,0, et non 0,8.
        //
        // La masse d'un feuillage est en gris moyen : avec une courbe douce,
        // presque tout basculait vers la couleur du lointain, et l'on obtenait
        // une forêt orange sur un ciel orange. Une courbe accentuée réserve la
        // teinte lointaine aux seules crêtes les plus claires ; tout le reste
        // reste sombre et se détache.
        vec3 vive = mix(proche, loin, pow(profondeur, 2.0));
        vive *= teinte;

        // Le pied du paysage se noie dans la brume : sans cela, la base du
        // relief tranche net sur le sol, comme un décor découpé et posé là.
        //
        // Les bornes de smoothstep doivent aller en CROISSANT. Écrites à
        // l'envers, la spécification GLSL déclare le résultat indéfini : selon
        // le pilote, la fonction renvoie 1 partout, et c'est toute la bande qui
        // se noie dans la brume au lieu de son seul pied. Pour inverser, on
        // soustrait à 1, on n'échange pas les bornes.
        // La bande ne montre qu'un mince bandeau au-dessus du sol : à 0,30, le
        // fondu couvrait presque tout ce qu'on en voit. Ramené à 0,12.
        float bas = 1.0 - smoothstep(0.02, 0.12, vUv.y);
        vive = mix(vive, brume, bas * 0.7);

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
  // État du fond, consultable depuis les réglages. Un shader qui ne compile pas
  // ou une image absente ne produisent aucun message : sans ce compte rendu, la
  // seule façon de savoir est de regarder l'écran et de deviner.
  const horizonEtat = { images: 0, visible: false, shader: 'non compilé' };

  horizonMat.onBeforeCompile = () => {
    horizonEtat.shader = 'compilé';
  };

  function disposeHorizonTextures(set) {
    if (!set) return;
    const uniques = new Set(Object.values(set).filter(Boolean));
    uniques.forEach((texture) => texture.dispose());
  }

  function setHorizon(textures) {
    const noms = ['matin', 'midi', 'soir'];
    const previous = horizonMat.userData.textures;
    horizonEtat.images = noms.filter((n) => textures && textures[n]).length;
    const valides = horizonEtat.images === noms.length;
    horizon.visible = Boolean(valides);
    horizonEtat.visible = horizon.visible;

    if (!valides) {
      // Un chargement partiel ne doit pas rester en mémoire. L'ancien jeu de
      // textures est lui aussi libéré : le fond est masqué, donc plus rien ne
      // doit le retenir côté GPU.
      disposeHorizonTextures(previous);
      disposeHorizonTextures(textures);
      horizonMat.userData.textures = null;
      horizonMat.uniforms.mapA.value = null;
      horizonMat.uniforms.mapB.value = null;
      horizonMat.uniforms.presence.value = 0;
      return;
    }

    noms.forEach((moment) => {
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
    if (previous && previous !== textures) disposeHorizonTextures(previous);
  }

  // Ciel étoilé.
  //
  // Un semis uniforme de points identiques donne un ciel plat, qui ressemble à
  // du bruit. Un vrai ciel a trois propriétés qu'il faut reproduire :
  //
  //   1. **Des magnitudes très inégales.** Quelques étoiles franches, beaucoup
  //      de faibles. La distribution suit une puissance, pas un tirage plat.
  //   2. **Des couleurs.** Les étoiles ne sont pas blanches : elles vont du
  //      bleu au doré. C'est discret mais l'œil le remarque.
  //   3. **Une Voie lactée.** Une bande dense en travers du ciel. Sans elle, la
  //      répartition est trop régulière pour être crédible.
  //
  // Et elles scintillent, chacune à son rythme — le scintillement est fait par
  // le shader, donc rien à recalculer côté processeur.
  const starCount = 1400;
  const starPos = new Float32Array(starCount * 3);
  const starTaille = new Float32Array(starCount);
  const starTeinte = new Float32Array(starCount * 3);
  const starPhase = new Float32Array(starCount);

  // Plan de la Voie lactée : un grand cercle incliné en travers de la voûte.
  const laiteuseNormale = new THREE.Vector3(0.42, 0.72, -0.55).normalize();
  const dir = new THREE.Vector3();

  for (let i = 0; i < starCount; i += 1) {
    // Une étoile sur deux est tirée près du plan de la Voie lactée, l'autre
    // moitié au hasard sur la voûte.
    let attente = 0;
    do {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.97);
      dir.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
      attente += 1;
    } while (
      i % 2 === 0 &&
      attente < 12 &&
      Math.abs(dir.dot(laiteuseNormale)) > 0.16 + Math.random() * 0.12
    );

    const r = 52;
    starPos[i * 3] = dir.x * r;
    starPos[i * 3 + 1] = dir.y * r;
    starPos[i * 3 + 2] = dir.z * r;

    // Magnitude : une puissance quatre donne beaucoup de faibles et de rares
    // franches, comme un vrai ciel.
    const m = Math.pow(Math.random(), 4);
    starTaille[i] = 0.16 + m * 0.75;

    // Température : du bleu froid au doré, la plupart proches du blanc.
    const chaud = Math.pow(Math.random(), 2);
    starTeinte[i * 3] = 0.78 + chaud * 0.22;
    starTeinte[i * 3 + 1] = 0.84 + chaud * 0.1;
    starTeinte[i * 3 + 2] = 1.0 - chaud * 0.28;

    starPhase[i] = Math.random() * Math.PI * 2;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('taille', new THREE.BufferAttribute(starTaille, 1));
  starGeo.setAttribute('teinte', new THREE.BufferAttribute(starTeinte, 3));
  starGeo.setAttribute('phase', new THREE.BufferAttribute(starPhase, 1));

  const starMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      presence: { value: 0 },
      temps: { value: 0 },
      echelle: { value: 1 }
    },
    vertexShader: `
      attribute float taille;
      attribute vec3 teinte;
      attribute float phase;
      uniform float temps;
      uniform float echelle;
      varying vec3 vTeinte;
      varying float vEclat;
      void main() {
        vTeinte = teinte;
        // Scintillement : deux sinusoïdes de périodes incommensurables, pour
        // qu'aucune pulsation d'ensemble ne se fasse sentir.
        vEclat = 0.72 + 0.28 * sin(temps * 2.1 + phase) * sin(temps * 0.73 + phase * 1.7);
        vec4 vue = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = taille * echelle * (300.0 / -vue.z);
        gl_Position = projectionMatrix * vue;
      }
    `,
    fragmentShader: `
      uniform float presence;
      varying vec3 vTeinte;
      varying float vEclat;
      void main() {
        // Disque adouci : un point carré se voit immédiatement.
        vec2 d = gl_PointCoord - vec2(0.5);
        float r = length(d);
        if (r > 0.5) discard;
        float halo = pow(1.0 - r * 2.0, 1.6);
        gl_FragColor = vec4(vTeinte, halo * vEclat * presence);
      }
    `
  });

  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  stars.renderOrder = -2;
  scene.add(stars);

  // Étoiles filantes. Rares — une toutes les quarante secondes en moyenne —
  // parce qu'une étoile filante fréquente cesse d'être un événement.
  const filanteGeo = new THREE.BufferGeometry();
  filanteGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const filanteMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false
  });
  const filante = new THREE.Line(filanteGeo, filanteMat);
  filante.frustumCulled = false;
  scene.add(filante);

  const filanteEtat = { vie: 0, attente: 12 + Math.random() * 40 };

  function majFilante(dt, nuit) {
    if (nuit < 0.45) {
      filanteMat.opacity = 0;
      return;
    }
    if (filanteEtat.vie > 0) {
      filanteEtat.vie -= dt;
      // Elle apparaît vite et s'éteint lentement : c'est ce qui donne la traînée.
      filanteMat.opacity = Math.max(0, Math.sin(Math.min(1, filanteEtat.vie / 0.9) * Math.PI)) * nuit;
      return;
    }
    filanteMat.opacity = 0;
    filanteEtat.attente -= dt;
    if (filanteEtat.attente > 0) return;

    filanteEtat.attente = 20 + Math.random() * 45;
    filanteEtat.vie = 0.9;

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(0.25 + Math.random() * 0.6);
    const depart = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    ).multiplyScalar(50);
    const fin = depart
      .clone()
      .add(new THREE.Vector3(Math.random() - 0.5, -0.35 - Math.random() * 0.3, Math.random() - 0.5).multiplyScalar(14));

    const p = filanteGeo.attributes.position.array;
    p[0] = depart.x; p[1] = depart.y; p[2] = depart.z;
    p[3] = fin.x; p[4] = fin.y; p[5] = fin.z;
    filanteGeo.attributes.position.needsUpdate = true;
  }

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
  key.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
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
  // Variation de teinte à grande échelle, appliquée par couleurs de sommets.
  // La texture du sol se répète douze fois : sans cela, le motif se lit comme
  // un carrelage. Des taches lentes de clair et de sombre, bien plus larges
  // qu'une dalle, suffisent à le rompre.
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
  // Le disque est finement subdivisé pour porter le relief. 96 anneaux de 96
  // secteurs : assez pour que les ondulations soient lisses, assez peu pour ne
  // rien coûter — c'est un maillage statique, calculé une seule fois.
  //
  // Un anneau plutôt qu'un disque : `CircleGeometry` n'est qu'un éventail — un
  // centre et une seule couronne de sommets, donc rien à déplacer à
  // l'intérieur. `RingGeometry` avec un trou minuscule donne de vraies
  // couronnes concentriques.
  //
  // Le maillage est tourné de -90° autour de X : le local (x, y, z) devient le
  // monde (x, z, -y). La hauteur du monde se met donc dans le z local, et la
  // profondeur du monde vaut moins le y local.
  const groundGeo = new THREE.RingGeometry(0.02, 26, 96, 40);
  {
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, hauteurSol(x, -y));
    }
    pos.needsUpdate = true;
    groundGeo.computeVertexNormals();

    const teintes = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const v =
        0.88 +
        0.12 * Math.sin(x * 0.11 + y * 0.07) +
        0.06 * Math.cos(x * 0.05 - y * 0.13);
      teintes[i * 3] = v;
      teintes[i * 3 + 1] = v;
      teintes[i * 3 + 2] = v;
    }
    groundGeo.setAttribute('color', new THREE.BufferAttribute(teintes, 3));
  }
  groundMat.vertexColors = true;
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Brume basse en plusieurs nappes. Le brouillard global donne de la
  // profondeur aux objets, mais ne se voit pas dans les zones vides : le sol
  // semblait donc rejoindre l'horizon d'un seul bloc. Ces voiles translucides
  // occupent uniquement la périphérie de l'aire de jeu et dessinent de vrais
  // plans intermédiaires, sans gêner la créature au centre.
  const brumeMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: {
      temps: { value: 0 },
      couleur: { value: new THREE.Color(0x8aa6bd) },
      presence: { value: 0.18 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float temps;
      uniform vec3 couleur;
      uniform float presence;
      varying vec2 vUv;

      float hache(vec2 p) {
        return fract(sin(dot(p, vec2(41.7, 289.3))) * 45758.5453);
      }
      float bruit(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hache(i), hache(i + vec2(1.0, 0.0)), f.x),
                   mix(hache(i + vec2(0.0, 1.0)), hache(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      void main() {
        vec2 centre = vUv - 0.5;
        float rayon = length(centre) * 2.0;
        // Rien dans la clairière ; la nappe se lève doucement à mi-distance
        // puis s'efface avant le bord pour ne jamais former un disque visible.
        float masque = smoothstep(0.30, 0.58, rayon) * (1.0 - smoothstep(0.82, 1.0, rayon));
        vec2 derive = vUv * 7.0 + vec2(temps * 0.008, temps * 0.003);
        float n = bruit(derive) * 0.62 + bruit(derive * 2.07 + 3.1) * 0.38;
        float volutes = smoothstep(0.34, 0.78, n);
        gl_FragColor = vec4(couleur, masque * volutes * presence);
      }
    `
  });

  const brumes = new THREE.Group();
  [
    { taille: 42, y: 0.18, rotation: 0 },
    { taille: 48, y: 0.48, rotation: 1.9 }
  ].forEach((nappe) => {
    // Un anneau plutôt qu'un carré.
    //
    // Le masque du shader n'ouvre la nappe qu'entre 0,30 et 1,0 de la
    // demi-largeur : le disque central et les quatre coins sont entièrement
    // transparents, soit 29 % des pixels calculés pour rien. Ces voiles sont
    // vus de biais et couvrent une grande surface d'écran ; sur un téléphone,
    // ces 29 % se paient. La géométrie suit donc exactement le masque, à
    // rendu strictement identique.
    const demi = nappe.taille / 2;
    const geometrie = new THREE.RingGeometry(demi * 0.28, demi, 64, 3);
    // `RingGeometry` mappe ses UV sur le carré englobant, comme `PlaneGeometry` :
    // le calcul de rayon du shader reste valable tel quel.
    const voile = new THREE.Mesh(geometrie, brumeMat);
    voile.rotation.x = -Math.PI / 2;
    voile.rotation.z = nappe.rotation;
    voile.position.y = nappe.y;
    voile.renderOrder = 0;
    brumes.add(voile);
  });
  scene.add(brumes);

  // Anneau lumineux qui delimite l'aire de jeu
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x6fe3c4,
    transparent: true,
    // Le dégradé porte déjà l'atténuation : l'opacité générale reste haute,
    // sinon le halo disparaît.
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  // Une couronne nette lue à l'écran ressemble à une piste de course. On la
  // remplace par un halo dégradé, dessiné sur canvas : la clairière semble
  // simplement plus éclairée en son centre, sans qu'aucun trait ne la borde.
  const clairiereCanvas = document.createElement('canvas');
  clairiereCanvas.width = 128;
  clairiereCanvas.height = 128;
  const cctx = clairiereCanvas.getContext('2d');
  const cgrad = cctx.createRadialGradient(64, 64, 10, 64, 64, 64);
  cgrad.addColorStop(0, 'rgba(255,255,255,0.30)');
  cgrad.addColorStop(0.55, 'rgba(255,255,255,0.12)');
  cgrad.addColorStop(0.86, 'rgba(255,255,255,0.04)');
  cgrad.addColorStop(1, 'rgba(255,255,255,0)');
  cctx.fillStyle = cgrad;
  cctx.fillRect(0, 0, 128, 128);
  ringMat.map = new THREE.CanvasTexture(clairiereCanvas);

  const ring = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  ring.renderOrder = 1;
  scene.add(ring);

  // Poussières lumineuses / lucioles : le monde continue de respirer même
  // lorsque le monstre est immobile. Budget réduit pour rester fluide sur les
  // téléphones modestes.
  const moteCount = 92;
  const motePositions = new Float32Array(moteCount * 3);
  const moteOrigins = new Float32Array(moteCount * 3);
  const motePhase = new Float32Array(moteCount);
  for (let i = 0; i < moteCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.4 + Math.sqrt(Math.random()) * 8.8;
    const p = i * 3;
    moteOrigins[p] = Math.cos(angle) * radius;
    moteOrigins[p + 1] = 0.25 + Math.random() * 3.8;
    moteOrigins[p + 2] = Math.sin(angle) * radius;
    motePositions[p] = moteOrigins[p];
    motePositions[p + 1] = moteOrigins[p + 1];
    motePositions[p + 2] = moteOrigins[p + 2];
    motePhase[i] = Math.random() * Math.PI * 2;
  }
  const moteCanvas = document.createElement('canvas');
  moteCanvas.width = 48;
  moteCanvas.height = 48;
  const moteCtx = moteCanvas.getContext('2d');
  const moteGradient = moteCtx.createRadialGradient(24, 24, 0, 24, 24, 24);
  moteGradient.addColorStop(0, 'rgba(255,255,255,1)');
  moteGradient.addColorStop(0.18, 'rgba(255,255,255,.92)');
  moteGradient.addColorStop(0.5, 'rgba(255,255,255,.2)');
  moteGradient.addColorStop(1, 'rgba(255,255,255,0)');
  moteCtx.fillStyle = moteGradient;
  moteCtx.fillRect(0, 0, 48, 48);
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const moteScintille = new Float32Array(moteCount);
  for (let i = 0; i < moteCount; i += 1) moteScintille[i] = Math.random();
  moteGeometry.setAttribute('scintille', new THREE.BufferAttribute(moteScintille, 1));

  const moteMaterial = new THREE.PointsMaterial({
    color: biome ? biome.accent : 0x6fe3c4,
    map: new THREE.CanvasTexture(moteCanvas),
    size: 0.13,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true
  });

  // Comportement propre au décor : le pollen monte, les feuilles tombent, le
  // sable file au vent. Trois nombres suffisent à changer complètement la
  // sensation d'un lieu.
  const moteReglage = { chute: -0.02, tourbillon: 0.6, taille: 0.13 };
  const motes = new THREE.Points(moteGeometry, moteMaterial);
  motes.renderOrder = 2;
  motes.frustumCulled = false;
  scene.add(motes);

  function setQuality(level) {
    qualityLevel = level || 'normal';
    quality = qualityPreset(qualityLevel);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatio));
    key.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
    // Three.js ne recrée pas toujours la cible d'ombre après un changement de
    // taille. La libérer ici force une reconstruction propre à l'image suivante.
    if (key.shadow.map) {
      key.shadow.map.dispose();
      key.shadow.map = null;
    }
    skyMat.uniforms.nuageForce.value = quality.cloudStrength;
    moteGeometry.setDrawRange(0, Math.max(8, Math.round(moteCount * quality.particleScale)));
    starGeo.setDrawRange(0, Math.max(360, Math.round(starCount * (0.58 + quality.particleScale * 0.42))));
    resize();
    return qualityLevel;
  }

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

    const p = next.particules;
    moteMaterial.color.setHex(p ? p.couleur : next.accent);
    moteReglage.chute = p ? p.chute : -0.02;
    moteReglage.tourbillon = p ? p.tourbillon : 0.6;
    // Une feuille se voit, un grain de pollen à peine.
    moteReglage.taille = p && p.forme === 'feuille' ? 0.22 : p && p.forme === 'sable' ? 0.1 : 0.14;
    moteMaterial.size = moteReglage.taille;
  }

  if (biome) applyBiome(biome, textures.ground || null);
  setQuality(qualityLevel);

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

  let horlogeMotes = 0;
  let respiration = 0;

  function update(dt) {
    // La camera suit la creature, avec du retard : elle ne peut plus sortir du
    // cadre, et le mouvement reste doux au lieu d'etre colle a elle.
    focus.lerp(focusTarget, Math.min(dt * 2.2, 1));
    brumeMat.uniforms.temps.value += mouvementsReduits ? 0 : dt;

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

    // La caméra respire. Une amplitude minuscule — deux centimètres — mais
    // une caméra parfaitement immobile est le signe le plus sûr qu'on regarde
    // une image et non une scène. En mouvements réduits, elle se fige.
    if (!mouvementsReduits) {
      respiration += dt;
      camera.position.x += Math.sin(respiration * 0.31) * 0.02;
      camera.position.y += Math.sin(respiration * 0.23 + 1.4) * 0.015;
    }

    cameraTarget.set(focus.x * 0.85, 1, focus.z * 0.35);
    camera.lookAt(cameraTarget);

    // Les poussières dérivent avec l'horloge du jeu, pas celle du navigateur :
    // elles s'arrêtent donc si la boucle s'arrête, au lieu de continuer seules.
    // En mouvements réduits, elles restent en place et se contentent de luire.
    if (mouvementsReduits) return;
    horlogeMotes += dt;
    const t = horlogeMotes;
    const tourbillon = moteReglage.tourbillon;
    const positions = moteGeometry.attributes.position.array;
    for (let i = 0; i < moteCount; i += 1) {
      const p = i * 3;
      const phase = motePhase[i];

      // Dérive verticale continue, avec reprise en boucle : une feuille qui
      // tombe recommence en haut, un pollen qui monte redescend en bas.
      let hauteur = moteOrigins[p + 1] - moteReglage.chute * t;
      const span = 4.2;
      hauteur = ((hauteur - 0.15) % span + span) % span + 0.15;

      positions[p] = moteOrigins[p] + Math.sin(t * 0.19 * tourbillon + phase) * 0.32 * tourbillon;
      positions[p + 1] = hauteur + Math.sin(t * 0.42 + phase * 1.7) * 0.18;
      positions[p + 2] = moteOrigins[p + 2] + Math.cos(t * 0.16 * tourbillon + phase * 0.8) * 0.28 * tourbillon;
    }
    moteGeometry.attributes.position.needsUpdate = true;
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
    starMat,
    majFilante,
    sun,
    hemi,
    key,
    rim,
    ringMat,
    groundMat,
    brumeMat,
    horizonMat,
    moteMaterial
  };

  return {
    renderer,
    scene,
    camera,
    ground,
    env,
    setHorizon,
    horizonEtat,
    playBounds,
    clampToArena,
    setFocus,
    shake,
    applyBiome,
    setQuality,
    get qualityLevel() {
      return qualityLevel;
    },
    update,
    render,
    resize,
    groundPointFrom,
    objectsUnder,
    toScreen
  };
}
