import { knownFacts, playerName } from '../ai/memory.js';

// Sujets de conversation.
//
// Parler avec la creature ne devrait pas demander de savoir quoi lui dire. La
// page blanche est le principal obstacle : devant un champ vide, beaucoup de
// gens ne trouvent rien et referment. On propose donc un sujet et une premiere
// question, et il n'y a plus qu'a repondre.
//
// Les sujets sont classes par public. Pour les personnes agees, ils tournent
// autour de ce dont on aime parler quand on a une vie derriere soi : les
// saisons, la cuisine, les metiers d'avant, la musique, le village. Ce sont des
// sujets ouverts, sans bonne reponse — l'inverse d'un quiz.

const COMMUN = [
  {
    id: 'saison',
    icon: '🍂',
    title: 'La saison',
    opener: 'Dites-moi, chez vous, il fait quel temps aujourd’hui ?',
    relances: [
      'Et vous préférez quelle saison, vous ?',
      'Vous sortez un peu quand il fait ce temps-là ?',
      'Moi je ne connais que ma clairière. Racontez-moi ce que vous voyez par la fenêtre.'
    ]
  },
  {
    id: 'cuisine',
    icon: '🍲',
    title: 'La cuisine',
    opener: 'Qu’est-ce que vous avez mangé de bon récemment ?',
    relances: [
      'Vous le faites vous-même ou quelqu’un le prépare pour vous ?',
      'Il y a un plat que vous réussissez mieux que les autres ?',
      'Et un plat de votre enfance, vous en gardez le goût ?'
    ]
  },
  {
    id: 'musique',
    icon: '🎵',
    title: 'La musique',
    opener: 'Vous écoutez de la musique, de temps en temps ?',
    relances: [
      'Quelle chanson vous met de bonne humeur ?',
      'Vous avez déjà joué d’un instrument ?',
      'Il y a une musique qui vous rappelle quelqu’un ?'
    ]
  },
  {
    id: 'animaux',
    icon: '🐈',
    title: 'Les animaux',
    opener: 'Vous avez déjà eu un animal à vous ?',
    relances: [
      'Comment il s’appelait ?',
      'Il avait un caractère particulier ?',
      'Moi je suis un monstre, mais je crois que je ferais un bon animal de compagnie.'
    ]
  }
];

const SENIOR = [
  {
    id: 'enfance',
    icon: '🏡',
    title: 'Le temps d’avant',
    opener: 'Racontez-moi : c’était comment, là où vous avez grandi ?',
    relances: [
      'Il y avait beaucoup de monde dans la maison ?',
      'Vous alliez à l’école loin de chez vous ?',
      'Qu’est-ce qui a le plus changé depuis, à votre avis ?'
    ]
  },
  {
    id: 'metier',
    icon: '🔧',
    title: 'Le travail',
    opener: 'Vous avez fait quoi comme métier ?',
    relances: [
      'Vous l’avez choisi, ou il est venu comme ça ?',
      'Qu’est-ce qui vous plaisait le plus là-dedans ?',
      'Vous avez appris sur le tas ou on vous a formé ?'
    ]
  },
  {
    id: 'jardin',
    icon: '🌻',
    title: 'Le jardin',
    opener: 'Vous avez déjà eu un jardin, ou des plantes ?',
    relances: [
      'Qu’est-ce qui poussait le mieux ?',
      'Il y a une odeur de jardin que vous aimez particulièrement ?',
      'Vous avez la main verte, ou pas du tout ?'
    ]
  },
  {
    id: 'fetes',
    icon: '🎉',
    title: 'Les fêtes',
    opener: 'Comment ça se passait, les fêtes de famille, chez vous ?',
    relances: [
      'Qui faisait la cuisine ?',
      'Il y avait toujours la même chose sur la table ?',
      'Vous en organisez encore ?'
    ]
  },
  {
    id: 'voyages',
    icon: '🚂',
    title: 'Les voyages',
    opener: 'Vous avez voyagé, dans votre vie ?',
    relances: [
      'Quel endroit vous a le plus marqué ?',
      'Vous partiez comment, en train, en voiture ?',
      'Il y a un endroit où vous auriez aimé aller et où vous n’êtes jamais allé ?'
    ]
  },
  {
    id: 'famille',
    icon: '👨‍👩‍👧',
    title: 'La famille',
    opener: 'Vous avez des petits-enfants ?',
    relances: [
      'Vous les voyez souvent ?',
      'Ils vous ressemblent, vous trouvez ?',
      'Qu’est-ce que vous aimez faire avec eux ?'
    ]
  }
];

const JEUNE = [
  {
    id: 'ecole',
    icon: '🎒',
    title: 'L’école',
    opener: 'Alors, c’était comment à l’école aujourd’hui ?',
    relances: [
      'Tu préfères quelle matière ?',
      'Tu as des copains rigolos dans ta classe ?',
      'Il y a quelque chose que tu as appris et que tu peux m’expliquer ?'
    ]
  },
  {
    id: 'reves',
    icon: '💭',
    title: 'Les rêves',
    opener: 'Tu voudrais faire quoi, quand tu seras grand ?',
    relances: [
      'Et pourquoi ça ?',
      'Tu connais quelqu’un qui fait ce métier ?',
      'Moi je crois que je voudrais être arbre. On ne bouge pas mais on voit tout.'
    ]
  },
  {
    id: 'jeux',
    icon: '⚽',
    title: 'Tes jeux',
    opener: 'À quoi tu aimes jouer, toi ?',
    relances: [
      'Tu y joues avec qui ?',
      'C’est quoi les règles ? Explique-moi.',
      'On pourrait y jouer ensemble, tu crois ?'
    ]
  }
];

export function topicsFor(band) {
  if (band.audience === 'senior') return [...SENIOR, ...COMMUN];
  if (band.audience === 'enfant') return [...JEUNE, ...COMMUN];
  return [...COMMUN, ...SENIOR.slice(0, 3), ...JEUNE.slice(1, 2)];
}

// Sujet tire de ce que la creature sait deja de la personne. C'est celui qui
// touche le plus : elle ne demande pas au hasard, elle revient sur ce qu'on lui
// a raconte la derniere fois.
export function personalTopic(pet) {
  const facts = knownFacts(pet.memory).filter((f) =>
    ['like', 'relation', 'home', 'work', 'plan'].includes(f.kind)
  );
  if (!facts.length) return null;

  const fact = facts[Math.floor(Math.random() * Math.min(4, facts.length))];
  const nom = playerName(pet.memory);
  const ouvertures = {
    like: `Vous m’aviez dit une chose : ${fact.text.toLowerCase()} Racontez-moi pourquoi.`,
    relation: `${fact.text} Comment il va, en ce moment ?`,
    home: `${fact.text} C’est joli par là-bas ?`,
    work: `${fact.text} Ça vous plaisait ?`,
    plan: `${fact.text} Alors, ça s’est passé comment ?`
  };

  return {
    id: `perso:${fact.key}`,
    icon: '💛',
    title: 'Ce que vous m’avez dit',
    opener: nom ? `Dites, ${nom}. ${ouvertures[fact.kind]}` : ouvertures[fact.kind],
    relances: [
      'Racontez-moi un peu plus.',
      'Et ça remonte à quand ?',
      'Je note tout ça, vous savez.'
    ],
    personal: true
  };
}
