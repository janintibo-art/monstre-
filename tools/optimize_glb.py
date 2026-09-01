#!/usr/bin/env python3
"""Reduit le poids d'un .glb en recompressant ses textures embarquees.

Usage : python3 optimize_glb.py entree.glb sortie.glb [taille_max]

Le maillage n'est pas touche : seules les images sont redimensionnees et
converties en JPEG (ou laissees en PNG si elles ont un canal alpha utile).
"""
import io
import json
import struct
import sys

from PIL import Image


def read_glb(path):
    data = open(path, "rb").read()
    magic, version, _ = struct.unpack("<4sII", data[:12])
    assert magic == b"glTF" and version == 2, "fichier glTF binaire v2 attendu"
    offset = 12
    gltf = None
    binary = b""
    while offset < len(data) - 8:
        clen, ctype = struct.unpack("<I4s", data[offset:offset + 8])
        chunk = data[offset + 8:offset + 8 + clen]
        if ctype == b"JSON":
            gltf = json.loads(chunk.decode("utf-8"))
        elif ctype.startswith(b"BIN"):
            binary = chunk
        offset += 8 + clen
    return gltf, binary


def pad4(buf, filler=b"\x00"):
    while len(buf) % 4:
        buf += filler
    return buf


def optimize(src, dst, max_size=1024, quality=85):
    gltf, binary = read_glb(src)
    views = gltf["bufferViews"]

    # Nouveau contenu pour chaque bufferView (image recompressee ou original)
    payloads = []
    for i, view in enumerate(views):
        start = view.get("byteOffset", 0)
        payloads.append(binary[start:start + view["byteLength"]])

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
        has_alpha = img.mode in ("RGBA", "LA") and img.getchannel("A").getextrema()[0] < 255
        if has_alpha:
            img.save(out, format="PNG", optimize=True)
            image["mimeType"] = "image/png"
        else:
            img.convert("RGB").save(out, format="JPEG", quality=quality, optimize=True)
            image["mimeType"] = "image/jpeg"
        payloads[index] = out.getvalue()

    # Reconstruction du buffer avec les nouveaux offsets
    new_bin = bytearray()
    for i, view in enumerate(views):
        while len(new_bin) % 4:
            new_bin.append(0)
        view["byteOffset"] = len(new_bin)
        view["byteLength"] = len(payloads[i])
        new_bin.extend(payloads[i])

    gltf["buffers"] = [{"byteLength": len(new_bin)}]
    for view in views:
        view["buffer"] = 0

    json_chunk = pad4(json.dumps(gltf, separators=(",", ":")).encode("utf-8"), b" ")
    bin_chunk = pad4(bytes(new_bin))

    total = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)
    with open(dst, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, total))
        f.write(struct.pack("<I4s", len(json_chunk), b"JSON"))
        f.write(json_chunk)
        f.write(struct.pack("<I4s", len(bin_chunk), b"BIN\x00"))
        f.write(bin_chunk)
    return total


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    size = int(sys.argv[3]) if len(sys.argv) > 3 else 1024
    before = len(open(src, "rb").read())
    after = optimize(src, dst, size)
    print(f"{src}: {before/1e6:.1f} Mo -> {after/1e6:.1f} Mo")
