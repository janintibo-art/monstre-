# Modèles 3D

Un dossier par espèce. Le jeu tire l'espèce au sort à partir de la graine de
l'œuf, puis change de modèle au fil de la croissance.

```
models/
├── gigglehorn/
│   ├── oeuf.glb
│   └── jeune.glb
└── moonberry/
    ├── oeuf.glb
    ├── jeune.glb
    └── vieux.glb
```

Le catalogue vit dans `src/game/species.js`. Pour ajouter une espèce : crée son
dossier, dépose les `.glb`, ajoute une entrée. Rien d'autre à modifier.

## Stades de vie

Quatre stades : `baby`, `child`, `teen`, `adult`. Un stade sans modèle propre
reprend celui du stade précédent — tu peux donc démarrer une espèce avec un seul
modèle et l'étoffer plus tard. Le changement de corps se fait sur place, avec
une gerbe de particules.

Chaque modèle n'est téléchargé que lorsque la créature atteint son stade.

## Mise à l'échelle

Inutile de calibrer quoi que ce soit dans Blender : le moteur mesure le modèle
après calcul du skinning, corrige par itérations, pose les pieds au sol et le
centre. Exporte avec **+Y vers le haut** et le personnage face à **+Z**.

## Animations

Le moteur cherche un **fragment** de nom dans les clips, pas une correspondance
exacte : `Walking` est reconnu par le mot-clé `walk`. Aucun renommage nécessaire.

| Mots-clés cherchés              | Quand le clip se joue             |
| ------------------------------- | --------------------------------- |
| `idle`, `repos`, `arise`        | au repos, bouderie                |
| `walk`, `marche`                | déplacement, exploration          |
| `run`, `jump`, `saut`, `play`   | jeu                               |
| `danc`                          | euphorie                          |
| `sleep`, `sommeil`, `dormir`    | sommeil                           |
| `agree`, `gesture`, `wave`      | câlin, repas, demande d'attention |

Les clips contenant `arise`, `agree`, `gesture` ou `wave` sont joués une seule
fois puis figés sur leur dernière image, au lieu d'être bouclés.

Sans aucune animation, le moteur anime le modèle entier : respiration,
sautillement, inclinaison, secousses de réaction.

## Poids : les deux outils

Vise **moins de 2 Mo par modèle**. Deux problèmes distincts, deux outils.

**Textures trop lourdes** — le cas le plus fréquent. Un modèle de 3 000
triangles avec deux PNG en 4096 px pèse 20 Mo ; les mêmes en JPEG 1024 px font
1 Mo, pour un rendu identique sur téléphone.

```bash
python3 tools/optimize_glb.py export.glb public/assets/models/espece/jeune.glb 1024
```

**Maillage trop dense** — typique des exports non simplifiés. Le second œuf
arrivait avec 3 millions de triangles pour 114 Mo, au-dessus de la limite de
100 Mo par fichier imposée par GitHub.

```bash
python3 tools/decimate_glb.py export.glb public/assets/models/espece/oeuf.glb 45000 1024
```

Le second outil fait aussi le travail du premier. Il ne gère pas les modèles
animés : réserve-le aux objets fixes comme les œufs.
