# Modèles 3D

| Fichier       | Rôle                              |
| ------------- | --------------------------------- |
| `Monstre.glb` | La créature après éclosion        |
| `Oeuf.glb`    | L'œuf avant éclosion              |

Si un fichier est absent ou illisible, le jeu retombe automatiquement sur la
créature générée par code. Aucun réglage à faire.

## Mise à l'échelle

Inutile de calibrer quoi que ce soit dans Blender : le moteur recentre le
modèle, pose ses pieds au sol et le redimensionne (1,5 unité de haut pour le
monstre, 1,25 pour l'œuf). Exporte simplement avec **+Y vers le haut** et le
personnage face à **+Z**.

## Animations

Le moteur cherche un **fragment** de nom dans les clips du fichier, pas une
correspondance exacte : `Walking` est reconnu par le mot-clé `walk`. Aucun
renommage n'est nécessaire.

| Mots-clés cherchés              | Quand le clip se joue           |
| ------------------------------- | ------------------------------- |
| `idle`, `repos`, `arise`        | au repos, bouderie              |
| `walk`, `marche`                | déplacement, exploration        |
| `run`, `jump`, `saut`, `play`   | jeu                             |
| `danc`                          | euphorie                        |
| `sleep`, `sommeil`, `dormir`    | sommeil                         |
| `agree`, `gesture`, `wave`      | câlin, repas, demande d'attention |

Les clips contenant `arise`, `agree`, `gesture` ou `wave` sont joués **une seule
fois** puis figés sur leur dernière image, au lieu d'être bouclés.

Le modèle actuel contient `Agree_Gesture`, `Arise`, `Running` et `Walking`.
Il manque un clip d'attente et un clip de sommeil : en attendant, la pose finale
d'`Arise` sert de position debout, et la respiration reste procédurale.

Sans aucune animation, le moteur anime le modèle entier : respiration,
sautillement, inclinaison, secousses de réaction.

## Poids

Vise **moins de 2 Mo par modèle**. Les textures pèsent bien plus lourd que le
maillage : un modèle de 3 000 triangles avec deux PNG en 4096 px fait 20 Mo,
alors que les mêmes textures en JPEG 1024 px donnent 1 Mo pour un rendu
identique sur téléphone.

Le script `tools/optimize_glb.py` fait ce travail :

```bash
python3 tools/optimize_glb.py mon_export.glb public/assets/models/Monstre.glb 1024
```
