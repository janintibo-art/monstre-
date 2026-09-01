import { loadConfig, ask } from '../ai/dialogue/providers.js';
import { audienceInstruction } from '../state/profile.js';
import { currentBand } from '../state/profiles.js';

// Le coup de pouce du monstre pendant un jeu.
//
// Regle de fond : l'aide locale est toujours disponible et suffit. Chaque jeu
// ecrit ses propres indices et explications, ecrits pour l'age vise. L'IA
// distante ne fait que reformuler ou developper quand elle est configuree.
//
// C'est volontaire, pour trois raisons :
//   - le jeu doit marcher hors ligne, dans une voiture ou chez les
//     grands-parents sans wifi ;
//   - un indice ecrit a l'avance ne peut pas partir de travers, contrairement
//     a un texte genere ;
//   - l'attente d'une reponse reseau casse le rythme d'un enfant de cinq ans.
//
// Quand l'IA repond, elle recoit l'age de l'enfant et une consigne stricte :
// aider a comprendre, jamais donner la reponse.

function systemPrompt(pet, game) {
  const band = currentBand();
  return [
    `Tu es ${pet.name}, une petite creature de compagnie qui joue avec un enfant.`,
    audienceInstruction(band),
    `Vous jouez au jeu « ${game.name} » (${game.skill}).`,
    "Ton role : aider l'enfant a COMPRENDRE, jamais lui donner la reponse.",
    'Une seule phrase, tres courte, encourageante, sans emoji.',
    "Si tu ne sais pas quoi dire, propose de compter ou d'observer."
  ].join(' ');
}

export function createTutor(getPet) {
  let pending = null;

  function remoteReady() {
    const config = loadConfig();
    if (config.provider === 'local') return false;
    if (config.provider === 'proxy') return Boolean(config.endpoint);
    return Boolean(config.apiKey);
  }

  // Indice. Renvoie immediatement le texte local, et si l'IA distante est
  // branchee, la version enrichie arrive par le rappel `onBetter` — le jeu ne
  // se bloque jamais en attendant le reseau.
  function hint(game, question, { onBetter } = {}) {
    const local = question.hint || 'Regarde bien, tu vas trouver.';
    if (!remoteReady() || !onBetter) return local;

    const config = loadConfig();
    const token = {};
    pending = token;

    ask(
      config,
      systemPrompt(getPet(), game),
      `Consigne : « ${question.prompt} ». L'enfant s'est trompe. Donne-lui un indice, sans dire la reponse.`,
      { timeout: 6000 }
    )
      .then((text) => {
        // Si l'enfant a deja repondu entre-temps, on jette : arriver en retard
        // avec un indice perime est pire que ne rien dire.
        if (pending === token && text) onBetter(text.trim().slice(0, 180));
      })
      .catch(() => {
        /* silence : l'indice local a deja fait le travail */
      });

    return local;
  }

  // Explication apres coup, quand l'enfant appuie sur « Pourquoi ? ».
  async function explain(game, question) {
    const local = question.explain || '';
    if (!remoteReady()) return local;
    try {
      const text = await ask(
        loadConfig(),
        systemPrompt(getPet(), game),
        `Consigne : « ${question.prompt} ». La reponse etait : « ${question.explain} ». Explique pourquoi, simplement, en deux phrases maximum.`,
        { timeout: 8000 }
      );
      return (text && text.trim().slice(0, 300)) || local;
    } catch {
      return local;
    }
  }

  function cancel() {
    pending = null;
  }

  return { hint, explain, cancel, remoteReady };
}
