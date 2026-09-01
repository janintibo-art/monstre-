// Extraction de faits a partir de ce que dit le joueur.
//
// Pas de modele de langage ici : des motifs, en francais, appliques a la phrase.
// C'est volontairement modeste et ca tourne hors ligne. Mieux vaut retenir cinq
// choses justes que trente approximatives — une creature qui se trompe sur ton
// prenom est pire qu'une creature qui ne le connait pas.
//
// Chaque fait a un `kind` (sa categorie), une `key` (pour reconnaitre un doublon
// et le renforcer plutot que l'empiler) et un `text` (la phrase que la creature
// pourra ressortir telle quelle).

// Un « j'aime quand tu danses » parle de la creature, pas d'un gout durable.
// On ecarte ces tournures : les ranger comme des preferences donnerait des
// phrases absurdes quand elle les ressort.
const NOT_A_TASTE = /^(quand|que|qu'|lorsque|si|ce que|comment|ça|ca)\b/i;

const STOP = new Set([
  'pas',
  'plus',
  'rien',
  'ca',
  'ça',
  'cela',
  'toi',
  'moi',
  'te',
  'me',
  'que',
  'qui',
  'quand'
]);

function clean(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/, '')
    .slice(0, 60);
}

function usable(value) {
  const v = clean(value).toLowerCase();
  return v.length >= 2 && !STOP.has(v);
}

const RULES = [
  {
    kind: 'name',
    // Le prenom doit commencer par une majuscule : sans ca, « je suis fatigué »
    // se retrouverait enregistre comme un prenom.
    pattern: /\b(?:je m'appelle|moi c'est|mon nom est|on m'appelle)\s+([\p{Lu}][\p{L}'-]{1,20})/u,
    build: (m) => ({ key: 'name', value: clean(m[1]), text: `Tu t'appelles ${clean(m[1])}.` })
  },
  {
    kind: 'age',
    pattern: /\bj'?ai\s+(\d{1,3})\s+ans\b/u,
    build: (m) => ({ key: 'age', value: m[1], text: `Tu as ${m[1]} ans.` })
  },
  {
    kind: 'home',
    pattern: /\bj'habite\s+(?:à|a|en|au|aux|dans)\s+([\p{L}\s'-]{2,30})/u,
    build: (m) => ({ key: 'home', value: clean(m[1]), text: `Tu habites à ${clean(m[1])}.` })
  },
  {
    kind: 'work',
    // La preposition est capturee : sans elle on obtenait « Tu travailles la
    // radio » au lieu de « Tu travailles dans la radio ».
    pattern: /\bje\s+(?:travaille|bosse)\s+((?:comme|en tant que|dans|à|a|chez)\s+[\p{L}\s'-]{2,40})/u,
    build: (m) => ({ key: 'work', value: clean(m[1]), text: `Tu travailles ${clean(m[1])}.` })
  },
  {
    kind: 'like',
    pattern: /\bj'?(?:adore|aime beaucoup|aime bien|aime)\s+((?:le|la|les|l'|du|de la|des)\s+)?([^.,;!?]{2,40})/u,
    build: (m) => {
      const thing = clean((m[1] || '') + m[2]);
      if (NOT_A_TASTE.test(thing)) return null;
      return { key: `like:${thing.toLowerCase()}`, value: thing, text: `Tu aimes ${thing}.` };
    }
  },
  {
    kind: 'dislike',
    pattern: /\bje\s+(?:déteste|deteste|hais|n'aime pas|aime pas)\s+((?:le|la|les|l'|du|de la|des)\s+)?([^.,;!?]{2,40})/u,
    build: (m) => {
      const thing = clean((m[1] || '') + m[2]);
      if (NOT_A_TASTE.test(thing)) return null;
      return {
        key: `dislike:${thing.toLowerCase()}`,
        value: thing,
        text: `Tu n'aimes pas ${thing}.`
      };
    }
  },
  {
    kind: 'relation',
    pattern:
      /\bmon\s+(chat|chien|frère|frere|père|pere|fils|copain|ami|voisin)\s+s'appelle\s+([\p{L}'-]{2,20})/u,
    build: (m) => ({
      key: `relation:${m[1].toLowerCase()}`,
      value: clean(m[2]),
      text: `Ton ${clean(m[1])} s'appelle ${clean(m[2])}.`
    })
  },
  {
    kind: 'relation',
    pattern:
      /\bma\s+(chatte|chienne|sœur|soeur|mère|mere|fille|copine|amie|voisine)\s+s'appelle\s+([\p{L}'-]{2,20})/u,
    build: (m) => ({
      key: `relation:${m[1].toLowerCase()}`,
      value: clean(m[2]),
      text: `Ta ${clean(m[1])} s'appelle ${clean(m[2])}.`
    })
  },
  {
    kind: 'plan',
    pattern: /\b(?:demain|ce soir|la semaine prochaine)\s+je\s+([^.,;!?]{3,50})/u,
    build: (m, message) => {
      const when = /demain/i.test(message)
        ? 'demain'
        : /ce soir/i.test(message)
          ? 'ce soir'
          : 'la semaine prochaine';
      return {
        key: `plan:${clean(m[1]).toLowerCase()}`,
        value: clean(m[1]),
        text: `Tu m'as dit que ${when} tu ${clean(m[1])}.`,
        volatile: true // une intention datee vieillit vite
      };
    }
  },
  {
    kind: 'mood',
    pattern:
      /\bje\s+(?:suis|me sens)\s+(triste|fatigué|fatigue|content|heureux|malade|stressé|stresse|énervé|enerve|seul|nerveux)/u,
    build: (m) => ({
      key: 'mood',
      value: clean(m[1]),
      text: `Tu m'as dit que tu te sentais ${clean(m[1])}.`,
      volatile: true
    })
  }
];

// Renvoie les faits reperes dans un message. Un message peut en contenir
// plusieurs, mais jamais deux fois la meme cle.
export function extractFacts(message) {
  const text = String(message || '');
  const found = [];
  const seen = new Set();

  RULES.forEach((rule) => {
    const match = text.match(rule.pattern);
    if (!match) return;
    const built = rule.build(match, text);
    if (!built || !usable(built.value) || seen.has(built.key)) return;
    seen.add(built.key);
    found.push({ kind: rule.kind, ...built });
  });

  return found;
}
