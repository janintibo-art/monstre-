// Generateur pseudo-aleatoire deterministe.
// Meme graine => meme monstre. C'est ce qui rend l'oeuf reproductible et
// permet de reconstruire l'apparence a partir de la sauvegarde.

export function createRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return function rng() {
    // xorshift32
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}

export function range(rng, min, max) {
  return min + rng() * (max - min);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
