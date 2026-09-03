# Contribuer

Le projet est libre. Voici ce qu'il faut savoir pour y toucher sans casser
quelque chose.

## Avant de pousser

```bash
npm run check     # tests + détection des identifiants non déclarés
```

118 tests couvrent la sauvegarde, les jeux, la mémoire, la reconnaissance
vocale, le pense-bête, les profils et le rendu. Ils tournent sans navigateur et
en moins d'une seconde. **Un test qui échoue signale un vrai problème** : la
suite a déjà attrapé un générateur aléatoire biaisé, un shader qui ne compilait
plus, et une bulle de dialogue déplacée par une règle CSS.

Après une version qui ajoute des dépendances :

```bash
npm run verrou    # régénère package-lock.json, à committer
```

## Règles apprises à la dure

Chacune vient d'un défaut réel, et chacune est verrouillée par un test.

**Shaders**

- Tout uniforme employé dans un shader doit y être **déclaré**. Un oubli fait
  échouer la compilation, et Three.js se contente alors de ne rien afficher :
  l'objet disparaît sans message. L'horizon a manqué pendant six versions.
- Les bornes de `smoothstep` vont en **ordre croissant**. À l'envers, la
  spécification GLSL déclare le résultat indéfini ; certains pilotes renvoient 1
  partout.

**Modèles 3D**

- Ne jamais forcer `material.side`. Les modèles issus de Meshy déclarent
  `doubleSided` parce que la simplification inverse le sens de certaines faces —
  moins de 60 % des triangles d'un arbre pointent vers l'extérieur.
- Le décor au-delà de douze unités utilise les modèles allégés (`_loin`), et
  aucun décor ne dépasse le million de triangles par image.

**Capacitor**

- Un module Capacitor ne doit **jamais** être renvoyé par une fonction `async`.
  JavaScript interroge `.then` sur la valeur produite ; le module étant un
  proxy, il transforme la question en appel natif, qui échoue silencieusement.
- Les motifs de `.gitignore` visant les dossiers natifs sont **ancrés**
  (`/android/`). Sans la barre oblique, ils excluent aussi
  `plugins/*/android/`.

**Tests multiplateformes**

- La suite tourne sur Linux, macOS **et Windows**. Aucune hypothèse de
  plateforme : pas de `/tmp` codé en dur — `os.tmpdir()` — et pas d'appel à
  `python3`, qui n'existe pas sous Windows. Un test qui suppose son système
  fait échouer un job sur trois pour une raison sans rapport avec le code, et
  l'on cherche alors le défaut là où il n'est pas.

**Interface**

- `backdrop-filter` est réservé aux surfaces peu nombreuses : il force le
  navigateur à relire et flouter la scène sous chaque élément, à chaque image.
- La bulle de dialogue reste en `position: fixed` — son emplacement est calculé
  en pixels depuis la projection de la tête de la créature.

## Ajouter du contenu

| Quoi | Où |
| --- | --- |
| Un jeu éducatif | un fichier dans `src/games/list/`, un import dans `index.js` |
| Une espèce | un dossier dans `public/assets/models/`, une entrée dans `species.js` |
| Un plat | le `.glb` dans `models/food/`, une entrée dans `food-catalog.js` |
| Un sujet de conversation | `src/games/topics.js` |
| Une section du guide | `src/content/guide.js` |

Les contraintes de production des modèles et images sont dans
[docs/RESSOURCES-A-PRODUIRE.md](docs/RESSOURCES-A-PRODUIRE.md), et les invites
prêtes à l'emploi dans [docs/INVITES-CHATGPT.md](docs/INVITES-CHATGPT.md).

## Ce à quoi le projet tient

- **Tout fonctionne hors ligne.** L'IA distante est facultative, et son absence
  ne dégrade que la conversation.
- **Rien ne quitte l'appareil** sans que l'utilisateur l'ait demandé.
- **Aucune donnée personnelle superflue** : un prénom, une tranche d'âge. Pas
  de nom de famille, pas d'adresse, pas de date de naissance.
- **Les jeux ne sanctionnent jamais.** Ni chronomètre, ni vies, ni son d'échec.
