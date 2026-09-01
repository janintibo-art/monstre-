import { replyTo, spontaneousLine } from './local.js';
import { buildContext } from './remote.js';
import { PROVIDERS, loadConfig, saveConfig, ask } from './providers.js';

// Le moteur local repond toujours. Si un fournisseur distant est configure,
// sa reponse remplace celle du local — et s'il echoue, on garde le local.

let lastError = '';

export function getLastError() {
  return lastError;
}

export async function speak(message, pet, emotion) {
  const fallback = replyTo(message, pet, emotion);
  const config = loadConfig();

  if (config.provider === 'local') return { text: fallback, source: 'local' };
  if (config.provider !== 'proxy' && !config.apiKey) {
    lastError = 'Aucune clé saisie.';
    return { text: fallback, source: 'local' };
  }
  if (config.provider === 'proxy' && !config.endpoint) {
    lastError = 'Aucune adresse de proxy saisie.';
    return { text: fallback, source: 'local' };
  }

  try {
    const text = await ask(config, buildContext(pet), message);
    if (!text) throw new Error('Réponse vide');
    lastError = '';
    return { text, source: config.provider };
  } catch (error) {
    lastError = String(error && error.message);
    return { text: fallback, source: 'local' };
  }
}

// Permet de valider une cle depuis les reglages sans passer par le chat.
export async function testConnection(pet) {
  const config = loadConfig();
  if (config.provider === 'local') return { ok: true, message: 'Mode local : rien à tester.' };
  try {
    const text = await ask(config, buildContext(pet), 'Dis bonjour en trois mots.');
    return { ok: true, message: text || 'Réponse vide, mais la connexion passe.' };
  } catch (error) {
    return { ok: false, message: String(error && error.message) };
  }
}

export { spontaneousLine, PROVIDERS, loadConfig, saveConfig };
