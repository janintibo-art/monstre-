#!/usr/bin/env python3
"""Rend une planche d'images de la créature en train de marcher, depuis son .glb.

    python3 tools/render_sprite.py modele.glb sortie.png [images] [taille]

Pourquoi : la créature qui se promène sur l'écran du téléphone est affichée par
une fenêtre système, en dehors du jeu. Y charger un moteur 3D coûterait cher en
mémoire et en batterie, et dépendre d'internet pour afficher un rappel serait
absurde. Une planche d'images pèse quelques dizaines de kilo-octets, s'affiche
instantanément et fonctionne hors ligne.

Le script applique vraiment le squelette : il lit l'animation de marche, calcule
la pose à chaque instant, déforme le maillage en conséquence, puis rastérise en
échantillonnant la texture. Ce n'est pas une pose figée retournée dans tous les
sens — ce sont de vraies images de la marche.
"""
import io
import json
import struct
import sys

import numpy as np
from PIL import Image

COMPONENT = {5120: "b", 5121: "B", 5122: "h", 5123: "H", 5125: "I", 5126: "f"}
NCOMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def read_glb(path):
    data = open(path, "rb").read()
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


def accessor(gltf, binary, index):
    acc = gltf["accessors"][index]
    view = gltf["bufferViews"][acc["bufferView"]]
    start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    n = NCOMP[acc["type"]]
    dtype = np.dtype("<" + COMPONENT[acc["componentType"]])
    array = np.frombuffer(binary, dtype=dtype, count=acc["count"] * n, offset=start)
    return array.reshape(acc["count"], n) if n > 1 else array


# --------------------------------------------------------------- matrices

def trs(translation, rotation, scale):
    """Compose une matrice depuis translation, quaternion et échelle."""
    x, y, z, w = rotation
    m = np.eye(4, dtype=np.float64)
    m[:3, :3] = np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ])
    m[:3, :3] *= np.array(scale)
    m[:3, 3] = translation
    return m


def node_local(node):
    if "matrix" in node:
        return np.array(node["matrix"], dtype=np.float64).reshape(4, 4).T
    return trs(
        node.get("translation", [0, 0, 0]),
        node.get("rotation", [0, 0, 0, 1]),
        node.get("scale", [1, 1, 1]),
    )


def sample_animation(gltf, binary, clip, time, node_count):
    """Renvoie les transformations locales de chaque nœud à l'instant demandé."""
    overrides = {}
    for channel in clip.get("channels", []):
        target = channel.get("target", {})
        node = target.get("node")
        path = target.get("path")
        if node is None or path not in ("translation", "rotation", "scale"):
            continue
        sampler = clip["samplers"][channel["sampler"]]
        times = accessor(gltf, binary, sampler["input"]).astype(np.float64).ravel()
        values = accessor(gltf, binary, sampler["output"]).astype(np.float64)
        if not len(times):
            continue

        t = float(np.clip(time, times[0], times[-1]))
        i = int(np.searchsorted(times, t, side="right") - 1)
        i = max(0, min(i, len(times) - 2)) if len(times) > 1 else 0

        if len(times) == 1:
            value = values[0]
        else:
            span = max(times[i + 1] - times[i], 1e-9)
            k = (t - times[i]) / span
            a, b = values[i], values[i + 1]
            if path == "rotation":
                # Interpolation sphérique, sinon les membres se raccourcissent
                # au milieu de chaque pas.
                dot = float(np.dot(a, b))
                if dot < 0:
                    b, dot = -b, -dot
                if dot > 0.9995:
                    value = a + (b - a) * k
                else:
                    theta = np.arccos(np.clip(dot, -1, 1))
                    s = np.sin(theta)
                    value = (np.sin((1 - k) * theta) / s) * a + (np.sin(k * theta) / s) * b
                value = value / max(np.linalg.norm(value), 1e-9)
            else:
                value = a + (b - a) * k

        overrides.setdefault(node, {})[path] = value
    return overrides


def world_matrices(gltf, overrides):
    nodes = gltf["nodes"]
    world = [None] * len(nodes)
    parent = {}
    for i, node in enumerate(nodes):
        for child in node.get("children", []):
            parent[child] = i

    def resolve(i):
        if world[i] is not None:
            return world[i]
        node = dict(nodes[i])
        if i in overrides:
            node.pop("matrix", None)
            node.update(overrides[i])
        local = node_local(node)
        world[i] = local if i not in parent else resolve(parent[i]) @ local
        return world[i]

    for i in range(len(nodes)):
        resolve(i)
    return world


def skin_positions(gltf, binary, mesh_node, world):
    """Applique le squelette au maillage et renvoie les sommets en monde."""
    node = gltf["nodes"][mesh_node]
    prim = gltf["meshes"][node["mesh"]]["primitives"][0]
    positions = accessor(gltf, binary, prim["attributes"]["POSITION"]).astype(np.float64)
    homogeneous = np.hstack([positions, np.ones((len(positions), 1))])

    if "skin" not in node:
        return (homogeneous @ world[mesh_node].T)[:, :3]

    skin = gltf["skins"][node["skin"]]
    joints = skin["joints"]
    inverse = accessor(gltf, binary, skin["inverseBindMatrices"]).astype(np.float64)
    inverse = inverse.reshape(-1, 4, 4).transpose(0, 2, 1)  # glTF stocke en colonnes

    matrices = np.stack([world[j] @ inverse[k] for k, j in enumerate(joints)])

    j0 = accessor(gltf, binary, prim["attributes"]["JOINTS_0"]).astype(np.int64)
    w0 = accessor(gltf, binary, prim["attributes"]["WEIGHTS_0"]).astype(np.float64)
    sets = [(j0, w0)]
    if "JOINTS_1" in prim["attributes"]:
        sets.append((
            accessor(gltf, binary, prim["attributes"]["JOINTS_1"]).astype(np.int64),
            accessor(gltf, binary, prim["attributes"]["WEIGHTS_1"]).astype(np.float64),
        ))

    out = np.zeros((len(positions), 4), dtype=np.float64)
    for joint_set, weight_set in sets:
        for slot in range(4):
            idx = joint_set[:, slot]
            w = weight_set[:, slot]
            mask = w > 1e-6
            if not mask.any():
                continue
            transformed = np.einsum("nij,nj->ni", matrices[idx[mask]], homogeneous[mask])
            out[mask] += transformed * w[mask, None]
    return out[:, :3]


# ------------------------------------------------------------ rastérisation

def load_texture(gltf, binary):
    material = gltf.get("materials", [{}])[0]
    base = material.get("pbrMetallicRoughness", {}).get("baseColorTexture")
    if not base:
        return None
    texture = gltf["textures"][base["index"]]
    image = gltf["images"][texture["source"]]
    if "bufferView" not in image:
        return None
    view = gltf["bufferViews"][image["bufferView"]]
    start = view.get("byteOffset", 0)
    raw = binary[start:start + view["byteLength"]]
    return np.asarray(Image.open(io.BytesIO(raw)).convert("RGB"), dtype=np.float64) / 255.0


def render(positions, uvs, tris, texture, size, bounds):
    lo, hi = bounds
    centre = (lo + hi) / 2
    span = float((hi - lo).max()) * 1.08
    q = (positions - centre) / span

    sx = (q[:, 0] * 0.92 + 0.5) * size
    sy = (0.5 - q[:, 1] * 0.92) * size
    sz = q[:, 2]

    rgba = np.zeros((size, size, 4), dtype=np.float64)
    zbuf = np.full((size, size), -9.0)

    a, b, c = tris[:, 0], tris[:, 1], tris[:, 2]
    normals = np.cross(positions[b] - positions[a], positions[c] - positions[a])
    normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-9)
    light = np.array([0.35, 0.55, 0.75])
    light /= np.linalg.norm(light)
    shade = np.clip(normals @ light, 0, 1) * 0.45 + 0.6

    th, tw = (texture.shape[0], texture.shape[1]) if texture is not None else (1, 1)

    for t in range(len(tris)):
        i0, i1, i2 = tris[t]
        x0, x1, x2 = sx[i0], sx[i1], sx[i2]
        y0, y1, y2 = sy[i0], sy[i1], sy[i2]
        minx = int(max(0, np.floor(min(x0, x1, x2))))
        maxx = int(min(size - 1, np.ceil(max(x0, x1, x2))))
        miny = int(max(0, np.floor(min(y0, y1, y2))))
        maxy = int(min(size - 1, np.ceil(max(y0, y1, y2))))
        if minx > maxx or miny > maxy:
            continue

        det = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
        if abs(det) < 1e-9:
            continue

        X, Y = np.meshgrid(np.arange(minx, maxx + 1), np.arange(miny, maxy + 1))
        w0 = ((y1 - y2) * (X - x2) + (x2 - x1) * (Y - y2)) / det
        w1 = ((y2 - y0) * (X - x2) + (x0 - x2) * (Y - y2)) / det
        w2 = 1 - w0 - w1
        inside = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
        if not inside.any():
            continue

        z = w0 * sz[i0] + w1 * sz[i1] + w2 * sz[i2]
        window = zbuf[miny:maxy + 1, minx:maxx + 1]
        keep = inside & (z > window)
        if not keep.any():
            continue
        window[keep] = z[keep]

        if texture is not None and uvs is not None:
            u = w0 * uvs[i0, 0] + w1 * uvs[i1, 0] + w2 * uvs[i2, 0]
            v = w0 * uvs[i0, 1] + w1 * uvs[i1, 1] + w2 * uvs[i2, 1]
            px = np.clip((u % 1.0) * (tw - 1), 0, tw - 1).astype(np.int32)
            py = np.clip((v % 1.0) * (th - 1), 0, th - 1).astype(np.int32)
            colour = texture[py[keep], px[keep]]
        else:
            colour = np.ones((int(keep.sum()), 3)) * 0.75

        target = rgba[miny:maxy + 1, minx:maxx + 1]
        target[..., :3][keep] = np.clip(colour * shade[t], 0, 1)
        target[..., 3][keep] = 1.0

    return (rgba * 255).astype(np.uint8)


def main(src, dst, frames=8, size=192, clip_name="walk"):
    gltf, binary = read_glb(src)

    mesh_node = next(i for i, n in enumerate(gltf["nodes"]) if "mesh" in n)
    prim = gltf["meshes"][gltf["nodes"][mesh_node]["mesh"]]["primitives"][0]
    tris = accessor(gltf, binary, prim["indices"]).astype(np.int64).ravel().reshape(-1, 3)
    uvs = (
        accessor(gltf, binary, prim["attributes"]["TEXCOORD_0"]).astype(np.float64)
        if "TEXCOORD_0" in prim["attributes"]
        else None
    )
    texture = load_texture(gltf, binary)

    clips = gltf.get("animations", [])
    clip = None
    for candidate in clips:
        if clip_name in candidate.get("name", "").lower():
            clip = candidate
            break
    if clip is None and clips:
        clip = clips[0]

    # Durée du clip, pour répartir les images sur un cycle complet.
    duration = 1.0
    if clip:
        ends = []
        for channel in clip["channels"]:
            times = accessor(gltf, binary, clip["samplers"][channel["sampler"]]["input"])
            if len(times):
                ends.append(float(times[-1]))
        if ends:
            duration = max(ends)

    poses = []
    for i in range(frames):
        time = duration * i / frames
        overrides = sample_animation(gltf, binary, clip, time, len(gltf["nodes"])) if clip else {}
        world = world_matrices(gltf, overrides)
        poses.append(skin_positions(gltf, binary, mesh_node, world))

    # Cadre commun à toutes les images : sinon la créature grandit et rétrécit
    # d'une image à l'autre au lieu de marcher.
    allpts = np.vstack(poses)
    bounds = (allpts.min(axis=0), allpts.max(axis=0))

    strip = Image.new("RGBA", (size * frames, size), (0, 0, 0, 0))
    for i, positions in enumerate(poses):
        image = Image.fromarray(render(positions, uvs, tris, texture, size, bounds), "RGBA")
        strip.paste(image, (size * i, 0))

    strip = strip.quantize(colors=192, method=Image.FASTOCTREE).convert("RGBA")
    strip.save(dst, optimize=True)
    return strip.size


if __name__ == "__main__":
    source, destination = sys.argv[1], sys.argv[2]
    count = int(sys.argv[3]) if len(sys.argv) > 3 else 8
    px = int(sys.argv[4]) if len(sys.argv) > 4 else 192
    dims = main(source, destination, count, px)
    print(f"{destination} : planche {dims[0]}x{dims[1]}, {count} images")
