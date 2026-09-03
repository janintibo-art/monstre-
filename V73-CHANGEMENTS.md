# Monstre de Compagnie — v73

Cette version vise la finition et la stabilité d'une utilisation privée. Elle ne rajoute aucune contrainte liée à une publication Google Play.

## Corrections techniques

- Correction du workflow GitHub `release.yml` : la modification du manifeste et la compilation Gradle sont maintenant deux étapes valides.
- Les changements rapides de décor ne peuvent plus réinjecter un ancien décor une fois le nouveau demandé.
- Les géométries **et les matériaux clonés** des décors sont libérés lors d'un changement de biome.
- Les anciennes textures d'horizon sont libérées quand un nouvel horizon les remplace.
- Les textures chargées par une demande devenue obsolète sont libérées au lieu de rester en mémoire GPU.
- Le test de budget 3D compte maintenant tous les meshes/primitives d'un GLB, pas seulement le premier.

## Performances

- Sous-bois : environ **912 175 → 650 106 triangles** au niveau Normal.
- Nouveau réglage **Qualité graphique** :
  - Auto
  - Économie
  - Normal
  - Magnifique
- Le niveau agit sur le pixel ratio, la taille des ombres, les nuages, les particules et la densité du décor.
- En mode Auto, si la moyenne descend sous environ 42 FPS pendant plusieurs secondes, l'application baisse automatiquement d'un cran.

## Vie du monstre

- Ajout de petites réactions spontanées quand la scène est calme : observer, se gratter, bâiller et saluer.
- Ces gestes restent silencieux et ne coupent ni les jeux, ni la conversation, ni les repas.

## Interface et confidentialité

- Les boutons de test du micro et de la voix utilisent les icônes graphiques de l'application quand elles sont disponibles.
- Le réglage IA explique désormais clairement que les derniers échanges et certains souvenirs utiles sont transmis au fournisseur quand une IA en ligne est utilisée.
- Le mode IA locale reste celui à utiliser pour que les échanges restent sur l'appareil.
