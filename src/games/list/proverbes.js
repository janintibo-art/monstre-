import { shuffle } from '../session.js';

// Completer un proverbe. Le jeu qui marche le mieux avec les personnes agees :
// on ne teste pas une capacite, on reveille un savoir deja la. Trouver la fin
// d'un proverbe qu'on connait depuis soixante ans fait plaisir.

const PROVERBES = [
  ['Qui vole un œuf', 'vole un bœuf'],
  ['Petit à petit', 'l’oiseau fait son nid'],
  ['Il ne faut pas vendre la peau de l’ours', 'avant de l’avoir tué'],
  ['Qui sème le vent', 'récolte la tempête'],
  ['L’habit ne fait pas', 'le moine'],
  ['Après la pluie', 'le beau temps'],
  ['Mieux vaut tard', 'que jamais'],
  ['Chose promise', 'chose due'],
  ['Les murs', 'ont des oreilles'],
  ['Qui ne risque rien', 'n’a rien'],
  ['La nuit', 'porte conseil'],
  ['Tel père', 'tel fils'],
  ['Un tiens vaut mieux', 'que deux tu l’auras'],
  ['Rien ne sert de courir', 'il faut partir à point'],
  ['C’est en forgeant', 'qu’on devient forgeron'],
  ['À bon chat', 'bon rat'],
  ['Loin des yeux', 'loin du cœur'],
  ['Une hirondelle', 'ne fait pas le printemps'],
  ['Le mieux est l’ennemi', 'du bien'],
  ['Qui va à la chasse', 'perd sa place'],
  ['Pierre qui roule', 'n’amasse pas mousse'],
  ['Les bons comptes', 'font les bons amis'],
  ['Il n’y a pas de fumée', 'sans feu'],
  ['On ne fait pas d’omelette', 'sans casser des œufs'],
  ['Chat échaudé', 'craint l’eau froide'],
  ['L’argent ne fait pas', 'le bonheur'],
  ['Qui dort', 'dîne'],
  ['Bien mal acquis', 'ne profite jamais'],
  ['Un malheur', 'n’arrive jamais seul'],
  ['La parole est d’argent', 'mais le silence est d’or'],
  ['À chaque jour', 'suffit sa peine'],
  ['Il faut battre le fer', 'pendant qu’il est chaud'],
  ['Vouloir', 'c’est pouvoir'],
  ['Noël au balcon', 'Pâques au tison'],
  ['En avril', 'ne te découvre pas d’un fil'],
  ['Qui trop embrasse', 'mal étreint'],
  ['Les petits ruisseaux', 'font les grandes rivières'],
  ['Toute peine', 'mérite salaire'],
  ['On n’apprend pas à un vieux singe', 'à faire la grimace'],
  ['Le chat parti', 'les souris dansent']
];

export default {
  id: 'proverbes',
  name: 'Complétez le proverbe',
  icon: '📜',
  skill: 'Langue',
  ages: [12, 120],
  rounds: 6,

  make(level, rng) {
    const [debut, fin] = PROVERBES[Math.floor(rng() * PROVERBES.length)];
    const autres = shuffle(
      PROVERBES.filter((p) => p[1] !== fin).map((p) => p[1]),
      rng
    ).slice(0, 3);

    return {
      prompt: `Comment finit ce proverbe : « ${debut}… » ?`,
      kind: 'phrase',
      display: `« ${debut}… »`,
      choices: shuffle([fin, ...autres], rng).map((t) => ({
        key: t,
        label: t,
        value: t,
        correct: t === fin
      })),
      hint: 'Dites-le à voix haute, la suite vient souvent toute seule.',
      explain: `« ${debut} ${fin}. »`,
      // Sujet de conversation propose apres la question : c'est ce qui fait la
      // difference entre un questionnaire et un moment passe ensemble.
      talk: `On parlait de ce proverbe : « ${debut} ${fin}. » Est-ce que vous l’employez encore ?`
    };
  }
};
