#!/usr/bin/env python3
"""Normalise une image d'horizon pour le moteur.

    python3 tools/prepare_horizon.py source.png destination.png

Le shader du fond suppose deux choses, et une image qui ne les respecte pas
paraît mal cadrée ou saute pendant les fondus entre les moments de la journée :

**Un rapport de 4 pour 1.** La hauteur du cylindre qui porte l'horizon en
découle. Une image plus haute serait écrasée.

**Un paysage occupant les 78 % du bas.** C'est ce qui décide de la hauteur
perçue à l'écran. Livrées telles quelles, les images en occupaient entre 55 % et
80 % : le relief changeait de taille d'un moment à l'autre de la journée.

Le script rogne donc le vide au-dessus du paysage, met le contenu à l'échelle,
et le repose sur un fond transparent aux bonnes proportions.
"""
import sys

import numpy as np
from PIL import Image

LARGEUR = 2048
HAUTEUR = 512
PART_CONTENU = 0.78  # fraction basse occupée par le paysage


def preparer(source, destination):
    image = Image.open(source).convert("RGBA")
    alpha = np.asarray(image)[:, :, 3]

    lignes = np.where((alpha > 12).any(axis=1))[0]
    if not len(lignes):
        raise SystemExit(f"{source} : image entièrement transparente")

    # On rogne au ras du contenu, en haut seulement : le bas doit rester collé
    # au sol, c'est là que le paysage rejoint le terrain.
    haut = int(lignes.min())
    contenu = image.crop((0, haut, image.width, image.height))

    cible_h = int(round(HAUTEUR * PART_CONTENU))
    contenu = contenu.resize((LARGEUR, cible_h), Image.LANCZOS)

    sortie = Image.new("RGBA", (LARGEUR, HAUTEUR), (0, 0, 0, 0))
    sortie.paste(contenu, (0, HAUTEUR - cible_h))

    # Gris + alpha plutôt que couleur : l'image ne porte qu'une clé de
    # profondeur et une découpe, les trois canaux de couleur y sont identiques.
    # On divise le poids par trois sans rien perdre.
    tableau = np.asarray(sortie)
    gris = tableau[:, :, :3].mean(axis=2).astype(np.uint8)
    # Paliers arrondis : les dégradés continus font gonfler un PNG, alors que
    # le shader n'a besoin que de plans nettement séparés.
    gris = (gris // 4 * 4).astype(np.uint8)
    Image.merge("LA", [Image.fromarray(gris, "L"), sortie.getchannel("A")]).save(
        destination, optimize=True
    )

    return {
        "rogne": haut,
        "part": cible_h / HAUTEUR
    }


if __name__ == "__main__":
    infos = preparer(sys.argv[1], sys.argv[2])
    print(f"{sys.argv[2]} : {infos['rogne']} px rognés en haut, paysage sur {infos['part']:.0%}")
