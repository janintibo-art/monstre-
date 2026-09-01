import { replyTo, spontaneousLine } from './local.js';
import { askRemote } from './remote.js';

const ENDPOINT_KEY = 'monstre.endpoint';

export function getEndpoint() {
  try {
    return localStorage.getItem(ENDPOINT_KEY) || '';
  } catch {
    return '';
  }
}

export function setEndpoint(url) {
  try {
    if (url) localStorage.setItem(ENDPOINT_KEY, url);
    else localStorage.removeItem(ENDPOINT_KEY);
  } catch {
    /* stockage indisponible : on reste en local */
  }
}

// Le local repond toujours. Le distant, s'il est configure, remplace la
// reponse quand il aboutit. En cas d'echec on garde le repli sans le dire.
export async function speak(message, pet, emotion) {
  const fallback = replyTo(message, pet, emotion);
  const endpoint = getEndpoint();
  if (!endpoint) return { text: fallback, source: 'local' };
  try {
    const text = await askRemote(endpoint, message, pet);
    return { text, source: 'remote' };
  } catch {
    return { text: fallback, source: 'local' };
  }
}

export { spontaneousLine };
