// Fournisseurs d'IA. Le mode "local" fonctionne hors ligne et reste le defaut.
// Les autres appellent une API depuis le telephone, avec une cle que tu saisis
// dans les reglages. Cette cle vit dans le stockage local de l'appareil : elle
// n'est jamais ecrite dans le code, donc jamais poussee sur GitHub.

export const PROVIDERS = {
  local: {
    label: 'IA locale (hors ligne)',
    needsKey: false,
    help: "Fonctionne sans internet et sans compte. C'est le mode par defaut."
  },
  gemini: {
    label: 'Google Gemini — gratuit',
    needsKey: true,
    defaultModel: 'gemini-2.0-flash',
    keyUrl: 'https://aistudio.google.com/apikey',
    help: 'Le plus simple : compte Google, clé en 30 secondes, quota gratuit large.'
  },
  groq: {
    label: 'Groq — gratuit',
    needsKey: true,
    defaultModel: 'llama-3.3-70b-versatile',
    keyUrl: 'https://console.groq.com/keys',
    help: 'Très rapide. Quota gratuit généreux, sans carte bancaire.'
  },
  openrouter: {
    label: 'OpenRouter — modèles gratuits',
    needsKey: true,
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    keyUrl: 'https://openrouter.ai/keys',
    help: 'Accès à plusieurs modèles. Ceux qui finissent par « :free » sont gratuits.'
  },
  proxy: {
    label: 'Mon propre proxy',
    needsKey: false,
    needsEndpoint: true,
    help: 'Pour cacher la clé côté serveur. Voir tools/proxy-example.mjs.'
  }
};

const STORE_KEY = 'monstre.ai';

export function loadConfig() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { provider: 'local', apiKey: '', model: '', endpoint: '' };
    return { provider: 'local', apiKey: '', model: '', endpoint: '', ...JSON.parse(raw) };
  } catch {
    return { provider: 'local', apiKey: '', model: '', endpoint: '' };
  }
}

export function saveConfig(config) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(config));
  } catch {
    /* stockage indisponible : on reste en local */
  }
}

async function post(url, headers, body, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = data && (data.error?.message || data.message);
      throw new Error(detail || `Réponse ${response.status}`);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// Renvoie le texte de reponse, ou leve une erreur explicite.
export async function ask(config, system, message, { timeout = 12000 } = {}) {
  const text = String(message || '').slice(0, 500);

  if (config.provider === 'gemini') {
    const model = config.model || PROVIDERS.gemini.defaultModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      config.apiKey
    )}`;
    const data = await post(
      url,
      {},
      {
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 1 }
      },
      timeout
    );
    const parts = data?.candidates?.[0]?.content?.parts || [];
    return parts.map((p) => p.text || '').join(' ').trim();
  }

  if (config.provider === 'groq' || config.provider === 'openrouter') {
    const isGroq = config.provider === 'groq';
    const url = isGroq
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://openrouter.ai/api/v1/chat/completions';
    const model = config.model || PROVIDERS[config.provider].defaultModel;
    const data = await post(
      url,
      { Authorization: `Bearer ${config.apiKey}` },
      {
        model,
        max_tokens: 200,
        temperature: 1,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: text }
        ]
      },
      timeout
    );
    return (data?.choices?.[0]?.message?.content || '').trim();
  }

  if (config.provider === 'proxy') {
    const data = await post(config.endpoint, {}, { system, message: text }, timeout);
    return String(data?.reply || '').trim();
  }

  throw new Error('Fournisseur inconnu');
}
