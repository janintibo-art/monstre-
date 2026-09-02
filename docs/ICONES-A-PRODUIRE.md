# Les icônes à produire

L'application utilise 89 emoji. Ils ont trois défauts : ils **changent d'aspect
selon le téléphone** (le tien ne montre pas les mêmes qu'un Pixel ou un iPhone),
ils n'ont **aucun rapport avec ton univers graphique**, et certains sont
carrément absents sur les vieux appareils.

Tous n'ont pas la même importance. Ceux du lot 1 sont visibles en permanence ;
ceux du lot 4 apparaissent trois secondes dans un jeu.

**Le jeu accepte les icônes au fur et à mesure** : chaque fichier absent
retombe automatiquement sur l'emoji actuel. Tu peux donc en livrer cinq, voir
le résultat, et continuer.

---

## Format

- **PNG 256 × 256**, fond **transparent**.
- Dessin **clair sur fond sombre** — l'interface est bleu nuit.
- Style de ton logo : formes rondes et pleines, contours épais, couleurs
  turquoise / violet / ambre lumineux.
- **Lisible à 28 px.** C'est la taille réelle à l'écran. Un dessin qui demande
  qu'on le regarde de près ne marchera pas.
- Pas de texte, pas d'ombre portée (le jeu en ajoute une).
- Dossier : `public/assets/icons/`

---

> **Les cinq lots sont livrés** (v63) : 33 icônes et 12 avatars.
> Les icônes sont ramenées à 128 px, les avatars à 160 px — ils sont affichés
> plus grands. Poids total : 1,3 Mo au lieu de 3,2.
>
> Deux noms de fichiers ne suivent pas l'identifiant interne du jeu :
> `jeu-mots.png` sert au jeu « synonymes » et `jeu-geographie.png` au jeu
> « capitales ». La correspondance est explicite dans `src/ui/icons.js`, et un
> test vérifie que chaque jeu a bien son image.
>
> Ancienne note (v62) : les 18 icônes sont en place. Elles sont
> ramenées à 128 × 128 à l'installation — affichées entre 28 et 34 px, c'est
> largement assez même sur un écran très dense, et cela divise leur poids par
> trois.

## Lot 1 — La barre d'actions ✅ fait

Huit boutons, visibles en permanence, en bas de l'écran. **Si tu ne fais qu'un
lot, c'est celui-là.**

| Fichier | Sujet | Remplace |
| --- | --- | --- |
| `nourrir.png` | Un os avec un morceau de viande, ou une gamelle pleine | 🍖 |
| `balle.png` | Une balle de jeu rebondie, à coutures visibles | 🎾 |
| `laver.png` | Une bulle de savon avec deux bulles plus petites | 🫧 |
| `caliner.png` | Une main ouverte, paume vers l'avant, doigts arrondis | ✋ |
| `dormir.png` | Un croissant de lune avec une petite étoile | 🌙 |
| `jeux.png` | Un chapeau de diplômé, ou des cubes à lettres | 🎓 |
| `parler.png` | Un microphone rond sur pied court | 🎤 |
| `ecrire.png` | Une bulle de dialogue avec trois points | 💬 |

---

## Lot 2 — Les boutons de réglages ✅ fait

Sept icônes, dans les panneaux.

| Fichier | Sujet | Remplace |
| --- | --- | --- |
| `profil.png` | Une silhouette de buste, simple | 👤 |
| `agenda.png` | Un calendrier avec une pastille sur un jour | 📅 |
| `guide.png` | Un livre ouvert | 📖 |
| `haut-parleur.png` | Un haut-parleur avec deux ondes | 🔊 |
| `modifier.png` | Un crayon incliné | ✎ |
| `rejouer.png` | Une flèche circulaire | 🎲 |
| `etoile.png` | Une étoile pleine à cinq branches (score des jeux) | ⭐ |

---

## Lot 3 — Les états ✅ fait

Trois petites images, mais elles portent une information.

| Fichier | Sujet | Remplace |
| --- | --- | --- |
| `micro-actif.png` | Le microphone, entouré d'un halo rouge | 🔴 |
| `soleil.png` | Un soleil aux rayons courts et arrondis | ☀️ |
| `alerte.png` | Un triangle d'avertissement doux, coins arrondis | ⚠️ |

---

## Lot 4 — Les jeux éducatifs ✅ fait

Quinze icônes, sur les cartes du menu des jeux. Elles gagneraient à former une
famille cohérente : même épaisseur de trait, même palette.

| Fichier | Jeu | Sujet |
| --- | --- | --- |
| `jeu-couleurs.png` | Les couleurs | Trois pastilles de couleur qui se chevauchent |
| `jeu-compter.png` | Compter | Trois pommes alignées |
| `jeu-formes.png` | Les formes | Un rond, un carré et un triangle imbriqués |
| `jeu-lettres.png` | La première lettre | Un grand **A** avec une petite image à côté |
| `jeu-comparer.png` | Plus ou moins | Une balance à deux plateaux inégaux |
| `jeu-calcul.png` | Le calcul | Un signe **+** épais et un **=** |
| `jeu-suites.png` | Que vient après ? | Trois points croissants et un point d'interrogation |
| `jeu-memoire.png` | Répète après moi | Quatre pastilles de couleur en croix |
| `jeu-horloge.png` | Quelle heure est-il ? | Une horloge à aiguilles |
| `jeu-intrus.png` | Trouvez l'intrus | Trois ronds pareils et un carré |
| `jeu-proverbes.png` | Complétez le proverbe | Un parchemin déroulé |
| `jeu-mots.png` | Les mots | Un dictionnaire ouvert avec un signet |
| `jeu-anagrammes.png` | Mots mélangés | Trois lettres en désordre et une flèche |
| `jeu-monnaie.png` | Rendre la monnaie | Trois pièces empilées |
| `jeu-geographie.png` | Géographie | Un globe simplifié avec un repère |

---

## Lot 5 — Les avatars de profil ✅ fait

Douze petites images pour se choisir une figure à la création du profil. Elles
seraient plus jolies faites maison, mais les emoji tiennent très bien ici.

Actuels : 🦊 🐢 🦉 🐙 🦜 🐝 🦋 🐳 🦔 🐰 🌻 ⭐

Livrés : `avatar-renard.png`, `avatar-tortue.png`, `avatar-hibou.png`,
`avatar-pieuvre.png`, `avatar-perroquet.png`, `avatar-abeille.png`,
`avatar-papillon.png`, `avatar-baleine.png`, `avatar-herisson.png`,
`avatar-lapin.png`, `avatar-tournesol.png`, `avatar-etoile.png`.

L'emoji reste l'identifiant enregistré dans les profils : changer de clé aurait
obligé à migrer toutes les sauvegardes pour un simple habillage.

---

## Ce qui reste en emoji, volontairement

**Le contenu des jeux** — les pommes à compter, les objets du jeu de lettres,
les catégories du jeu de l'intrus. Une soixantaine d'images, pour un gain nul :
ces objets doivent être reconnaissables **comme objets du monde réel**, et un
emoji fait très bien l'affaire. Les redessiner serait un travail énorme au
service de rien.

**Les sujets de conversation et les sections du guide** — vus quelques secondes,
dans des listes de texte.

---

## Invite prête à coller

Pour le lot 1, en une seule planche à découper :

> Une planche de huit icônes d'application disposées en grille de quatre
> colonnes sur deux rangées, sur fond transparent. Style illustration douce et
> arrondie, formes pleines, contours épais et lisibles, couleurs turquoise,
> violet et ambre lumineux. Chaque icône est simple, centrée dans sa case, et
> reste lisible réduite à la taille d'un ongle. Aucun texte, aucune ombre
> portée, aucun cadre autour des icônes.
>
> Les huit sujets, dans l'ordre : un os avec un morceau de viande ; une balle de
> jeu à coutures ; une bulle de savon avec deux petites bulles ; une main
> ouverte paume vers l'avant ; un croissant de lune avec une étoile ; un chapeau
> de diplômé ; un microphone rond ; une bulle de dialogue avec trois points.

Découpe ensuite la planche en huit carrés de 256 × 256 et nomme-les selon le
tableau du lot 1.

---

## Vérifier avant de livrer

- [ ] Fond **réellement transparent** (pas blanc).
- [ ] Le sujet touche presque les bords : une icône avec une grande marge
      paraîtra minuscule à côté des autres.
- [ ] Réduis l'image à 28 px et regarde-la : si tu ne la reconnais plus, il faut
      simplifier.
- [ ] Les huit du lot 1 côte à côte : même poids visuel, aucune ne doit sauter
      aux yeux plus que les autres.
