import { shuffle } from '../session.js';

// Pays et capitales. De la culture generale sans piege : les questions portent
// sur des faits stables, jamais sur l'actualite.

const PAYS = [
  ['France', 'Paris'], ['Italie', 'Rome'], ['Espagne', 'Madrid'], ['Portugal', 'Lisbonne'],
  ['Allemagne', 'Berlin'], ['Belgique', 'Bruxelles'], ['Suisse', 'Berne'], ['Autriche', 'Vienne'],
  ['Grèce', 'Athènes'], ['Pologne', 'Varsovie'], ['Hongrie', 'Budapest'], ['Suède', 'Stockholm'],
  ['Norvège', 'Oslo'], ['Danemark', 'Copenhague'], ['Finlande', 'Helsinki'], ['Irlande', 'Dublin'],
  ['Pays-Bas', 'Amsterdam'], ['Royaume-Uni', 'Londres'], ['Roumanie', 'Bucarest'],
  ['Tchéquie', 'Prague'], ['Croatie', 'Zagreb'], ['Maroc', 'Rabat'], ['Tunisie', 'Tunis'],
  ['Algérie', 'Alger'], ['Sénégal', 'Dakar'], ['Égypte', 'Le Caire'], ['Canada', 'Ottawa'],
  ['Mexique', 'Mexico'], ['Brésil', 'Brasilia'], ['Argentine', 'Buenos Aires'],
  ['Japon', 'Tokyo'], ['Chine', 'Pékin'], ['Inde', 'New Delhi'], ['Turquie', 'Ankara'],
  ['Australie', 'Canberra'], ['Russie', 'Moscou'], ['Islande', 'Reykjavik']
];

// Les grands fleuves et regions de France : le sujet plait, et c'est du savoir
// scolaire que beaucoup ont garde.
const FRANCE = [
  ['Quelle ville est traversée par la Garonne ?', 'Bordeaux', ['Lyon', 'Nantes', 'Strasbourg']],
  ['Quelle ville est traversée par le Rhône ?', 'Lyon', ['Bordeaux', 'Lille', 'Rennes']],
  ['Dans quelle région se trouve Colmar ?', 'Alsace', ['Bretagne', 'Provence', 'Normandie']],
  ['Quelle mer borde Marseille ?', 'La Méditerranée', ['La Manche', 'L’Atlantique', 'La mer du Nord']],
  ['Quel massif abrite le mont Blanc ?', 'Les Alpes', ['Les Pyrénées', 'Le Jura', 'Le Massif central']],
  ['Quelle ville est célèbre pour ses hospices et son vin ?', 'Beaune', ['Cognac', 'Roubaix', 'Vichy']],
  ['Quel fleuve passe à Nantes ?', 'La Loire', ['La Seine', 'La Somme', 'Le Tarn']],
  ['Quelle ville abrite le Parlement européen ?', 'Strasbourg', ['Lille', 'Toulouse', 'Dijon']]
];

export default {
  id: 'capitales',
  name: 'Géographie',
  icon: '🗺️',
  skill: 'Culture',
  ages: [9, 120],
  rounds: 6,

  make(level, rng) {
    // Une question sur trois porte sur la France : c'est ce qui parle le plus.
    if (rng() < 0.35) {
      const [prompt, bonne, faux] = FRANCE[Math.floor(rng() * FRANCE.length)];
      return {
        prompt,
        kind: 'phrase',
        choices: shuffle([bonne, ...faux], rng).map((t) => ({
          key: t,
          label: t,
          value: t,
          correct: t === bonne
        })),
        hint: 'Prenez le temps, la réponse vous reviendra.',
        explain: `${prompt} ${bonne}.`,
        talk: `Vous connaissez ${bonne} ? Vous y êtes déjà allé ?`
      };
    }

    const [pays, capitale] = PAYS[Math.floor(rng() * PAYS.length)];
    const autres = shuffle(
      PAYS.filter((p) => p[1] !== capitale).map((p) => p[1]),
      rng
    ).slice(0, 3);

    return {
      prompt: `Quelle est la capitale de ce pays : ${pays} ?`,
      kind: 'phrase',
      display: pays,
      choices: shuffle([capitale, ...autres], rng).map((t) => ({
        key: t,
        label: t,
        value: t,
        correct: t === capitale
      })),
      hint: 'Pensez à une carte, ça aide souvent.',
      explain: `La capitale de ${pays} est ${capitale}.`,
      talk: `${pays}… Vous avez déjà voyagé par là-bas ?`
    };
  }
};
