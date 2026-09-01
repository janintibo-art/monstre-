// Memoire du monstre : une file d'evenements recents + des compteurs cumules.
// C'est ce qui lui permet de dire "tu ne m'as pas nourri depuis ce matin"
// ou de developper une preference pour le jeu si tu joues souvent.

const MAX_EVENTS = 60;

export function createMemory() {
  return { events: [], stats: {}, lastCareAt: Date.now() };
}

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

// 0 = tout va bien, 1 = abandonne depuis longtemps.
export function neglectScore(memory) {
  return Math.min(1, hoursSinceCare(memory) / 12);
}

// L'action que le joueur repete le plus : le monstre finit par l'attendre.
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
