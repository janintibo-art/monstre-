import { describe } from '../personality.js';
import { NEED_LABELS } from '../needs.js';
import { favouriteCare } from '../memory.js';

// Branchement facultatif vers un vrai modele de langage.
//
// IMPORTANT : ne mets JAMAIS de cle d'API dans cette application. Un APK ou un
// .exe est decompilable, la cle serait publique en quelques minutes. Le seul
// montage sain est un petit proxy que tu heberges, qui detient la cle et
// expose un endpoint sans authentification forte ou avec ton propre jeton.
// Un exemple de proxy est fourni dans tools/proxy-example.mjs.

export function buildContext(pet) {
  const needs = Object.keys(NEED_LABELS)
    .map((k) => `${NEED_LABELS[k]} ${Math.round(pet.needs[k])}/100`)
    .join(', ');
  return [
    `Tu es ${pet.name}, une petite creature de compagnie imaginaire.`,
    `Caractere : ${describe(pet.personality)}.`,
    `Stade de vie : ${pet.stage}. Age : ${Math.round(pet.age / 60)} minutes de vie.`,
    `Etat interne : ${needs}.`,
    `Activite preferee du joueur : ${favouriteCare(pet.memory) || 'aucune encore'}.`,
    'Reponds en francais, en une ou deux phrases courtes, a la premiere personne.',
    "Reste dans le personnage : tu es une creature, pas un assistant. N'utilise pas d'emoji."
  ].join('\n');
}

export async function askRemote(endpoint, message, pet, { timeout = 8000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: buildContext(pet),
        message
      }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Réponse ${response.status}`);
    const data = await response.json();
    const text = typeof data.reply === 'string' ? data.reply.trim() : '';
    if (!text) throw new Error('Réponse vide');
    return text;
  } finally {
    clearTimeout(timer);
  }
}
