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

Le moteur cherche des clips par leur nom et bascule dessus automatiquement :

| Nom du clip dans Blender          | Quand il se joue                |
| --------------------------------- | ------------------------------- |
| `idle` ou `repos`                 | au repos, mendicité, câlin      |
| `walk` ou `marche`                | déplacement, exploration        |
| `play`, `jump` ou `saut`          | jeu                             |
| `dance` ou `danse`                | euphorie                        |
| `sleep`, `sommeil` ou `dormir`    | sommeil                         |
| `sad` ou `triste`                 | bouderie                        |

Sans aucune animation, le moteur anime le modèle entier : respiration,
sautillement, inclinaison, secousses de réaction. C'est le cas aujourd'hui —
le squelette est présent mais aucun clip n'est exporté.

## Poids

Vise **moins de 2 Mo par modèle**. Les textures pèsent bien plus lourd que le
maillage : un modèle de 3 000 triangles avec deux PNG en 4096 px fait 20 Mo,
alors que les mêmes textures en JPEG 1024 px donnent 1 Mo pour un rendu
identique sur téléphone.

Le script `tools/optimize_glb.py` fait ce travail :

```bash
python3 tools/optimize_glb.py mon_export.glb public/assets/models/Monstre.glb 1024
```
