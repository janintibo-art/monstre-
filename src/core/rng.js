// Generateur pseudo-aleatoire deterministe.
// Meme graine => meme monstre. C'est ce qui rend l'oeuf reproductible et
// permet de reconstruire l'apparence a partir de la sauvegarde.

function step(state) {
  // xorshift32
  let s = state;
  s ^= s << 13;
  s >>>= 0;
  s ^= s >> 17;
  s ^= s << 5;
  s >>>= 0;
  return s;
}

// Les huit premieres iterations sont jetees.
//
// Sans ce rodage, xorshift32 renvoie une premiere valeur fortement correlee a
// la graine. Or les graines viennent de `Date.now()`, donc deux oeufs crees a
// quelques minutes d'intervalle avaient des graines voisines — et la meme
// espece, la meme couleur, le meme decor. Sur cinq especes, deux seulement
// sortaient jamais.
const WARMUP = 8;

export function createRng(seed = 1) {
  let s = seed >>> 0 || 1;
  for (let i = 0; i < WARMUP; i += 1) s = step(s);
  return function rng() {
    s = step(s);
    return s / 4294967296;
  };
}

// Version d'avant le rodage. Elle ne sert qu'a recalculer a l'identique ce qui
// a ete tire pour une creature existante : sa couleur et son paysage ne doivent
// pas changer parce qu'on a corrige un generateur.
export function createLegacyRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return function rng() {
    s = step(s);
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
