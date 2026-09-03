#!/usr/bin/env python3
"""Simplifie un modèle **animé** sans casser son squelette.

    python3 tools/decimate_rigged.py source.glb destination.glb [triangles] [texture]

`decimate_glb.py` supprime purement et simplement `skins` et `animations` : il
est fait pour le décor, qui ne bouge pas. L'appliquer à une créature la
figerait.

Ce script-ci regroupe les sommets sur une grille, comme l'autre, mais transporte
aussi les **poids et indices d'os** du sommet représentatif de chaque groupe. Le
squelette, les matrices de liaison et les animations sont laissés intacts : ils
désignent des nœuds, pas des sommets.

Deux limites, mesurées et non supposées :

**La qualité de surface.** Le regroupement par grille est une méthode fruste.
Sur un modèle à détails fins — des facettes de cristal, par exemple — même une
réduction de 207 000 à 93 000 triangles rend la surface visiblement croûteuse.
Comparer un rendu avant/après avant d'adopter le résultat n'est pas une
précaution, c'est la seule façon de savoir. Si le modèle souffre, mieux vaut le
réexporter depuis Meshy à un réglage plus bas : son simplificateur préserve la
forme bien mieux que celui-ci.

**La déformation.** Les poids du sommet représentatif ne valent pas la moyenne
de son groupe ; à forte réduction, les articulations peuvent trembler.

Ce script sert donc aux maillages massifs et lisses, pas aux modèles ciselés.
"""
import json
import struct
import sys

import numpy as np

COMPONENT = {5120: "b", 5121: "B", 5122: "h", 5123: "H", 5125: "I", 5126: "f"}
NCOMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def read_glb(path):
    data = open(path, "rb").read()
    offset, gltf, binary = 12, None, b""
    while offset < len(data) - 8:
        length, kind = struct.unpack("<I4s", data[offset:offset + 8])
        chunk = data[offset + 8:offset + 8 + length]
        if kind == b"JSON":
            gltf = json.loads(chunk.decode("utf-8"))
        elif kind.startswith(b"BIN"):
            binary = chunk
        offset += 8 + length
    return gltf, binary


def read_accessor(gltf, binary, index):
    acc = gltf["accessors"][index]
    view = gltf["bufferViews"][acc["bufferView"]]
    start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    n = NCOMP[acc["type"]]
    dtype = np.dtype("<" + COMPONENT[acc["componentType"]])
    array = np.frombuffer(binary, dtype=dtype, count=acc["count"] * n, offset=start)
    return array.reshape(acc["count"], n) if n > 1 else array


def grouper(positions, cible):
    """Trouve la finesse de grille qui approche le nombre de triangles visé."""
    lo, hi = positions.min(axis=0), positions.max(axis=0)
    etendue = np.maximum(hi - lo, 1e-9)

    basse, haute = 8, 320
    meilleur = haute
    for _ in range(12):
        milieu = (basse + haute) // 2
        cellule = etendue / milieu
        cles = np.floor((positions - lo) / cellule).astype(np.int64)
        uniques = len(np.unique(cles, axis=0))
        # Environ deux triangles par sommet sur une surface fermée.
        if uniques * 2 > cible:
            haute = milieu
            meilleur = milieu
        else:
            basse = milieu + 1
    return meilleur


def simplifier(chemin, sortie, cible=20000, texture=1024):
    gltf, binary = read_glb(chemin)

    mesh = gltf["meshes"][0]
    prim = mesh["primitives"][0]
    attrs = prim["attributes"]

    positions = read_accessor(gltf, binary, attrs["POSITION"]).astype(np.float32)
    indices = read_accessor(gltf, binary, prim["indices"]).astype(np.int64).ravel()
    avant = len(indices) // 3

    if avant <= cible:
        print(f"  {avant} triangles : déjà sous la cible, rien à faire")
        return False

    # --- Regroupement sur grille -------------------------------------------
    finesse = grouper(positions, cible)
    lo = positions.min(axis=0)
    cellule = np.maximum(positions.max(axis=0) - lo, 1e-9) / finesse
    cles = np.floor((positions - lo) / cellule).astype(np.int64)

    _, premier, inverse = np.unique(cles, axis=0, return_index=True, return_inverse=True)

    # `premier` donne, pour chaque groupe, l'indice du sommet représentatif.
    # C'est de LUI que viennent tous les attributs — position, normale, UV,
    # mais surtout poids et indices d'os. Moyenner des indices d'os n'aurait
    # aucun sens : ce sont des désignations, pas des grandeurs.
    representants = premier

    triangles = inverse[indices].reshape(-1, 3)
    valides = (
        (triangles[:, 0] != triangles[:, 1])
        & (triangles[:, 1] != triangles[:, 2])
        & (triangles[:, 0] != triangles[:, 2])
    )
    triangles = triangles[valides].astype(np.uint32)

    print(f"  maillage : {avant} -> {len(triangles)} triangles (grille {finesse})")

    # --- Reconstruction des tampons ----------------------------------------
    charges = []
    for view in gltf["bufferViews"]:
        depart = view.get("byteOffset", 0)
        charges.append(binary[depart:depart + view["byteLength"]])

    # Les accesseurs du squelette et des animations doivent survivre : ils
    # décrivent des matrices et des courbes, pas de la géométrie.
    a_garder = set()
    for skin in gltf.get("skins", []):
        if "inverseBindMatrices" in skin:
            a_garder.add(skin["inverseBindMatrices"])
    for anim in gltf.get("animations", []):
        for sampler in anim["samplers"]:
            a_garder.add(sampler["input"])
            a_garder.add(sampler["output"])

    nouveaux_views = []
    nouvelles_charges = []
    remap_view = {}

    def copier_view(ancien):
        if ancien in remap_view:
            return remap_view[ancien]
        nouvelles_charges.append(charges[ancien])
        nouveaux_views.append({"byteLength": len(charges[ancien])})
        remap_view[ancien] = len(nouveaux_views) - 1
        return remap_view[ancien]

    # Images d'abord, pour garder leur bufferView valide.
    for img in gltf.get("images", []):
        if "bufferView" in img:
            img["bufferView"] = copier_view(img["bufferView"])

    nouveaux_acc = []
    remap_acc = {}

    for ancien in sorted(a_garder):
        acc = dict(gltf["accessors"][ancien])
        vue = gltf["bufferViews"][acc["bufferView"]]
        depart = vue.get("byteOffset", 0) + acc.get("byteOffset", 0)
        n = NCOMP[acc["type"]]
        taille = np.dtype("<" + COMPONENT[acc["componentType"]]).itemsize
        morceau = binary[depart:depart + acc["count"] * n * taille]
        nouvelles_charges.append(morceau)
        nouveaux_views.append({"byteLength": len(morceau)})
        acc["bufferView"] = len(nouveaux_views) - 1
        acc.pop("byteOffset", None)
        nouveaux_acc.append(acc)
        remap_acc[ancien] = len(nouveaux_acc) - 1

    def ajouter(tableau, kind, composant, cible_buffer=None, minmax=False):
        octets = tableau.tobytes()
        nouvelles_charges.append(octets)
        vue = {"byteLength": len(octets)}
        if cible_buffer:
            vue["target"] = cible_buffer
        nouveaux_views.append(vue)
        acc = {
            "bufferView": len(nouveaux_views) - 1,
            "componentType": composant,
            "count": len(tableau),
            "type": kind,
        }
        if minmax:
            acc["min"] = tableau.min(axis=0).tolist()
            acc["max"] = tableau.max(axis=0).tolist()
        nouveaux_acc.append(acc)
        return len(nouveaux_acc) - 1

    nouveaux_attrs = {}
    nouvelles_positions = positions[representants]
    nouveaux_attrs["POSITION"] = ajouter(nouvelles_positions, "VEC3", 5126, 34962, minmax=True)

    for nom, kind, composant in (
        ("NORMAL", "VEC3", 5126),
        ("TEXCOORD_0", "VEC2", 5126),
        ("JOINTS_0", "VEC4", None),
        ("WEIGHTS_0", "VEC4", None),
    ):
        if nom not in attrs:
            continue
        source_acc = gltf["accessors"][attrs[nom]]
        valeurs = read_accessor(gltf, binary, attrs[nom])[representants]
        type_composant = composant or source_acc["componentType"]
        nouveaux_attrs[nom] = ajouter(
            np.ascontiguousarray(valeurs), kind, type_composant, 34962
        )

    plat = triangles.ravel().astype(np.uint32)
    idx = ajouter(plat.reshape(-1, 1), "SCALAR", 5125, 34963)
    nouveaux_acc[idx]["count"] = len(plat)

    prim["attributes"] = nouveaux_attrs
    prim["indices"] = idx
    gltf["meshes"] = [{"primitives": [prim], "name": mesh.get("name", "mesh")}]

    for skin in gltf.get("skins", []):
        if "inverseBindMatrices" in skin:
            skin["inverseBindMatrices"] = remap_acc[skin["inverseBindMatrices"]]
    for anim in gltf.get("animations", []):
        for sampler in anim["samplers"]:
            sampler["input"] = remap_acc[sampler["input"]]
            sampler["output"] = remap_acc[sampler["output"]]

    gltf["accessors"] = nouveaux_acc
    gltf["bufferViews"] = nouveaux_views

    # --- Réassemblage -------------------------------------------------------
    blob = bytearray()
    for i, vue in enumerate(nouveaux_views):
        while len(blob) % 4:
            blob.append(0)
        vue["buffer"] = 0
        vue["byteOffset"] = len(blob)
        blob.extend(nouvelles_charges[i])
    while len(blob) % 4:
        blob.append(0)

    gltf["buffers"] = [{"byteLength": len(blob)}]
    texte = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    while len(texte) % 4:
        texte += b" "

    total = 12 + 8 + len(texte) + 8 + len(blob)
    with open(sortie, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, total))
        f.write(struct.pack("<I4s", len(texte), b"JSON"))
        f.write(texte)
        f.write(struct.pack("<I4s", len(blob), b"BIN\x00"))
        f.write(blob)
    return True


if __name__ == "__main__":
    source, destination = sys.argv[1], sys.argv[2]
    cible = int(sys.argv[3]) if len(sys.argv) > 3 else 20000
    import os

    simplifier(source, destination, cible)
    print(f"{destination} : {os.path.getsize(destination) / 1e6:.1f} Mo")
