import { NEED_LABELS, lowestNeed } from '../needs.js';
import { dominantTrait, TRAIT_LABELS } from '../personality.js';
import {
  favouriteCare,
  hoursSinceCare,
  playerName,
  randomFact,
  knownFacts,
  daysTogether
} from '../memory.js';

// Moteur de dialogue hors ligne. Il ne "comprend" pas le langage : il repere
// des intentions par mots-cles et pioche une phrase coherente avec l'etat
// interne. C'est le repli par defaut, et il fonctionne sans reseau.

const recent = [];

function say(options) {
  const fresh = options.filter((o) => !recent.includes(o));
  const pool = fresh.length ? fresh : options;
  const choice = pool[Math.floor(Math.random() * pool.length)];
  recent.push(choice);
  if (recent.length > 12) recent.shift();
  return choice;
}

// -------------------------------------------------------- phrases spontanees

const SPONTANEOUS = {
  affame: [
    'Mon ventre fait un bruit bizarre.',
    'Tu as senti ? Ça sentait la nourriture. Enfin, je crois.',
    "Je peux manger maintenant ? Juste un peu ?"
  ],
  fatigue: [
    'Mes paupières pèsent trois tonnes.',
    'Je vais fermer les yeux deux secondes. Deux.',
    'Tout devient flou et doux.'
  ],
  seul: [
    'Tu étais où ?',
    "J'ai compté les fissures du sol en t'attendant.",
    'Approche. Reste un peu.'
  ],
  boudeur: [
    'Non.',
    "Je regarde le mur. C'est mieux que toi.",
    "Tu ne peux pas juste revenir et faire comme si de rien n'était."
  ],
  joyeux: [
    'Regarde ce que je sais faire !',
    "C'est une bonne journée. Je le sens.",
    'Encore ! Encore !'
  ],
  curieux: [
    "Il y a quelque chose derrière, là. Tu le vois aussi ?",
    "Je me demande jusqu'où ça va.",
    "J'ai reniflé un truc nouveau."
  ],
  excite: ['JE SUIS TROP CONTENT', 'On fait la fête !', 'Je pourrais courir jusqu’à demain.'],
  calme: ['Hmm.', 'On est bien, là.', 'Je pensais à rien de spécial.']
};

export function spontaneousLine(pet, emotion) {
  // Une fois sur quatre, elle ressort un souvenir au lieu d'une phrase
  // d'ambiance. Assez rare pour surprendre, assez frequent pour qu'on sente
  // qu'elle retient les choses.
  if (pet.memory && Math.random() < 0.25) {
    const fact = randomFact(pet.memory, ['like', 'dislike', 'relation', 'plan', 'home', 'work']);
    if (fact) {
      const name = playerName(pet.memory);
      const prefix = name && Math.random() < 0.4 ? `${name}, ` : '';
      return say([
        `${prefix}je repensais à un truc. ${fact.text}`,
        `${prefix}${fact.text} Je m'en souviens, tu vois.`,
        `Dis… ${fact.text.toLowerCase()}`
      ]);
    }
  }
  const pool = SPONTANEOUS[emotion] || SPONTANEOUS.calme;
  return say(pool);
}

// -------------------------------------------------------------- conversation

const INTENTS = [
  {
    id: 'greeting',
    test: /\b(salut|bonjour|coucou|hey|hello|bonsoir|yo)\b/i,
    reply: (pet) => {
      // Si elle connait ton prenom, elle s'en sert : c'est la difference la plus
      // immediatement sensible entre une creature qui te reconnait et une autre.
      const name = playerName(pet.memory);
      if (name) return say([`Salut ${name} !`, `Te revoilà, ${name}.`, `Ah, ${name}.`]);
      return say([`Salut ! Je suis ${pet.name}.`, 'Te revoilà.', 'Ah, toi. Bien.']);
    }
  },
  {
    id: 'whoami',
    test: /\b(tu (?:te )?(?:souviens|rappelles)|tu me connais|qui suis-je|tu sais qui je suis)\b/i,
    reply: (pet) => {
      const name = playerName(pet.memory);
      const facts = knownFacts(pet.memory).filter((f) => f.kind !== 'name');
      const days = daysTogether(pet.memory);
      if (!name && !facts.length) {
        return say([
          'Je ne sais presque rien de toi, en fait. Raconte.',
          "Tu ne m'as encore rien dit sur toi."
        ]);
      }
      const pieces = [];
      if (name) pieces.push(`Tu es ${name}`);
      if (facts.length) pieces.push(facts[0].text.replace(/^Tu /, 'tu ').replace(/\.$/, ''));
      if (days >= 1) pieces.push(`on se connaît depuis ${days} jour${days > 1 ? 's' : ''}`);
      return `${pieces.join(', ')}.`;
    }
  },
  {
    id: 'name',
    test: /\b(nom|t'appelles|appelles-tu|qui es-tu|qui tu es)\b/i,
    reply: (pet) =>
      say([
        `${pet.name}. Tu me l'as donné, tu te souviens ?`,
        `Je suis ${pet.name}, et je suis ${TRAIT_LABELS[dominantTrait(pet.personality)]}.`
      ])
  },
  {
    id: 'howareyou',
    test: /\b(ça va|ca va|comment vas|comment tu te sens|humeur)\b/i,
    reply: (pet) => {
      const worst = lowestNeed(pet.needs);
      const value = Math.round(pet.needs[worst]);
      if (value < 35) return `Bof. ${NEED_LABELS[worst].toLowerCase()} : ça ne va pas fort.`;
      return say(['Plutôt bien.', 'Ça tient.', 'Je me sens léger aujourd’hui.']);
    }
  },
  {
    id: 'food',
    test: /\b(manger|faim|nourri|repas|bouffe|gâteau|gateau)\b/i,
    reply: (pet) =>
      pet.needs.hunger < 50
        ? say(['Oui. Maintenant. S’il te plaît.', 'Tu lis dans mes pensées.'])
        : say(['Je viens de manger, en fait.', 'Plus tard. Là, je suis calé.'])
  },
  {
    id: 'play',
    test: /\b(jouer|jeu|amuse|balle|cache-cache)\b/i,
    reply: (pet) =>
      pet.needs.energy > 40
        ? say(['Oui ! Oui ! Oui !', 'Lance quelque chose, je cours après.'])
        : say(['Je veux bien, mais mes pattes disent non.', 'Après une sieste.'])
  },
  {
    id: 'love',
    test: /\b(aime|adore|mignon|gentil|bisou|câlin|calin)\b/i,
    reply: (pet) =>
      say([
        'Moi aussi. Beaucoup.',
        'Tu dis ça et mes taches s’allument, c’est gênant.',
        'Reste encore un peu alors.'
      ])
  },
  {
    id: 'insult',
    test: /\b(idiot|bête|bete|nul|moche|stupide|déteste|deteste)\b/i,
    reply: () =>
      say(['…', 'Je préfère ne pas répondre à ça.', 'Ça, ça pique.'])
  },
  {
    id: 'sleep',
    test: /\b(dors|dormir|sieste|nuit|fatigué|fatigue)\b/i,
    reply: (pet) =>
      pet.needs.energy < 45
        ? say(['Je tombe de sommeil, oui.', 'Éteins la lumière, tu veux ?'])
        : say(['Pas encore. Il fait trop beau dans ma tête.'])
  },
  {
    id: 'memory',
    test: /\b(hier|avant|mémoire|memoire|dit)\b/i,
    reply: (pet) => {
      const fact = randomFact(pet.memory);
      if (fact) return say([fact.text, `${fact.text} Je n'ai pas oublié.`]);
      const fav = favouriteCare(pet.memory);
      const map = {
        feed: 'me nourrir',
        play: 'jouer avec moi',
        wash: 'me laver',
        pet: 'me caresser'
      };
      if (fav) return `Je me souviens surtout que tu aimes ${map[fav]}. Moi aussi.`;
      return 'Tout est encore un peu flou. Je viens juste de naître.';
    }
  },
  {
    id: 'tastes',
    test: /\b(j'aime|tu sais ce que j'aime|mes goûts|mes gouts)\b/i,
    reply: (pet) => {
      const likes = knownFacts(pet.memory).filter((f) => f.kind === 'like');
      if (!likes.length) return 'Dis-m\'en plus, je retiendrai.';
      return say([likes[0].text, `Je sais : ${likes[0].text.toLowerCase()}`]);
    }
  }
];

export function replyTo(message, pet, emotion) {
  const found = INTENTS.find((i) => i.test.test(message));
  if (found) return found.reply(pet);

  // Pas d'intention reconnue : le monstre repond selon son etat, en assumant
  // qu'il n'a pas compris. Mieux vaut ca qu'une reponse hors sujet.
  const hours = hoursSinceCare(pet.memory);
  if (hours > 6) return say(['Tu parles beaucoup pour quelqu’un qui disparaît.', 'Hmpf.']);
  return say([
    'Je ne suis pas sûr de comprendre, mais je t’écoute.',
    'Répète pour voir ?',
    `${message.split(' ').slice(0, 3).join(' ')}… d’accord.`,
    spontaneousLine(pet, emotion)
  ]);
}
