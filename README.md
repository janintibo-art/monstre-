# Monstre de Compagnie

**Un compagnon virtuel pour apprendre en jouant.** Un œuf éclot, une créature en sort. Elle a un caractère tiré de son génome, des
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

## Vérifier

```bash
npm test          # 22 tests : sauvegarde, migrations, progression, mémoire
npm run check     # + détection des identifiants non déclarés
```

Les tests couvrent la logique pure — création, éclosion, stades, besoins,
extraction de faits, oubli, migrations de sauvegarde, valeurs corrompues,
import/export. Ils tournent sans navigateur ni Three.js, avec le lanceur
intégré de Node : aucune dépendance à installer. Le workflow les exécute avant
chaque build.

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

> **Depuis un téléphone**, n'installe pas les dépendances : l'outil de
> génération d'icônes repose sur `sharp`, qui n'a pas de binaire pour Android
> ARM64 et fait échouer tout `npm install`. Il est volontairement absent des
> dépendances du projet — la CI le récupère à la volée avec `npx`, sous Linux,
> où il fonctionne. Sur téléphone, contente-toi de `--package-lock-only`.

## Builds reproductibles

L'archive ne contient pas de `package-lock.json`. Génère-le une fois, puis
versionne-le :

```bash
npm install --package-lock-only
git add package-lock.json
git commit -m "Lockfile"
```

`--package-lock-only` calcule l'arbre de dépendances **sans rien installer** :
pas de téléchargement, pas de compilation native, quelques secondes. C'est ce
qu'il faut depuis un téléphone, où certains paquets n'ont pas de binaire ARM64
et feraient échouer une installation complète.

Dès qu'il est présent, le workflow bascule de `npm install` à `npm ci` : deux
builds à deux dates différentes installent exactement les mêmes versions.

Les dépendances épinglées datent de la création du projet. Pour les mettre à
jour, fais-le dans une branche, une famille à la fois (Vite, puis Electron,
puis Capacitor), avec `npm audit` et un test sur appareil entre chaque.
Jamais `npm audit fix --force` : il peut changer de version majeure sans
prévenir.

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

## Lui parler au micro

Le bouton **🎤 Parler** écoute et transmet ce que tu dis à la créature, qui
répond dans sa bulle, à voix haute. **💬 Écrire** garde la saisie au clavier ;
les deux aboutissent à la même réponse.

Deux moteurs, essayés dans cet ordre :

1. **Le module natif** `@capacitor-community/speech-recognition`. C'est lui qui
   compte sur téléphone : la reconnaissance vocale du navigateur n'est pas
   fiable dans une WebView Android, alors que le moteur natif l'est. Il demande
   l'autorisation micro au premier usage.
2. **L'API du navigateur**, pour le développement dans un vrai Chrome.

> Sur la version Windows, ça ne marchera pas : Electron n'embarque pas de moteur
> de reconnaissance vocale. Le jeu le dit et bascule sur la saisie clavier plutôt
> que d'échouer en silence.

Pendant l'écoute, la voix de la créature est coupée — sinon le micro la reprend
et elle finit par se répondre à elle-même. La transcription s'affiche en direct
sous la scène, pour qu'on voie que l'application entend bien quelque chose.

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

**0. Mémoire (`src/ai/memory.js` et `facts.js`)**

Trois couches, qui ne servent pas à la même chose :

- **Les gestes** — file des soins récents et compteurs cumulés. Court terme,
  sert au score de négligence et aux habitudes.
- **Les faits** — ce qu'elle sait de toi. Extraits de ce que tu dis par des
  motifs en français : prénom, âge, ville, métier, goûts, dégoûts, proches,
  projets, humeur. Pas de modèle de langage, ça tourne hors ligne. C'est
  volontairement modeste : mieux vaut retenir cinq choses justes que trente
  approximatives — une créature qui se trompe sur ton prénom est pire qu'une
  créature qui ne le connaît pas.
- **Le fil** — les derniers échanges, pour répondre dans la continuité.

**Et surtout, elle oublie.** Chaque fait a une force qui monte quand tu le
répètes et retombe avec le temps : 0,9 point par jour pour une intention datée,
0,22 pour un goût, 0,05 pour ton prénom. Sous 0,18, le souvenir s'efface. C'est
ce qui rend le fait qu'elle se souvienne significatif : si elle retenait tout
pour toujours, se souvenir ne voudrait rien dire.

**··· → Voir ses souvenirs** montre tout ce qu'elle retient, avec la force de
chaque souvenir en barre latérale — un souvenir qui pâlit est en train de
s'effacer, il suffit d'en reparler pour le raviver. Tu peux lui faire oublier
un souvenir précis, ou tout effacer.

Le modèle distant reçoit ce résumé plus les six derniers échanges, avec
consigne explicite de ne jamais inventer un souvenir absent de la liste.

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

## Pour qui

Le **profil du joueur**, dans les réglages, va de 3 ans à « Confort ». Il règle
les jeux proposés, leur difficulté, le débit de la voix, la taille du texte et
des boutons, et le ton de la créature quand une IA est branchée — avec une
consigne qui lui interdit explicitement d'être infantilisante avec une personne
âgée.

Le mode **confort** (texte et cibles agrandis, deux colonnes au lieu de trois)
s'active automatiquement pour les tout-petits et le profil senior, et se force à
la main pour tout le monde.

## Discuter, pas seulement jouer

La première carte de l'écran Jeux est **Papoter avec moi**. La créature propose
un sujet et pose la première question : les saisons, la cuisine, le métier qu'on
a fait, les voyages, la famille, l'école. Puis elle relance d'elle-même, une
question à la fois.

C'est délibéré : devant un champ de saisie vide, beaucoup de gens ne trouvent
rien à dire et referment. Le sujet lève cet obstacle. Une fois sur trois, il
vient de ce que la créature a retenu des conversations précédentes.

Les jeux y mènent aussi. Après un proverbe, une ville ou un prix d'autrefois, un
bouton **En parler** enchaîne sur la discussion — le jeu devient un prétexte à
se raconter.

Micro et clavier passent par la même voie que le reste : même mémoire, même IA,
mêmes garde-fous.

## Les jeux

Le bouton **🎓 Jeux** ouvre quinze jeux, chacun avec sa propre mécanique :

| Jeu | Compétence | Âges |
| --- | --- | --- |
| Les couleurs | Observation | 3 à 7 |
| Compter | Nombres | 3 à 8 |
| Les formes | Observation | 4 à 8 |
| La première lettre | Lecture | 4 à 8 |
| Plus ou moins | Nombres | 4 à 10 |
| Le calcul | Mathématiques | 5 et + |
| Que vient après ? | Logique | 5 et + |
| Répète après moi | Mémoire | 4 et + |
| Quelle heure est-il ? | Temps | 6 et + |
| Trouvez l'intrus | Logique | 5 et + |
| Complétez le proverbe | Langue | 12 et + |
| Les mots (synonymes, contraires) | Langue | 8 et + |
| Mots mélangés | Langue | 8 et + |
| Rendre la monnaie | Calcul | 8 et + |
| Géographie | Culture | 9 et + |

Les six derniers sont pensés pour les adultes et les personnes âgées : on n'y
teste pas une capacité, on réveille un savoir déjà là. Trouver la fin d'un
proverbe qu'on connaît depuis soixante ans fait plaisir, et « rendre la
monnaie » est le même calcul que 20 − 13,40 mais il a du sens.

L'âge indiqué dans les réglages choisit les jeux **et** leur difficulté : le
calcul va des additions jusqu'à dix aux divisions, l'horloge des heures pleines
aux cinq minutes, la suite mémorisée de deux à six couleurs.

Trois principes de conception :

1. **Tout ce qui est écrit est aussi dit.** Les consignes sont prononcées pour
   de vrai, même si la créature parle en babil le reste du temps — un enfant qui
   ne lit pas encore doit pouvoir jouer seul. Un bouton « Relire » les répète.
2. **Jamais de sanction.** Ni chronomètre, ni vies, ni son d'échec. Une erreur
   donne un encouragement, la deuxième un indice, la troisième la réponse et on
   passe. Une réponse fausse ne disparaît pas : la faire disparaître empêcherait
   de comprendre pourquoi elle était fausse.
3. **On joue avec la créature.** Elle se réjouit d'une bonne réponse, danse
   quand la partie est bien réussie, et son besoin de jeu se remplit.

L'aide vient des indices écrits dans chaque jeu, donc **hors ligne**. Si une IA
distante est configurée, elle reformule l'indice — sans jamais donner la
réponse — et le bouton « Pourquoi ? » développe l'explication. Une réponse
distante qui arrive après que l'enfant a répondu est jetée.

Pour ajouter un jeu : un fichier dans `src/games/list/`, un import dans
`src/games/index.js`. Sa tranche d'âge suffit à le faire apparaître. Un champ
`talk` optionnel dans une question fait apparaître le bouton « En parler ».

## Le guide intégré

**··· → Comment ça marche ?** ouvre dix sections, dont une entière sur la clé
d'API : ce que c'est (un mot de passe, pas un logiciel), si c'est payant (non),
où elle va, et pourquoi tout fonctionne sans. Chaque section se fait lire à voix
haute. La dernière, « Pour les parents », dit exactement ce qui sort de
l'appareil et dans quel cas.

## Le cadrage : paysage verrouillé

Le jeu se verrouille en **paysage**. C'est la seule orientation où l'on voit
correctement la créature : en portrait, à 42 degrés d'angle sur un écran 20:9,
il ne reste que **deux unités de large** contre plus de neuf en paysage. Élargir
l'angle pour compenser rapetissait la créature au point de perdre ce qu'on
était venu regarder — cette compensation a donc été retirée.

Les **panneaux libèrent le verrou** : réglages, souvenirs et conversation sont
des listes et des formulaires, ils se lisent mieux à la verticale et le clavier
y prend moins de place. Le verrou revient à la fermeture.

Il reste deux garde-fous, utiles quel que soit l'écran : l'aire de jeu est une
ellipse calculée depuis le cadrage réel, et un rappel progressif ramène la
créature si elle se retrouve dehors.

Sur navigateur et sur la version Windows, il n'y a rien à verrouiller : les
appels échouent silencieusement et le jeu fonctionne normalement.

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
Trois modèles — arbre, plante, champignon — répartis en quantités différentes
selon le décor : neuf champignons au sous-bois, deux arbres seulement sur
l'éboulis. Chacun a son amplitude de balancement, parce qu'un champignon ne
bouge pas comme un arbre. Chaque modèle passe par un `InstancedMesh` : un seul
appel de rendu quel qu'en soit le nombre.

## Ce qui est déjà là

- **Effets visuels** (`src/game/vfx.js`) : chaque type de particule a sa forme
  dessinée au canvas — halo, étincelle à quatre branches, cœur, bulle de savon
  avec reflet, éclat, miette irrégulière, Z de sommeil — avec rotation propre,
  courbe de taille et dégradé de couleur sur la durée de vie. S'y ajoutent des
  ondes de choc au sol, un faisceau de lumière, un voile plein écran et une
  secousse de caméra.
- L'éclosion est une mise en scène en trois temps : la lumière cède d'abord,
  la matière ensuite, puis un second souffle pendant que les éclats retombent.
  L'inverse se lirait comme une explosion, pas comme une naissance.
- Œuf avec fissures progressives dessinées en canvas, qui laissent échapper de
  la lumière à mesure que l'éclosion approche.
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
- Sauvegarde locale avec **chaîne de migrations** (une sauvegarde ancienne est
  migrée, jamais jetée), **copie de secours** avant toute migration ou reset,
  **validation champ par champ** des valeurs (NaN, bornes, types, longueurs),
  et **export/import JSON** depuis les réglages. Rattrapage du temps hors ligne
  plafonné à 12 heures.
- Opérations asynchrones protégées par un jeton de génération : un reset ou un
  changement de décor rapide invalide les chargements en cours au lieu de les
  laisser s'appliquer par-dessus l'état courant.
- Mouvements réduits (`prefers-reduced-motion`) respectés jusque dans la 3D :
  plus de secousse, de flash ni de parallaxe, moitié moins de particules.

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
