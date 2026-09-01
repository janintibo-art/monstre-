// Catalogue des plats.
//
// Module pur, sans Three.js : la couche de rendu ne doit pas contaminer les
// donnees, sinon le catalogue devient intestable hors navigateur. Meme raison
// que pour le genome.
//
// Les plats sont eux-memes de petits monstres, avec des yeux et des cornes.
// Les repliques jouent la-dessus : on ne mange pas un gateau, on mange quelque
// chose qui vous regarde.
export const FOODS = [
  {
    id: 'cupcake',
    file: 'cupcake.glb',
    name: 'un cupcake',
    height: 0.42,
    effects: { hunger: 30, fun: 4 },
    line: 'Un cupcake à cornes. Il a l’air décidé.'
  },
  {
    id: 'milkshake',
    file: 'milkshake.glb',
    name: 'un milkshake',
    height: 0.5,
    effects: { hunger: 24, fun: 6, energy: 4 },
    line: 'Il me regarde par-dessus sa paille. Santé !'
  },
  {
    id: 'boule',
    file: 'boule.glb',
    name: 'une boule gluante',
    height: 0.36,
    effects: { hunger: 26, fun: 5, hygiene: -4 },
    line: 'Elle rigole quand je la touche. C’est perturbant.'
  },
  {
    id: 'pile',
    file: 'pile.glb',
    name: 'une pile de monstres',
    height: 0.55,
    effects: { hunger: 38, energy: -3 },
    line: 'Trois étages. Je commence par le haut.'
  },
  {
    id: 'soupe',
    file: 'soupe.glb',
    name: 'une soupe aux yeux',
    height: 0.3,
    effects: { hunger: 28, energy: 5 },
    line: 'La soupe me fixe. Je fixe la soupe. On verra qui cède.'
  },
  {
    id: 'burger',
    file: 'burger.glb',
    name: 'un burger cyclope',
    height: 0.44,
    effects: { hunger: 34, hygiene: -5 },
    line: 'Il n’a qu’un œil et il n’a pas l’air content.'
  },
  {
    id: 'soda',
    file: 'soda.glb',
    name: 'un soda gluant',
    height: 0.48,
    effects: { hunger: 18, fun: 8, energy: 7 },
    line: 'Ça pétille et ça grogne en même temps.'
  }
];
