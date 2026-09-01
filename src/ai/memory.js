import { extractFacts } from './facts.js';

// Memoire de la creature. Trois couches, qui ne servent pas a la meme chose :
//
//   events    — les gestes recents (nourri, joue, lave). Court terme, sert au
//               score de negligence et aux habitudes.
//   facts     — ce qu'elle sait de toi : prenom, gouts, projets. Long terme,
//               avec une force qui monte quand tu le repetes et qui retombe
//               quand tu n'en parles plus.
//   dialogue  — le fil des echanges, pour repondre dans la continuite.
//
// Et surtout : elle oublie. Un souvenir jamais reactive s'efface. C'est ce qui
// rend le fait qu'elle se souvienne significatif — si elle retenait tout pour
// toujours, se souvenir ne voudrait rien dire.

const MAX_EVENTS = 60;
const MAX_FACTS = 40;
const MAX_DIALOGUE = 40;
const MAX_MOMENTS = 30;

const DAY = 86400000;

// Vitesse d'oubli, en points de force perdus par jour.
const DECAY = { volatile: 0.9, normal: 0.22, name: 0.05 };
const FORGET_BELOW = 0.18;

export function createMemory() {
  return {
    version: 2,
    events: [],
    stats: {},
    lastCareAt: Date.now(),
    facts: [],
    dialogue: [],
    moments: [],
    metAt: Date.now()
  };
}

// Les anciennes sauvegardes n'ont pas les nouveaux champs : on les complete au
// chargement plutot que de forcer un nouveau depart.
export function ensureMemory(memory) {
  if (!memory) return createMemory();
  const base = createMemory();
  Object.keys(base).forEach((key) => {
    if (memory[key] === undefined) memory[key] = base[key];
  });
  memory.version = 2;
  return memory;
}

/* ------------------------------------------------------------------ gestes */

export function remember(memory, type, payload = {}) {
  memory.events.push({ t: Date.now(), type, ...payload });
  if (memory.events.length > MAX_EVENTS) memory.events.shift();
  memory.stats[type] = (memory.stats[type] || 0) + 1;
  if (type !== 'neglect') memory.lastCareAt = Date.now();
  return memory;
}

export function countSince(memory, type, ms) {
  const since = Date.now() - ms;
  return memory.events.filter((e) => e.type === type && e.t >= since).length;
}

export function hoursSinceCare(memory) {
  return (Date.now() - (memory.lastCareAt || Date.now())) / 3600000;
}

export function neglectScore(memory) {
  return Math.min(1, hoursSinceCare(memory) / 12);
}

export function favouriteCare(memory) {
  const care = ['feed', 'play', 'wash', 'pet'];
  let best = null;
  let bestCount = 0;
  care.forEach((type) => {
    const n = memory.stats[type] || 0;
    if (n > bestCount) {
      bestCount = n;
      best = type;
    }
  });
  return bestCount >= 3 ? best : null;
}

/* ------------------------------------------------------------------- faits */

function decayRate(fact) {
  if (fact.kind === 'name') return DECAY.name;
  return fact.volatile ? DECAY.volatile : DECAY.normal;
}

// Force actuelle d'un souvenir, apres oubli. Ne modifie rien : c'est une
// lecture, l'effacement se fait dans consolidate().
export function factStrength(fact, now = Date.now()) {
  const days = (now - (fact.lastSeenAt || fact.createdAt || now)) / DAY;
  return fact.strength - decayRate(fact) * days;
}

// Range un fait. S'il est deja connu, il se renforce au lieu d'etre duplique —
// et sa valeur est mise a jour, parce qu'un demenagement doit pouvoir ecraser
// l'ancienne adresse.
export function learn(memory, fact) {
  const now = Date.now();
  const existing = memory.facts.find((f) => f.key === fact.key);

  if (existing) {
    existing.strength = Math.min(3, factStrength(existing, now) + 0.7);
    existing.lastSeenAt = now;
    existing.count = (existing.count || 1) + 1;
    existing.value = fact.value;
    existing.text = fact.text;
    return { fact: existing, isNew: false };
  }

  const created = {
    key: fact.key,
    kind: fact.kind,
    value: fact.value,
    text: fact.text,
    volatile: Boolean(fact.volatile),
    strength: 1,
    count: 1,
    createdAt: now,
    lastSeenAt: now
  };
  memory.facts.push(created);

  // Si la memoire deborde, c'est le souvenir le plus faible qui saute.
  if (memory.facts.length > MAX_FACTS) {
    memory.facts.sort((a, b) => factStrength(b, now) - factStrength(a, now));
    memory.facts.length = MAX_FACTS;
  }
  return { fact: created, isNew: true };
}

// Apprend tout ce qu'un message contient. Renvoie les faits vraiment nouveaux,
// pour que la creature puisse reagir a ce qu'elle vient d'apprendre.
export function learnFrom(memory, message) {
  const learned = [];
  extractFacts(message).forEach((fact) => {
    const { fact: stored, isNew } = learn(memory, fact);
    if (isNew) learned.push(stored);
  });
  return learned;
}

export function forget(memory, key) {
  memory.facts = memory.facts.filter((f) => f.key !== key);
  return memory;
}

// Efface ce qui est tombe sous le seuil. A appeler de temps en temps, pas a
// chaque image.
export function consolidate(memory, now = Date.now()) {
  const before = memory.facts.length;
  memory.facts = memory.facts.filter((f) => factStrength(f, now) > FORGET_BELOW);
  return before - memory.facts.length;
}

export function knownFacts(memory, now = Date.now()) {
  return [...memory.facts]
    .map((f) => ({ ...f, current: factStrength(f, now) }))
    .filter((f) => f.current > FORGET_BELOW)
    .sort((a, b) => b.current - a.current);
}

export function playerName(memory) {
  const fact = memory.facts.find((f) => f.kind === 'name');
  return fact && factStrength(fact) > FORGET_BELOW ? fact.value : null;
}

// Un fait au hasard parmi les mieux ancres, pour une remarque spontanee.
export function randomFact(memory, kinds = null) {
  const pool = knownFacts(memory).filter((f) => !kinds || kinds.includes(f.kind));
  if (!pool.length) return null;
  const top = pool.slice(0, 6);
  return top[Math.floor(Math.random() * top.length)];
}

/* -------------------------------------------------------------- dialogue */

export function recordSpeech(memory, who, text) {
  memory.dialogue.push({ t: Date.now(), who, text: String(text).slice(0, 240) });
  if (memory.dialogue.length > MAX_DIALOGUE) memory.dialogue.shift();
  return memory;
}

export function lastExchanges(memory, count = 6) {
  return memory.dialogue.slice(-count);
}

/* -------------------------------------------------------------- moments */

export function recordMoment(memory, kind, text) {
  memory.moments.push({ t: Date.now(), kind, text });
  if (memory.moments.length > MAX_MOMENTS) memory.moments.shift();
  return memory;
}

export function daysTogether(memory) {
  return Math.floor((Date.now() - (memory.metAt || Date.now())) / DAY);
}

/* --------------------------------------------------------------- resume */

// Resume compact destine au modele de langage distant. Volontairement court :
// c'est ce qui compte, pas tout ce qu'elle sait.
export function digest(memory, limit = 8) {
  const lines = [];
  const name = playerName(memory);
  if (name) lines.push(`Ton humain s'appelle ${name}.`);

  knownFacts(memory)
    .filter((f) => f.kind !== 'name')
    .slice(0, limit)
    .forEach((f) => lines.push(f.text));

  const days = daysTogether(memory);
  if (days >= 1) lines.push(`Vous vous connaissez depuis ${days} jour(s).`);

  const recent = memory.moments.slice(-3);
  recent.forEach((m) => lines.push(m.text));

  return lines;
}
