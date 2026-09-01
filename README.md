# Monstre de Compagnie

Un œuf éclot, une créature en sort. Elle a un caractère tiré de son génome, des
besoins qui se dégradent en temps réel, une mémoire de ce que tu fais et une IA
qui décide seule de ce qu'elle veut faire. Le tout en 3D, sur une seule base de
code, exportée en **APK Android** et en **.exe Windows** par GitHub Actions.

---

## Choix technique

Une base web (Vite + Three.js) emballée par Capacitor pour Android et par
Electron pour Windows. Une seule logique de jeu à écrire, deux exécutables à la
sortie, et des builds CI qui tiennent en quelques minutes sans licence ni SDK
propriétaire. Si tu préfères un moteur natif (Godot 4 exporte aussi vers APK et
EXE), dis-le : la structure du projet resterait proche, seul le rendu changerait.

Aucune dépendance lourde : `three` en production, `vite`, `electron`,
`electron-builder` et `capacitor` en développement.

## Démarrer

```bash
npm install      # à faire une fois
npm run dev      # http://localhost:5173
```

Ouvre la page, tapote l'œuf pour l'aider à éclore, puis occupe-toi de ce qui
en sort.

## Construire

```bash
npm run build            # version web dans dist/
npm run electron:dev     # tester la fenêtre Windows en local
npm run electron:build   # .exe portable + installateur dans release/
npm run android:add      # génère le projet natif Android (une seule fois)
npm run android:sync     # recopie le build web dans le projet Android
npm run android:open     # ouvre Android Studio
```

Prérequis pour l'APK en local : JDK 17 et Android Studio. Sur GitHub Actions,
tout est installé automatiquement, tu n'as rien à faire.

## Publier sur GitHub

```bash
git init
git add .
git commit -m "Base du projet"
git branch -M main
git remote add origin https://github.com/TON-COMPTE/monstre.git
git push -u origin main
```

Le workflow `Build APK et EXE` se lance à chaque push sur `main`. Récupère les
fichiers dans l'onglet **Actions → dernier run → Artifacts**.

Pour une vraie release publique :

```bash
git tag v0.1.0 && git push --tags
```

Le workflow `release.yml` crée alors une Release GitHub avec l'APK et le .exe
attachés.

> L'APK produit est signé en mode **debug**. Il s'installe sur ton téléphone
> (il faut autoriser les sources inconnues) mais pas sur le Play Store. Pour
> publier, il faudra générer un keystore et le stocker dans les secrets du dépôt.
> Le .exe n'est pas signé non plus : Windows SmartScreen affichera un
> avertissement au premier lancement.

## Tes modèles 3D

`Monstre.glb` et `Oeuf.glb` sont déjà en place dans `public/assets/models/`.
Le moteur les recentre, les met à l'échelle et les anime tout seul. Voir le
[README du dossier](public/assets/models/README.md) pour les noms de clips
d'animation reconnus.

## Tes images

Dépose-les dans `public/assets/textures/` en suivant les noms indiqués dans le
[README du dossier](public/assets/textures/README.md). Tant qu'un fichier est
absent, le moteur génère la matière par code — le jeu tourne donc dès
maintenant, sans une seule image.

---

## La voix

Deux modes, réglables dans **··· → Voix**, sans aucun fichier audio.

- **Babil** (par défaut) — des bips générés à la volée en Web Audio, une syllabe
  à la fois, avec une intonation qui descend en fin de phrase et monte pour une
  question. Fonctionne partout, y compris hors ligne et sans moteur vocal.
- **Synthèse vocale** — la voix du système prononce vraiment les mots, via la
  Web Speech API. Demande un moteur vocal installé sur l'appareil ; à défaut, le
  babil prend le relais automatiquement.

La hauteur et le débit viennent de la créature : un nouveau-né parle haut et
vite, un adulte plus bas et plus lentement, et le timbre découle du génome. La
tête bouge en rythme avec le niveau sonore.

Sur mobile, le son reste bloqué tant que l'écran n'a pas été touché une fois :
c'est une règle du navigateur, pas un bug.

## Comment l'IA fonctionne

Elle est en deux couches, et la première suffit à faire vivre la créature.

**1. Comportement (`src/ai/`, hors ligne, toujours actif)**

- `needs.js` — cinq jauges qui descendent en temps réel : faim, énergie,
  propreté, jeu, affection. La vitesse dépend du caractère : un gourmand a faim
  plus vite.
- `personality.js` — cinq traits entre 0 et 1 (curieux, sociable, gourmand,
  énergique, timide) tirés du génome, qui **dérivent** selon ce que tu fais.
  Câliner souvent rend sociable et moins timide.
- `memory.js` — file des événements récents et compteurs cumulés. Sert au score
  de négligence et à repérer ton geste favori.
- `brain.js` — une *utility AI* : chaque comportement possible reçoit un score,
  le plus haut gagne. Plus lisible qu'une machine à états, et ça produit de
  vrais arbitrages (affamé mais épuisé → il va dormir). Trois garde-fous
  évitent le clignotement : inertie, durée minimale, bruit déterministe.

**2. Parole (`src/ai/dialogue/`)**

- `local.js` — moteur de réponses hors ligne. Il repère des intentions par
  mots-clés et pioche une phrase cohérente avec l'état interne. Fonctionne sans
  réseau, donc c'est le défaut.
- `remote.js` — branchement facultatif vers un vrai modèle de langage. En cas
  d'échec ou de timeout, on retombe silencieusement sur le local.

Trois fournisseurs gratuits sont intégrés (Google Gemini, Groq, OpenRouter). Tu
choisis dans **··· → Cerveau du monstre**, tu colles ta clé, tu testes. Marche à
suivre détaillée : [docs/IA-GRATUITE.md](docs/IA-GRATUITE.md).

> La clé est enregistrée sur l'appareil, jamais dans le code : elle ne part donc
> pas sur GitHub et ne se retrouve pas dans l'APK distribué. Pour une
> application publiée avec une clé partagée, utilise l'option *Mon propre
> proxy* et `tools/proxy-example.mjs`.

## Identité visuelle

```
assets/                 sources, utilisées au moment du build
├── icon-only.png       icône carrée 1024
├── icon-foreground.png sujet réduit à 66 % pour l'icône adaptative Android
├── icon-background.png fond uni de l'icône adaptative
└── splash.png          écran de démarrage natif 2732
build/icon.ico          icône de l'exécutable Windows
public/favicon.png      onglet du navigateur
public/assets/ui/logo.png  écran de démarrage dans le jeu
```

Les icônes Android sont générées automatiquement par le workflow, via
`npx capacitor-assets generate --android`. Pour les régénérer en local après
avoir modifié un visuel :

```bash
npm run android:sync && npm run assets
```

> L'icône adaptative d'Android est recadrée en cercle ou en carré arrondi selon
> le lanceur. Le sujet doit donc tenir dans les 66 % centraux, sinon les oreilles
> et la queue se font rogner — c'est pourquoi `icon-foreground.png` est une
> version réduite et centrée, pas l'image d'origine.

## Arborescence

```
.
├── .github/workflows/     build.yml (APK + EXE) et release.yml
├── electron/              fenêtre Windows (main + preload)
├── assets/                icônes et écran de démarrage (sources)
├── build/                 icône Windows
├── public/assets/models/  un dossier par espèce
├── public/assets/         tes images et sons
├── src/
│   ├── core/              rng déterministe, boucle, chargement des textures
│   ├── game/              monde, œuf, monstre procédural, particules
│   ├── ai/                besoins, personnalité, mémoire, cerveau, dialogue
│   ├── state/             modèle du monstre, sauvegarde et temps hors ligne
│   ├── ui/                HUD, barre d'actions, chat, panneaux
│   ├── styles.css
│   └── main.js            assemblage et boucle de jeu
├── tools/proxy-example.mjs
├── capacitor.config.json
└── vite.config.js
```

## Le cycle jour / nuit

Sept moments — nuit, aube, matin, midi, après-midi, crépuscule, nuit —
interpolés en continu. Chacun définit sa palette complète : ciel, brouillard et
sa portée, lumières, étoiles. La lumière ne saute jamais d'un état à l'autre.

La course du soleil est calculée, pas scriptée : son élévation suit une
sinusoïde sur la journée, donc les ombres s'allongent le soir. L'astre visible
est au bout de l'axe de la lumière — soleil le jour, lune la nuit. Le ciel est
un dôme en dégradé piloté par deux uniformes, ce qui permet de le faire évoluer
image par image sans rien redessiner.

Quatre modes dans **··· → Cycle jour / nuit** :

| Mode | Effet |
| --- | --- |
| Heure réelle | La créature vit à ton heure. C'est le défaut. |
| Accéléré | Un tour complet en 24 minutes, pour voir le cycle. |
| Toujours jour | Figé à midi. |
| Toujours nuit | Figé à minuit. |

L'heure du cycle pilote aussi le comportement : en mode accéléré, la créature
s'endort vraiment quand la nuit tombe. Changer de mode ne provoque pas de flash,
la transition se fait comme un lever de soleil accéléré.

## Le décor

Quatre paysages — prairie, sous-bois, éboulis, terre sèche — tirés de la graine
de l'œuf, donc chaque créature a le sien. Le joueur peut en forcer un dans
**··· → Décor**, sans recharger.

Un décor ne fixe **pas** la lumière — sinon un sous-bois resterait nocturne en
plein midi. Il fournit son sol, sa couleur d'accent et une teinte d'atmosphère
mélangée au ciel à hauteur de 16 à 26 % : assez pour reconnaître le lieu, pas
assez pour nier l'heure qu'il est. Autour de l'aire de jeu, des arbres sont plantés
sur un anneau, avec une trouée côté caméra pour ne jamais masquer la créature.
Ils se balancent au vent et passent par un `InstancedMesh` : un seul appel de
rendu quel qu'en soit le nombre.

## Ce qui est déjà là

- Œuf avec fissures progressives dessinées en canvas, secousses, éclosion en
  éclats de coquille et gerbe de particules.
- Monstre 3D entièrement généré par code depuis un génome : couleur, cornes,
  oreilles, longueur de queue, taches bioluminescentes, silhouette trapue ou non.
- **Animation procédurale du squelette** (`src/game/rig.js`) : les modèles
  exportés n'ont que `Walking` et `Running`, tout le reste est calculé os par os
  — respiration, report de poids, regard réparti entre nuque et tête, sommeil
  recroquevillé, bouderie épaules rentrées, danse, mendicité bras tendus,
  mastication, salut de la main. Cette couche s'ajoute par-dessus les clips
  quand il y en a un, et prend tout en charge quand il n'y en a pas.
- Locomotion : accélération progressive, pivot sur place avant de partir,
  inclinaison dans les virages, vitesse de lecture du clip calée sur la vitesse
  réelle (plus de patinage), errance avec pauses, orbites en jeu, retrait au
  fond de la scène en bouderie.
- Quatre stades de croissance, atteints d'autant plus vite que la créature est
  bien traitée.
- Soins avec temps de recharge, réactions physiques et dérive de caractère.
- Sauvegarde locale et rattrapage du temps hors ligne, plafonné à 12 heures.

## Prochaines étapes possibles

1. **Ambiance sonore** — la voix est là, mais pas les bruits de pas, le vent, ni
   la musique. Dépose des fichiers dans `public/assets/audio/`.
2. **Plus de décor** — buissons, rochers, champignons : le système d'arbres
   accepte n'importe quel `.glb`, il suffit d'une entrée de plus dans
   `src/game/decor.js`.
3. **Ancien point sur le décor** — remplacer le sol circulaire par une vraie pièce, ou charger un
   modèle glTF pour le monstre si tu préfères le sculpter dans Blender plutôt
   que le générer par code (`GLTFLoader` s'ajoute en trois lignes dans `monster.js`).
3. **Notifications** — `@capacitor/local-notifications` pour qu'il te réclame à
   manger quand l'app est fermée.
4. **Évolutions divergentes** — la forme adulte pourrait dépendre du caractère
   accumulé : un monstre choyé et un monstre négligé ne se ressemblent pas.
5. **Signature de l'APK** — keystore en secret GitHub pour un build `release`.

## Publier depuis un téléphone

Toutes les commandes Termux, à copier une par une, sont dans
[TERMUX.md](TERMUX.md).

## Licence

MIT.
