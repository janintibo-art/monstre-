import * as THREE from 'three';

// Effets visuels.
//
// Les particules precedentes etaient des carres uniformes en blending additif :
// lisibles, mais toutes identiques. Ici chaque type a sa forme dessinee au
// canvas, sa rotation propre, sa courbe de taille et son degrade de couleur sur
// la duree de vie. Un cœur ne doit pas tomber comme une miette, et une bulle de
// savon ne doit pas scintiller comme une etincelle.
//
// Tout est genere par code : aucune image a fournir.

/* ------------------------------------------------------------- textures */

function canvas(size = 128) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return [c, c.getContext('2d')];
}

function toTexture(c) {
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const SHAPES = {
  // Halo doux : la base de tout ce qui brille.
  glow() {
    const [c, ctx] = canvas();
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return toTexture(c);
  },

  // Etincelle a quatre branches, plus nerveuse qu'un simple point.
  spark() {
    const [c, ctx] = canvas();
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 26);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineCap = 'round';
    [
      [64, 6, 64, 122],
      [6, 64, 122, 64]
    ].forEach(([x1, y1, x2, y2], i) => {
      ctx.lineWidth = i === 0 ? 6 : 5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    return toTexture(c);
  },

  heart() {
    const [c, ctx] = canvas();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(64, 108);
    ctx.bezierCurveTo(14, 74, 20, 30, 48, 28);
    ctx.bezierCurveTo(60, 27, 64, 38, 64, 44);
    ctx.bezierCurveTo(64, 38, 68, 27, 80, 28);
    ctx.bezierCurveTo(108, 30, 114, 74, 64, 108);
    ctx.fill();
    return toTexture(c);
  },

  // Bulle : un anneau et un reflet, pas un disque plein.
  bubble() {
    const [c, ctx] = canvas();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(64, 64, 48, 0, Math.PI * 2);
    ctx.stroke();
    const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 48);
    g.addColorStop(0, 'rgba(255,255,255,0.05)');
    g.addColorStop(1, 'rgba(255,255,255,0.22)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.ellipse(46, 44, 12, 8, -0.6, 0, Math.PI * 2);
    ctx.fill();
    return toTexture(c);
  },

  // Eclat a quatre pointes fines, pour la magie.
  star() {
    const [c, ctx] = canvas();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    const pts = 4;
    for (let i = 0; i < pts * 2; i += 1) {
      const angle = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 60 : 13;
      const x = 64 + Math.cos(angle) * r;
      const y = 64 + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    return toTexture(c);
  },

  // Miette : une forme irreguliere, opaque, qui doit lire comme de la matiere.
  crumb() {
    const [c, ctx] = canvas(64);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    const n = 7;
    for (let i = 0; i < n; i += 1) {
      const angle = (i / n) * Math.PI * 2;
      const r = 16 + Math.sin(i * 2.3) * 7;
      const x = 32 + Math.cos(angle) * r;
      const y = 32 + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    return toTexture(c);
  },

  zzz() {
    const [c, ctx] = canvas();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 96px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Z', 64, 66);
    return toTexture(c);
  }
};

/* ------------------------------------------------------------ presets */

// Chaque effet decrit une intention, pas seulement des chiffres : la gravite,
// la trainee et les degrades sont regles pour que la matiere soit reconnaissable
// avant meme qu'on lise la couleur.
export const EFFECTS = {
  hatchBurst: {
    shape: 'spark',
    count: 46,
    life: [0.7, 1.4],
    speed: [3.4, 6.4],
    spread: 'sphere',
    gravity: -7,
    drag: 1.4,
    size: [0.55, 0.05],
    colorStart: 0xfff3c4,
    colorEnd: 0xff9d4a,
    spin: 6,
    additive: true
  },
  hatchDust: {
    shape: 'glow',
    count: 30,
    life: [0.9, 1.8],
    speed: [1.2, 2.6],
    spread: 'disc',
    gravity: -0.4,
    drag: 2.2,
    size: [0.7, 1.4],
    colorStart: 0xffe6b0,
    colorEnd: 0x6fe3c4,
    spin: 0.6,
    additive: true
  },
  shards: {
    shape: 'crumb',
    count: 22,
    life: [1.1, 1.8],
    speed: [2.2, 4.2],
    spread: 'sphere',
    gravity: -11,
    drag: 0.3,
    size: [0.3, 0.26],
    colorStart: 0xf3e3c2,
    colorEnd: 0xbfa77e,
    spin: 9,
    additive: false
  },
  eat: {
    shape: 'crumb',
    count: 16,
    life: [0.5, 0.9],
    speed: [0.8, 2.1],
    spread: 'cone',
    gravity: -9,
    drag: 0.6,
    size: [0.16, 0.1],
    colorStart: 0xffcf8a,
    colorEnd: 0xa5713a,
    spin: 12,
    additive: false
  },
  chomp: {
    shape: 'star',
    count: 8,
    life: [0.3, 0.5],
    speed: [1.4, 2.6],
    spread: 'sphere',
    gravity: 0,
    drag: 3,
    size: [0.34, 0.02],
    colorStart: 0xffffff,
    colorEnd: 0xffd27a,
    spin: 4,
    additive: true
  },
  hearts: {
    shape: 'heart',
    count: 10,
    life: [1.1, 1.7],
    speed: [0.5, 1.1],
    spread: 'cone',
    gravity: 1.6, // ils montent
    drag: 1.1,
    size: [0.28, 0.42],
    colorStart: 0xff9dc0,
    colorEnd: 0xff5f95,
    spin: 1.4,
    additive: false
  },
  bubbles: {
    shape: 'bubble',
    count: 20,
    life: [1.2, 2.2],
    speed: [0.6, 1.4],
    spread: 'sphere',
    gravity: 1.1,
    drag: 1.5,
    size: [0.22, 0.5],
    colorStart: 0xdff6ff,
    colorEnd: 0x8fd4ff,
    spin: 0.8,
    additive: false
  },
  sparkleTrail: {
    shape: 'star',
    count: 4,
    life: [0.4, 0.8],
    speed: [0.3, 0.9],
    spread: 'sphere',
    gravity: 0.4,
    drag: 2.4,
    size: [0.2, 0.02],
    colorStart: 0xffffff,
    colorEnd: 0x8fe8ff,
    spin: 3,
    additive: true
  },
  growth: {
    shape: 'glow',
    count: 40,
    life: [1, 1.9],
    speed: [0.8, 1.8],
    spread: 'column',
    gravity: 2.6,
    drag: 1,
    size: [0.35, 0.8],
    colorStart: 0xe6d4ff,
    colorEnd: 0xa98bff,
    spin: 1,
    additive: true
  },
  sleep: {
    shape: 'zzz',
    count: 1,
    life: [2.2, 2.8],
    speed: [0.25, 0.45],
    spread: 'cone',
    gravity: 0.5,
    drag: 0.9,
    size: [0.16, 0.4],
    colorStart: 0xcfe0ff,
    colorEnd: 0x6a7fb0,
    spin: 0.5,
    additive: false
  },
  eggGlow: {
    shape: 'glow',
    count: 3,
    life: [0.6, 1.1],
    speed: [0.4, 1.1],
    spread: 'sphere',
    gravity: 0.8,
    drag: 1.6,
    size: [0.18, 0.02],
    colorStart: 0xfff0c0,
    colorEnd: 0xff8f4a,
    spin: 2,
    additive: true
  }
};

/* ------------------------------------------------------------- systeme */

const VERTEX = `
  attribute float aSize;
  attribute float aAngle;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying float vAngle;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vAngle = aAngle;
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (340.0 / max(0.001, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = `
  uniform sampler2D map;
  varying float vAngle;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    // Rotation du sprite autour de son centre : sans elle, toutes les miettes
    // tomberaient dans la meme orientation.
    vec2 uv = gl_PointCoord - 0.5;
    float c = cos(vAngle);
    float s = sin(vAngle);
    uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y) + 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
    vec4 tex = texture2D(map, uv);
    if (tex.a < 0.02) discard;
    gl_FragColor = vec4(vColor * tex.rgb, tex.a * vAlpha);
  }
`;

const CAPACITY = 260;

function createPool(scene, texture, additive) {
  const positions = new Float32Array(CAPACITY * 3);
  const colors = new Float32Array(CAPACITY * 3);
  const sizes = new Float32Array(CAPACITY);
  const angles = new Float32Array(CAPACITY);
  const alphas = new Float32Array(CAPACITY);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: { map: { value: texture } },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = additive ? 2 : 1;
  scene.add(points);

  return {
    points,
    geometry,
    positions,
    colors,
    sizes,
    angles,
    alphas,
    data: new Array(CAPACITY).fill(null),
    cursor: 0
  };
}

export function createVfx(scene, { reducedMotion = false } = {}) {
  const textures = {};
  const pools = {};

  function pool(shape, additive) {
    const key = `${shape}:${additive ? 'add' : 'norm'}`;
    if (!pools[key]) {
      if (!textures[shape]) textures[shape] = SHAPES[shape]();
      pools[key] = createPool(scene, textures[shape], additive);
    }
    return pools[key];
  }

  const tmpColor = new THREE.Color();
  const startColor = new THREE.Color();
  const endColor = new THREE.Color();

  function emit(name, origin, options = {}) {
    const preset = EFFECTS[name];
    if (!preset) return;

    const p = pool(preset.shape, preset.additive);
    // Mouvements reduits : moitie moins de particules, et aucun flash.
    const density = reducedMotion ? 0.5 : 1;
    const count = Math.round((options.count || preset.count) * (options.scale || 1) * density);
    startColor.setHex(options.colorStart || preset.colorStart);
    endColor.setHex(options.colorEnd || preset.colorEnd);
    const speedScale = options.speedScale || 1;
    const radius = options.radius || 0;

    for (let i = 0; i < count; i += 1) {
      const index = p.cursor % CAPACITY;
      p.cursor += 1;

      const speed =
        (preset.speed[0] + Math.random() * (preset.speed[1] - preset.speed[0])) * speedScale;
      let vx = 0;
      let vy = 0;
      let vz = 0;
      let ox = 0;
      let oy = 0;
      let oz = 0;

      if (preset.spread === 'sphere') {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        vx = Math.sin(phi) * Math.cos(theta) * speed;
        vy = Math.cos(phi) * speed;
        vz = Math.sin(phi) * Math.sin(theta) * speed;
      } else if (preset.spread === 'cone') {
        const theta = Math.random() * Math.PI * 2;
        const spread = 0.45;
        vx = Math.cos(theta) * spread * speed;
        vy = speed;
        vz = Math.sin(theta) * spread * speed;
      } else if (preset.spread === 'disc') {
        const theta = Math.random() * Math.PI * 2;
        vx = Math.cos(theta) * speed;
        vy = Math.random() * 0.3 * speed;
        vz = Math.sin(theta) * speed;
      } else if (preset.spread === 'column') {
        const theta = Math.random() * Math.PI * 2;
        const r = 0.35 + Math.random() * 0.45;
        ox = Math.cos(theta) * r;
        oz = Math.sin(theta) * r;
        vy = speed;
        // Rotation autour de l'axe : la colonne tourne au lieu de monter droit.
        vx = -Math.sin(theta) * speed * 0.7;
        vz = Math.cos(theta) * speed * 0.7;
      }

      if (radius) {
        const theta = Math.random() * Math.PI * 2;
        ox += Math.cos(theta) * radius * Math.random();
        oz += Math.sin(theta) * radius * Math.random();
      }

      const life = preset.life[0] + Math.random() * (preset.life[1] - preset.life[0]);

      p.data[index] = {
        x: origin.x + ox,
        y: origin.y + oy,
        z: origin.z + oz,
        vx,
        vy,
        vz,
        life,
        maxLife: life,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 2 * preset.spin,
        size0: preset.size[0],
        size1: preset.size[1],
        gravity: preset.gravity,
        drag: preset.drag,
        r0: startColor.r,
        g0: startColor.g,
        b0: startColor.b,
        r1: endColor.r,
        g1: endColor.g,
        b1: endColor.b
      };
    }
  }

  function update(dt) {
    Object.keys(pools).forEach((key) => {
      const p = pools[key];
      let alive = false;

      for (let i = 0; i < CAPACITY; i += 1) {
        const d = p.data[i];
        if (!d) {
          p.alphas[i] = 0;
          continue;
        }

        d.life -= dt;
        if (d.life <= 0) {
          p.data[i] = null;
          p.alphas[i] = 0;
          continue;
        }
        alive = true;

        const drag = Math.max(0, 1 - d.drag * dt);
        d.vx *= drag;
        d.vz *= drag;
        d.vy = d.vy * drag + d.gravity * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.z += d.vz * dt;
        d.angle += d.spin * dt;

        const t = 1 - d.life / d.maxLife;
        // Apparition rapide, extinction longue : c'est ce qui donne l'impression
        // d'un impact suivi d'une retombee, plutot que d'un simple clignotement.
        const alpha = t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88;

        p.positions[i * 3] = d.x;
        p.positions[i * 3 + 1] = d.y;
        p.positions[i * 3 + 2] = d.z;
        p.sizes[i] = d.size0 + (d.size1 - d.size0) * t;
        p.angles[i] = d.angle;
        p.alphas[i] = Math.max(0, alpha);
        p.colors[i * 3] = d.r0 + (d.r1 - d.r0) * t;
        p.colors[i * 3 + 1] = d.g0 + (d.g1 - d.g0) * t;
        p.colors[i * 3 + 2] = d.b0 + (d.b1 - d.b0) * t;
      }

      p.geometry.attributes.position.needsUpdate = true;
      p.geometry.attributes.aColor.needsUpdate = true;
      p.geometry.attributes.aSize.needsUpdate = true;
      p.geometry.attributes.aAngle.needsUpdate = true;
      p.geometry.attributes.aAlpha.needsUpdate = true;
      p.points.visible = alive;
    });

    updateWaves(dt);
    updateBeam(dt);
  }

  /* ------------------------------------------------------ ondes de choc */

  // Anneaux plats qui s'elargissent au sol. Ils donnent l'echelle de l'impact,
  // ce qu'une gerbe de particules seule ne fait pas.
  const waves = [];
  const wavePool = [];

  function makeWave() {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.86, 1, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    mesh.renderOrder = 3;
    scene.add(mesh);
    return mesh;
  }

  function shockwave(position, { color = 0xffe9b0, size = 3.4, duration = 0.7, y = 0.03 } = {}) {
    const mesh = wavePool.pop() || makeWave();
    mesh.position.set(position.x, y, position.z);
    mesh.material.color.setHex(color);
    mesh.visible = true;
    waves.push({ mesh, t: 0, size, duration });
  }

  function updateWaves(dt) {
    for (let i = waves.length - 1; i >= 0; i -= 1) {
      const w = waves[i];
      w.t += dt;
      const k = w.t / w.duration;
      if (k >= 1) {
        w.mesh.visible = false;
        wavePool.push(w.mesh);
        waves.splice(i, 1);
        continue;
      }
      // Depart vif puis ralentissement : une onde qui s'elargit lineairement
      // a l'air mecanique.
      const eased = 1 - (1 - k) * (1 - k);
      w.mesh.scale.setScalar(0.25 + eased * w.size);
      w.mesh.material.opacity = (1 - k) * 0.75;
    }
  }

  /* ----------------------------------------------------------- faisceau */

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.2, 6, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfff2c8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
  );
  beam.visible = false;
  beam.renderOrder = 3;
  scene.add(beam);
  let beamTime = 0;
  let beamDuration = 0;

  function lightBeam(position, { color = 0xfff2c8, duration = 1.1 } = {}) {
    beam.position.set(position.x, position.y + 3, position.z);
    beam.material.color.setHex(color);
    beam.visible = true;
    beamTime = 0;
    beamDuration = duration;
  }

  function updateBeam(dt) {
    if (!beam.visible) return;
    beamTime += dt;
    const k = beamTime / beamDuration;
    if (k >= 1) {
      beam.visible = false;
      return;
    }
    // Il s'ouvre d'un coup puis s'etrangle : lecture d'une eclosion.
    const open = k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75;
    beam.scale.set(open, 1, open);
    beam.material.opacity = open * 0.55;
    beam.rotation.y += dt * 1.6;
  }

  /* -------------------------------------------------------------- flash */

  // Voile plein ecran en DOM : gratuit cote rendu, et il couvre l'interface
  // aussi bien que la scene, ce qu'un plan dans la scene ne ferait pas.
  let flashEl = document.getElementById('flash');
  if (!flashEl) {
    flashEl = document.createElement('div');
    flashEl.id = 'flash';
    flashEl.className = 'flash';
    document.body.appendChild(flashEl);
  }

  function flash(color = '#fff6d8', strength = 0.7, ms = 420) {
    if (reducedMotion) return;
    flashEl.style.transition = 'none';
    flashEl.style.background = color;
    flashEl.style.opacity = String(strength);
    requestAnimationFrame(() => {
      flashEl.style.transition = `opacity ${ms}ms ease-out`;
      flashEl.style.opacity = '0';
    });
  }

  return { emit, update, shockwave, lightBeam, flash, EFFECTS };
}
