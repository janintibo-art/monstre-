import { normalize, parseNumbers } from '../audio/hearing.js';

// Comprendre un rendez-vous dit à voix haute.
//
// « J'ai rendez-vous chez le médecin mardi à 17 h » doit devenir un objet
// exploitable : un sujet, une date, une heure. Tout est fait par motifs, en
// français, sans modèle de langage — donc hors ligne, instantané, et surtout
// prévisible. Un pense-bête qui se trompe une fois sur dix ne sert à rien.
//
// Module pur : on lui passe la date du moment, il ne lit jamais l'horloge
// lui-même. C'est ce qui le rend testable.

const JOURS = {
  lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 0
};

const MOIS = {
  janvier: 0, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5, juillet: 6,
  aout: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11
};

// Moments de la journée, quand aucune heure précise n'est donnée.
const MOMENTS = {
  matin: 9,
  'matinee': 10,
  midi: 12,
  'apres midi': 14,
  gouter: 16,
  soir: 19,
  soiree: 20,
  nuit: 22,
  minuit: 0
};

// Ce qui déclenche la création d'un pense-bête.
const DECLENCHEURS = [
  /\brendez[- ]?vous\b/,
  /\brappelle[- ]?moi\b/,
  /\bfais[- ]?moi penser\b/,
  /\bn'?oublie pas\b/,
  /\bje dois\b/,
  /\bil faut que je\b/,
  /\bj'?ai\b.{0,24}\b(medecin|dentiste|coiffeur|kine|reunion|cours|train|avion|visite|controle)\b/
];

export function looksLikeReminder(text) {
  const t = normalize(text);
  return DECLENCHEURS.some((r) => r.test(t));
}

/* ------------------------------------------------------------------ heure */

function findTime(text) {
  // « 17 h 30 », « 17h », « 9 heures et quart »
  let m = text.match(/\b(\d{1,2})\s*(?:h|heures?)\s*(\d{1,2})?\b/);
  if (m) {
    const hour = Number(m[1]);
    let minute = m[2] ? Number(m[2]) : 0;
    if (/et quart/.test(text)) minute = 15;
    if (/et demie?/.test(text)) minute = 30;
    if (/moins le quart/.test(text)) minute = 45;
    if (hour <= 23 && minute <= 59) return { hour, minute, precise: true };
  }

  // « 17:30 »
  m = text.match(/\b(\d{1,2})\s*:\s*(\d{2})\b/);
  if (m) {
    const hour = Number(m[1]);
    const minute = Number(m[2]);
    if (hour <= 23 && minute <= 59) return { hour, minute, precise: true };
  }

  // Un moment de la journée, sans heure : c'est moins précis mais utilisable.
  const moment = Object.keys(MOMENTS).find((key) => text.includes(key));
  if (moment) return { hour: MOMENTS[moment], minute: 0, precise: false };

  return null;
}

/* ------------------------------------------------------------------- date */

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function findDate(text, now) {
  const today = startOfDay(now);

  if (/\bapres[- ]demain\b/.test(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return { date: d, explicit: true };
  }
  if (/\bdemain\b/.test(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return { date: d, explicit: true };
  }
  if (/\b(aujourd'?hui|ce soir|ce matin|cet apres midi|tout a l'heure)\b/.test(text)) {
    return { date: new Date(today), explicit: true };
  }

  // « dans trois jours », « dans deux semaines »
  let m = text.match(/\bdans\s+(\d+)\s*(jours?|semaines?|mois)\b/);
  if (m) {
    const n = Number(m[1]);
    const d = new Date(today);
    if (/jour/.test(m[2])) d.setDate(d.getDate() + n);
    else if (/semaine/.test(m[2])) d.setDate(d.getDate() + n * 7);
    else d.setMonth(d.getMonth() + n);
    return { date: d, explicit: true };
  }

  // « le 12 mars », « le 3 » — le jour du mois
  m = text.match(/\ble\s+(\d{1,2})(?:er)?\s*([a-z]+)?\b/);
  if (m) {
    const day = Number(m[1]);
    const monthName = m[2] && MOIS[m[2]] !== undefined ? MOIS[m[2]] : null;
    if (day >= 1 && day <= 31) {
      const d = new Date(today);
      d.setDate(day);
      if (monthName !== null) d.setMonth(monthName);
      // Une date déjà passée désigne le mois ou l'année suivante : personne ne
      // prend rendez-vous hier.
      if (d < today) {
        if (monthName !== null) d.setFullYear(d.getFullYear() + 1);
        else d.setMonth(d.getMonth() + 1);
      }
      return { date: d, explicit: true };
    }
  }

  // Un jour de la semaine : le prochain à venir.
  const jour = Object.keys(JOURS).find((key) => new RegExp(`\\b${key}\\b`).test(text));
  if (jour) {
    const target = JOURS[jour];
    const d = new Date(today);
    let delta = (target - d.getDay() + 7) % 7;
    // « mardi » un mardi désigne le mardi suivant, sauf si on précise
    // « ce mardi » ou qu'une heure plus tardive dans la journée est donnée.
    if (delta === 0 && !/\bce\b/.test(text)) delta = 7;
    d.setDate(d.getDate() + delta);
    return { date: d, explicit: true, weekday: target };
  }

  return null;
}

/* ------------------------------------------------------------- récurrence */

function findRecurrence(text) {
  if (/\b(tous les|chaque)\s+jours?\b/.test(text)) return { every: 'day' };
  if (/\b(toutes les|chaque)\s+semaines?\b/.test(text)) return { every: 'week' };
  if (/\b(tous les|chaque)\s+mois\b/.test(text)) return { every: 'month' };
  const jour = Object.keys(JOURS).find((key) =>
    new RegExp(`\\b(tous les|chaque)\\s+${key}s?\\b`).test(text)
  );
  if (jour) return { every: 'week', weekday: JOURS[jour] };
  return null;
}

/* ------------------------------------------------------------------ sujet */

// Ce qui reste une fois retirés les mots de temps et les formules d'annonce.
const A_RETIRER = [
  /\b(j'?ai|je dois|il faut que je|rappelle[- ]?moi de?|fais[- ]?moi penser a|n'?oublie pas de?)\b/g,
  /\brendez[- ]?vous\b/g,
  /\b(le|la|les|l'|un|une|de|du|des|a|au|aux)\b/g,
  /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/g,
  /\b(demain|apres[- ]demain|aujourd'?hui|prochaine?)\b/g,
  /\b(ce|cet|cette)\s+(matin|soir|apres midi|semaine)\b/g,
  /\b(matin|matinee|midi|apres midi|gouter|soir|soiree|nuit|minuit)\b/g,
  /\b(tous les|toutes les|chaque)\s+\w+\b/g,
  /\bdans\s+\d+\s*(jours?|semaines?|mois)\b/g,
  /\ble\s+\d{1,2}(er)?\s*\w*\b/g,
  /\b\d{1,2}\s*(h|heures?)\s*\d{0,2}\b/g,
  /\b\d{1,2}\s*:\s*\d{2}\b/g,
  /\b(et quart|et demie?|moins le quart)\b/g,
  /\bvers\b/g
];

function findSubject(text) {
  let rest = ` ${text} `;
  A_RETIRER.forEach((r) => {
    rest = rest.replace(r, ' ');
  });
  rest = rest.replace(/\s+/g, ' ').trim();
  // On garde les mots porteurs : « chez medecin » redevient « chez le médecin »
  // à l'affichage, mais l'essentiel est de retenir de quoi il s'agit.
  return rest;
}

const JOLI = {
  medecin: 'le médecin',
  dentiste: 'le dentiste',
  coiffeur: 'le coiffeur',
  kine: 'le kiné',
  pharmacie: 'la pharmacie',
  courses: 'les courses',
  reunion: 'la réunion'
};

function embellish(subject) {
  if (!subject) return '';
  const words = subject.split(' ');
  const pretty = words.map((w) => JOLI[w] || w).join(' ');
  return pretty.replace(/^chez\s+/, 'chez ');
}

/* --------------------------------------------------------------- l'ensemble */

// Analyse une phrase. Renvoie null si ce n'est pas un rendez-vous.
export function parseReminder(text, now = new Date()) {
  const raw = String(text || '');
  // Les deux-points sont retirés par la normalisation générale : on convertit
  // « 14:45 » en « 14h45 » avant, sinon l'heure disparaît.
  const prepared = raw.replace(/(\d{1,2})\s*:\s*(\d{2})/g, '$1h$2');
  const clean = parseNumbers(normalize(prepared));

  const time = findTime(clean);
  const day = findDate(clean, now);
  const recurrence = findRecurrence(clean);

  // Sans date ni heure, il n'y a rien à programmer.
  if (!time && !day) return null;
  if (!looksLikeReminder(raw) && !day) return null;

  const when = day ? new Date(day.date) : startOfDay(now);
  if (time) when.setHours(time.hour, time.minute, 0, 0);
  else when.setHours(9, 0, 0, 0); // par défaut, le matin

  // Une heure déjà passée aujourd'hui désigne demain.
  if (!day && when <= now) when.setDate(when.getDate() + 1);

  const subject = embellish(findSubject(clean));

  return {
    subject,
    at: when.getTime(),
    recurrence,
    // Sans heure précise, on préviendra quand même, mais on le signale.
    vague: !time || !time.precise,
    source: raw.trim()
  };
}

/* ------------------------------------------- quand faut-il prévenir ? */

// Choix proposés à l'oral comme au doigt. « La veille au soir » n'est pas un
// décalage en minutes : c'est une heure fixe la veille, ce qui n'a rien à voir
// pour un rendez-vous à 8 h du matin.
export const LEADS = [
  { id: 'moment', label: 'Au moment', spoken: 'au moment', kind: 'offset', minutes: 0 },
  { id: '15min', label: '15 minutes avant', spoken: 'quinze minutes avant', kind: 'offset', minutes: 15 },
  { id: '1h', label: '1 heure avant', spoken: 'une heure avant', kind: 'offset', minutes: 60 },
  { id: '2h', label: '2 heures avant', spoken: 'deux heures avant', kind: 'offset', minutes: 120 },
  { id: 'matin', label: 'Le matin même', spoken: 'le matin même', kind: 'sameDay', hour: 8 },
  { id: 'veille', label: 'La veille au soir', spoken: 'la veille au soir', kind: 'dayBefore', hour: 19 }
];

export function leadById(id) {
  return LEADS.find((l) => l.id === id) || LEADS[2];
}

// Comprend une réponse dite à voix haute.
export function parseLead(text) {
  const t = parseNumbers(normalize(text));

  if (/\bveille\b/.test(t)) return leadById('veille');
  if (/\bmatin\b/.test(t) && !/\bavant\b/.test(t)) return leadById('matin');
  if (/\b(au moment|a l'heure|pile|juste avant|quand c'est l'heure)\b/.test(t)) {
    return leadById('moment');
  }

  const m = t.match(/\b(\d+)\s*(minutes?|min|heures?|h)\b/);
  if (m) {
    const n = Number(m[1]);
    const minutes = /heure|h/.test(m[2]) ? n * 60 : n;
    if (minutes >= 0 && minutes <= 2880) {
      return { id: `custom${minutes}`, label: labelFor(minutes), kind: 'offset', minutes };
    }
  }

  if (/\bune heure\b/.test(t)) return leadById('1h');
  return null;
}

function labelFor(minutes) {
  if (minutes === 0) return 'Au moment';
  if (minutes < 60) return `${minutes} minutes avant`;
  const hours = minutes / 60;
  return `${hours % 1 === 0 ? hours : hours.toFixed(1)} heure${hours > 1 ? 's' : ''} avant`;
}

// Date du rappel, à partir de la date du rendez-vous et du choix de prévenance.
export function triggerTime(at, lead) {
  const target = new Date(at);
  if (!lead || lead.kind === 'offset') {
    return target.getTime() - (lead ? lead.minutes : 0) * 60000;
  }
  if (lead.kind === 'sameDay') {
    const d = new Date(target);
    d.setHours(lead.hour, 0, 0, 0);
    // Un rendez-vous à 7 h ne peut pas être rappelé à 8 h le matin même : on
    // recule d'une heure plutôt que de prévenir après coup.
    return d >= target ? target.getTime() - 3600000 : d.getTime();
  }
  if (lead.kind === 'dayBefore') {
    const d = new Date(target);
    d.setDate(d.getDate() - 1);
    d.setHours(lead.hour, 0, 0, 0);
    return d.getTime();
  }
  return target.getTime();
}

/* ------------------------------------------------------------- affichage */

const JOURS_NOMS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS_NOMS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

export function formatWhen(at, now = new Date()) {
  const d = new Date(at);
  const heure = `${d.getHours()} h${d.getMinutes() ? ` ${String(d.getMinutes()).padStart(2, '0')}` : ''}`;

  const jourCible = startOfDay(d).getTime();
  const jourNow = startOfDay(now).getTime();
  const ecart = Math.round((jourCible - jourNow) / 86400000);

  if (ecart === 0) return `aujourd’hui à ${heure}`;
  if (ecart === 1) return `demain à ${heure}`;
  if (ecart === 2) return `après-demain à ${heure}`;
  if (ecart > 2 && ecart < 7) return `${JOURS_NOMS[d.getDay()]} à ${heure}`;
  return `${JOURS_NOMS[d.getDay()]} ${d.getDate()} ${MOIS_NOMS[d.getMonth()]} à ${heure}`;
}
