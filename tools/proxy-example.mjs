// Proxy d'exemple pour l'IA distante — NE FAIT PAS PARTIE DU BUILD.
//
// A quoi il sert : l'application (APK ou EXE) est decompilable. Une cle d'API
// placee dedans devient publique. Ce petit serveur garde la cle de son cote et
// n'expose qu'un endpoint /chat que l'application appelle.
//
// Lancer en local :
//   ANTHROPIC_API_KEY=sk-... node tools/proxy-example.mjs
// Puis renseigner http://localhost:8787/chat dans Réglages > Endpoint IA.
//
// En production, deploie ce fichier sur un hebergeur (Cloudflare Workers,
// Vercel, Fly.io…) et restreins l'origine autorisee.

import { createServer } from 'node:http';

const PORT = process.env.PORT || 8787;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.MODEL || 'claude-sonnet-4-6';

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }
  if (req.method !== 'POST' || !req.url.startsWith('/chat')) {
    res.writeHead(404).end();
    return;
  }
  if (!API_KEY) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY manquante' }));
    return;
  }

  let body = '';
  for await (const chunk of req) body += chunk;

  try {
    const { system, message } = JSON.parse(body || '{}');

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 150,
        system,
        messages: [{ role: 'user', content: String(message || '').slice(0, 500) }]
      })
    });

    const data = await upstream.json();
    const reply = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join(' ')
      .trim();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reply }));
  } catch (error) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(error.message) }));
  }
});

server.listen(PORT, () => {
  console.log(`Proxy prêt sur http://localhost:${PORT}/chat`);
});
