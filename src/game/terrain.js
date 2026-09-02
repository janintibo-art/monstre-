// Relief du terrain.
//
// Le sol était un disque parfaitement plat : c'est ce qui donnait cet aspect de
// maquette posée sur une table. Un peu de relief change tout, à condition de
// respecter une règle : **l'aire de jeu reste plate.**
//
// L'amplitude est nulle au centre et croît vers l'extérieur. La créature évolue
// donc toujours sur du plan — pas de calcul de suivi de terrain, pas de risque
// qu'elle s'enfonce ou flotte — pendant que les alentours ondulent franchement.
// On obtient le bénéfice visuel sans aucun des ennuis.
//
// La fonction est déterministe et partagée par le sol, le décor et les objets
// posés : tous doivent s'accorder sur la même hauteur, sinon un arbre flotte.

// Rayon jusqu'où le terrain reste strictement plat, puis rayon où le relief
// atteint sa pleine amplitude.
const PLAT = 6.5;
const PLEIN = 15;
const AMPLITUDE = 1.15;

function courbe(t) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

// Somme de trois ondes de longueurs incommensurables : aucune ne se répète en
// phase avec les autres, donc le relief ne montre pas de motif.
export function hauteurSol(x, z, graine = 0) {
  const rayon = Math.hypot(x, z);
  if (rayon <= PLAT) return 0;

  const force = courbe((rayon - PLAT) / (PLEIN - PLAT)) * AMPLITUDE;
  const d = graine * 0.37;

  return (
    force *
    (Math.sin(x * 0.21 + d) * Math.cos(z * 0.17 - d) * 0.6 +
      Math.sin((x + z) * 0.34 + d * 1.7) * 0.28 +
      Math.cos(x * 0.53 - z * 0.41 + d * 0.6) * 0.12)
  );
}

export const TERRAIN = { PLAT, PLEIN, AMPLITUDE };
