#!/usr/bin/env python3
"""Simplifie un .glb trop lourd : reduit le nombre de triangles et recompresse
les textures.

Usage :
    python3 tools/decimate_glb.py entree.glb sortie.glb [triangles_cibles] [taille_texture]

Exemple :
    python3 tools/decimate_glb.py Oeuf_brut.glb public/assets/models/moonberry/oeuf.glb 40000 1024

Methode : regroupement par cellules (vertex clustering). L'espace est decoupe en
une grille 3D ; tous les sommets d'une meme cellule fusionnent en un seul. La
resolution de la grille est trouvee par dichotomie pour atteindre la cible.

Les coordonnees UV entrent dans la cle de regroupement, ce qui evite d'ecraser
les coutures de texture. Les normales sont recalculees a partir des nouvelles
faces plutot que moyennees, ce qui donne un resultat plus propre.

C'est moins fin qu'une decimation par erreur quadrique (Blender, MeshLab), mais
ca ne demande aucune dependance et c'est largement suffisant pour un objet
organique vu sur un telephone.
"""
import io
import json
import struct
import sys

import numpy as np

try:
    from PIL import Image
except ImportError:  # la recompression des textures devient optionnelle
    Image = None

COMPONENT = {5120: "b", 5121: "B", 5122: "h", 5123: "H", 5125: "I", 5126: "f"}
NCOMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def read_glb(path):
    data = open(path, "rb").read()
    magic, version, _ = struct.unpack("<4sII", data[:12])
    assert magic == b"glTF" and version == 2, "fichier glTF binaire v2 attendu"
    offset, gltf, binary = 12, None, b""
    while offset < len(data) - 8:
        clen, ctype = struct.unpack("<I4s", data[offset:offset + 8])
        chunk = data[offset + 8:offset + 8 + clen]
        if ctype == b"JSON":
            gltf = json.loads(chunk.decode("utf-8"))
        elif ctype.startswith(b"BIN"):
            binary = chunk
        offset += 8 + clen
    return gltf, binary


def read_accessor(gltf, binary, index):
    acc = gltf["accessors"][index]
    view = gltf["bufferViews"][acc["bufferView"]]
    start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    n = NCOMP[acc["type"]]
    dtype = np.dtype("<" + COMPONENT[acc["componentType"]])
    count = acc["count"] * n
    array = np.frombuffer(binary, dtype=dtype, count=count, offset=start)
    return array.reshape(acc["count"], n) if n > 1 else array


def cluster(positions, uvs, grid):
    """Renvoie l'indice de cluster de chaque sommet pour une grille donnee."""
    lo = positions.min(axis=0)
    span = np.maximum(positions.max(axis=0) - lo, 1e-9)
    cell = np.floor((positions - lo) / span * grid).astype(np.int64)
    np.clip(cell, 0, grid - 1, out=cell)

    key = cell[:, 0] * grid * grid + cell[:, 1] * grid + cell[:, 2]

    if uvs is not None:
        # Les UV participent a la cle : deux sommets superposes mais de part et
        # d'autre d'une couture restent distincts.
        uv_bins = 48
        uv_cell = np.floor(np.clip(uvs, 0, 0.999999) * uv_bins).astype(np.int64)
        key = key * (uv_bins * uv_bins) + uv_cell[:, 0] * uv_bins + uv_cell[:, 1]

    _, inverse = np.unique(key, return_inverse=True)
    return inverse


def decimate(positions, uvs, indices, target_tris):
    tris = indices.reshape(-1, 3)
    low, high = 8, 512
    best = None

    for _ in range(12):
        grid = (low + high) // 2
        inverse = cluster(positions, uvs, grid)
        new_tris = inverse[tris]
        # On jette les triangles devenus degeneres (deux sommets fusionnes).
        keep = (
            (new_tris[:, 0] != new_tris[:, 1])
            & (new_tris[:, 1] != new_tris[:, 2])
            & (new_tris[:, 0] != new_tris[:, 2])
        )
        new_tris = new_tris[keep]
        count = len(new_tris)
        best = (inverse, new_tris, grid, count)
        if count > target_tris * 1.15:
            high = grid - 1
        elif count < target_tris * 0.85:
            low = grid + 1
        else:
            break
        if low > high:
            break

    inverse, new_tris, grid, count = best
    n_clusters = inverse.max() + 1

    # Position et UV du representant : la moyenne des sommets du cluster.
    def average(values):
        out = np.zeros((n_clusters, values.shape[1]), dtype=np.float64)
        np.add.at(out, inverse, values)
        counts = np.bincount(inverse, minlength=n_clusters).reshape(-1, 1)
        return (out / np.maximum(counts, 1)).astype(np.float32)

    new_pos = average(positions.astype(np.float64))
    new_uv = average(uvs.astype(np.float64)) if uvs is not None else None

    # Sommets orphelins : on compacte pour ne garder que ceux utilises.
    used = np.unique(new_tris)
    remap = np.full(n_clusters, -1, dtype=np.int64)
    remap[used] = np.arange(len(used))
    new_tris = remap[new_tris]
    new_pos = new_pos[used]
    if new_uv is not None:
        new_uv = new_uv[used]

    return new_pos, new_uv, new_tris.astype(np.uint32), grid


def face_normals(positions, tris):
    """Normales lissees, ponderees par l'aire des faces."""
    a, b, c = positions[tris[:, 0]], positions[tris[:, 1]], positions[tris[:, 2]]
    cross = np.cross(b - a, c - a)
    normals = np.zeros_like(positions, dtype=np.float64)
    for column in range(3):
        np.add.at(normals, tris[:, column], cross)
    length = np.linalg.norm(normals, axis=1, keepdims=True)
    return (normals / np.maximum(length, 1e-12)).astype(np.float32)


def shrink_images(gltf, payloads, max_size, quality=85):
    if Image is None:
        return
    for image in gltf.get("images", []):
        if "bufferView" not in image:
            continue
        index = image["bufferView"]
        try:
            img = Image.open(io.BytesIO(payloads[index]))
        except Exception:
            continue
        img.thumbnail((max_size, max_size), Image.LANCZOS)
        out = io.BytesIO()
        alpha = img.mode in ("RGBA", "LA") and img.getchannel("A").getextrema()[0] < 255
        if alpha:
            img.save(out, format="PNG", optimize=True)
            image["mimeType"] = "image/png"
        else:
            img.convert("RGB").save(out, format="JPEG", quality=quality, optimize=True)
            image["mimeType"] = "image/jpeg"
        payloads[index] = out.getvalue()


def pad4(buf, filler=b"\x00"):
    while len(buf) % 4:
        buf += filler
    return buf


def main(src, dst, target_tris=40000, tex_size=1024):
    gltf, binary = read_glb(src)

    mesh = gltf["meshes"][0]
    assert len(mesh["primitives"]) == 1, "un seul groupe de faces attendu"
    prim = mesh["primitives"][0]

    positions = read_accessor(gltf, binary, prim["attributes"]["POSITION"])
    uvs = (
        read_accessor(gltf, binary, prim["attributes"]["TEXCOORD_0"])
        if "TEXCOORD_0" in prim["attributes"]
        else None
    )
    indices = read_accessor(gltf, binary, prim["indices"]).astype(np.int64).ravel()

    before = len(indices) // 3
    new_pos, new_uv, new_tris, grid = decimate(positions, uvs, indices, target_tris)
    new_nrm = face_normals(new_pos, new_tris)
    print(f"  maillage : {before} -> {len(new_tris)} triangles (grille {grid})")

    # --- Nouveaux tampons pour la geometrie ---
    payloads = []
    for view in gltf["bufferViews"]:
        start = view.get("byteOffset", 0)
        payloads.append(binary[start:start + view["byteLength"]])

    shrink_images(gltf, payloads, tex_size)

    # Les anciens bufferViews de geometrie ne servent plus : on repart d'une
    # liste ne contenant que les images, puis on ajoute la nouvelle geometrie.
    image_views = {img["bufferView"] for img in gltf.get("images", []) if "bufferView" in img}
    kept = sorted(image_views)
    remap_view = {old: new for new, old in enumerate(kept)}
    new_views = [dict(gltf["bufferViews"][i]) for i in kept]
    new_payloads = [payloads[i] for i in kept]
    for img in gltf.get("images", []):
        if "bufferView" in img:
            img["bufferView"] = remap_view[img["bufferView"]]

    def add(array, target=None):
        new_payloads.append(array.tobytes())
        view = {"byteLength": len(new_payloads[-1])}
        if target:
            view["target"] = target
        new_views.append(view)
        return len(new_views) - 1

    accessors = []

    def add_accessor(array, kind, component, view_index, minmax=False):
        acc = {
            "bufferView": view_index,
            "componentType": component,
            "count": len(array),
            "type": kind,
        }
        if minmax:
            acc["min"] = array.min(axis=0).tolist()
            acc["max"] = array.max(axis=0).tolist()
        accessors.append(acc)
        return len(accessors) - 1

    pos_acc = add_accessor(new_pos, "VEC3", 5126, add(new_pos, 34962), minmax=True)
    nrm_acc = add_accessor(new_nrm, "VEC3", 5126, add(new_nrm, 34962))
    attributes = {"POSITION": pos_acc, "NORMAL": nrm_acc}
    if new_uv is not None:
        attributes["TEXCOORD_0"] = add_accessor(new_uv, "VEC2", 5126, add(new_uv, 34962))

    flat = new_tris.ravel().astype(np.uint32)
    idx_acc = add_accessor(flat.reshape(-1, 1), "SCALAR", 5125, add(flat, 34963))
    accessors[idx_acc]["count"] = len(flat)

    prim["attributes"] = attributes
    prim["indices"] = idx_acc
    gltf["accessors"] = accessors
    gltf["bufferViews"] = new_views
    gltf["meshes"] = [{"primitives": [prim], "name": mesh.get("name", "mesh")}]
    gltf.pop("skins", None)
    gltf.pop("animations", None)

    # --- Reassemblage ---
    blob = bytearray()
    for i, view in enumerate(new_views):
        while len(blob) % 4:
            blob.append(0)
        view["buffer"] = 0
        view["byteOffset"] = len(blob)
        view["byteLength"] = len(new_payloads[i])
        blob.extend(new_payloads[i])

    gltf["buffers"] = [{"byteLength": len(blob)}]

    json_chunk = pad4(json.dumps(gltf, separators=(",", ":")).encode("utf-8"), b" ")
    bin_chunk = pad4(bytes(blob))
    total = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)
    with open(dst, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, total))
        f.write(struct.pack("<I4s", len(json_chunk), b"JSON"))
        f.write(json_chunk)
        f.write(struct.pack("<I4s", len(bin_chunk), b"BIN\x00"))
        f.write(bin_chunk)
    return total


if __name__ == "__main__":
    source, destination = sys.argv[1], sys.argv[2]
    tris = int(sys.argv[3]) if len(sys.argv) > 3 else 40000
    size = int(sys.argv[4]) if len(sys.argv) > 4 else 1024
    original = len(open(source, "rb").read())
    final = main(source, destination, tris, size)
    print(f"{source}: {original/1e6:.1f} Mo -> {final/1e6:.1f} Mo")
