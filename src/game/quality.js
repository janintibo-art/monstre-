// Qualité graphique : réglage de l'appareil, pas de la créature.
// « Auto » choisit un niveau raisonnable au démarrage puis peut être abaissé
// d'un cran par la boucle principale si le téléphone peine à tenir le rythme.

const KEY = 'monstre.qualite';

export const QUALITY_MODES = {
  auto: 'Auto',
  economy: 'Économie',
  normal: 'Normal',
  beautiful: 'Magnifique'
};

export const QUALITY_PRESETS = {
  economy: {
    pixelRatio: 1.15,
    shadowSize: 1024,
    cloudStrength: 0.2,
    particleScale: 0.62,
    decorDensity: 0.68
  },
  normal: {
    pixelRatio: 1.5,
    shadowSize: 1024,
    cloudStrength: 0.32,
    particleScale: 0.84,
    decorDensity: 1
  },
  beautiful: {
    pixelRatio: 2,
    shadowSize: 2048,
    cloudStrength: 0.4,
    particleScale: 1,
    decorDensity: 1.1
  }
};

export function loadQualityPreference() {
  try {
    const value = localStorage.getItem(KEY) || 'auto';
    return QUALITY_MODES[value] ? value : 'auto';
  } catch {
    return 'auto';
  }
}

export function saveQualityPreference(value) {
  const safe = QUALITY_MODES[value] ? value : 'auto';
  try {
    if (safe === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, safe);
  } catch {
    /* stockage indisponible */
  }
  return safe;
}

export function resolveQuality(preference = 'auto', env = {}) {
  if (preference !== 'auto' && QUALITY_PRESETS[preference]) return preference;

  const memory = Number(env.deviceMemory ?? (typeof navigator !== 'undefined' ? navigator.deviceMemory : 0));
  const cores = Number(env.hardwareConcurrency ?? (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 0));
  const dpr = Number(env.devicePixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1));

  // Les API mémoire/CPU sont indicatives et parfois absentes. On ne choisit
  // jamais « Magnifique » automatiquement : Auto privilégie une expérience
  // stable, le niveau maximal reste un choix volontaire.
  if ((memory > 0 && memory <= 4) || (cores > 0 && cores <= 4)) return 'economy';

  // Une densité d'écran élevée n'est PAS un signe de faiblesse — les téléphones
  // haut de gamme dépassent tous 3. Elle ne compte donc que lorsqu'on ne sait
  // rien d'autre de l'appareil, comme dernier indice disponible.
  const inconnu = !(memory > 0) && !(cores > 0);
  if (inconnu && dpr >= 3) return 'economy';

  return 'normal';
}

export function qualityPreset(level) {
  return QUALITY_PRESETS[level] || QUALITY_PRESETS.normal;
}

export function lowerQuality(level) {
  if (level === 'beautiful') return 'normal';
  if (level === 'normal') return 'economy';
  return 'economy';
}
