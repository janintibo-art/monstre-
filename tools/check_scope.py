#!/usr/bin/env python3
"""Repere les identifiants utilises sans avoir ete declares.

    python3 tools/check_scope.py

`node --check` ne valide que la syntaxe : un `anim.scale.y = ...` ou `anim`
n'existe pas passe le controle et ne casse qu'a l'execution, en pleine partie.
Ce script attrape cette famille d'erreurs sans avoir a lancer le jeu.

Il est volontairement approximatif. Les faux positifs habituels sont des
fragments de chaines de caracteres, des noms de methodes abregees dans un objet
retourne, et des parametres par defaut. En cas de doute, verifie a la main :
un vrai manque est presque toujours un nom qui n'apparait qu'une seule fois
ailleurs dans le fichier.
"""
import re, sys, glob

GLOBALS = set("""
window document localStorage console performance navigator fetch Promise Math JSON Date Array
Object String Number Boolean Set Map Error requestAnimationFrame cancelAnimationFrame setTimeout
clearTimeout setInterval clearInterval AbortController Float32Array Uint32Array Int32Array
undefined null true false NaN Infinity import export default this arguments AudioContext
SpeechSynthesisUtterance FileReader Image Intl RegExp Symbol Proxy Reflect BigInt encodeURIComponent
decodeURIComponent isNaN parseFloat parseInt structuredClone crypto TextEncoder alert confirm
""".split())

KEYWORDS = set("""
const let var function class return if else for while do switch case break continue new typeof
instanceof in of delete void throw try catch finally async await yield extends super get set
static from as with debugger
""".split())

def declared(src):
    names = set()
    # imports
    for m in re.finditer(r'import\s+([^;]+?)\s+from', src):
        chunk = m.group(1)
        for part in re.findall(r'[A-Za-z_$][\w$]*', chunk):
            if part not in ('as',):
                names.add(part)
    # declarations, y compris destructuration
    for m in re.finditer(r'\b(?:const|let|var)\s+(\{[^}]*\}|\[[^\]]*\]|[A-Za-z_$][\w$]*)', src):
        for part in re.findall(r'[A-Za-z_$][\w$]*', m.group(1)):
            names.add(part)
    for m in re.finditer(r'\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)', src):
        names.add(m.group(1))
    for m in re.finditer(r'\bclass\s+([A-Za-z_$][\w$]*)', src):
        names.add(m.group(1))
    # parametres de fonction et fonctions flechees
    for m in re.finditer(r'(?:function\s*\*?\s*[A-Za-z_$\w]*\s*|\)\s*=>|=>)?\(([^()]*)\)\s*(?:=>|\{)', src):
        for part in re.findall(r'[A-Za-z_$][\w$]*', m.group(1)):
            names.add(part)
    for m in re.finditer(r'([A-Za-z_$][\w$]*)\s*=>', src):
        names.add(m.group(1))
    # methodes abregees d'objet et labels
    for m in re.finditer(r'\bcatch\s*\(\s*([A-Za-z_$][\w$]*)', src):
        names.add(m.group(1))
    for m in re.finditer(r'\bfor\s*\(\s*(?:const|let|var)?\s*([A-Za-z_$][\w$]*)', src):
        names.add(m.group(1))
    return names

def used(src):
    # on retire chaines, gabarits, commentaires, acces aux proprietes et cles
    s = re.sub(r'//.*', '', src)
    s = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
    s = re.sub(r'`(?:[^`\\]|\\.)*`', '""', s, flags=re.S)
    s = re.sub(r"'(?:[^'\\]|\\.)*'", '""', s)
    s = re.sub(r'"(?:[^"\\]|\\.)*"', '""', s)
    s = re.sub(r'\.\s*[A-Za-z_$][\w$]*', '', s)          # acces aux proprietes
    s = re.sub(r'([A-Za-z_$][\w$]*)\s*:', '', s)          # cles d'objet
    return set(re.findall(r'\b[A-Za-z_$][\w$]*\b', s))

bad = 0
for path in sorted(glob.glob('src/**/*.js', recursive=True)):
    src = open(path).read()
    unknown = used(src) - declared(src) - GLOBALS - KEYWORDS
    unknown = {n for n in unknown if not n.isupper() or n in ('THREE',)}
    if unknown:
        bad += 1
        print(f'{path}: {sorted(unknown)}')
print('OK' if not bad else f'{bad} fichier(s) a verifier')
