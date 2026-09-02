# Ce qu'il faudrait produire

Liste classée par **gain visuel réel**, pas par ordre d'envie. Chaque lot
indique ce que je code en face : rien ici n'est décoratif au sens de « joli mais
sans effet ».

Tu peux m'envoyer les fichiers bruts de Meshy, même à 400 Mo : je simplifie et
je recompresse avec `tools/decimate_glb.py`. Ne perds pas de temps à optimiser.

---

## Règles communes

**Modèles 3D** — format `.glb`, un seul maillage, un seul matériau, opaque.

- **+Y vers le haut**, objet vu de face vers **+Z**.
- Pas besoin de calibrer la taille ni le point de pivot : le moteur recentre,
  pose au sol et met à l'échelle tout seul.
- **Pas de transparence** : les feuilles en plans alpha rendent mal ici, il faut
  du volume. C'est ce qui avait raté sur ton premier arbre.
- **Laisse Meshy cocher « double face »** s'il le propose. La simplification du
  maillage inverse le sens de certaines faces, et un modèle à face simple
  se retrouve troué.
- Pas d'animation nécessaire, sauf mention contraire.

**Images** — PNG si transparence, sinon JPEG. Toujours en puissance de deux
(512, 1024, 2048).

---

## Lot 1 — Les objets de soin ★ priorité haute

**Le manque le plus visible.** Aujourd'hui, nourrir ou laver la créature ne
produit que des particules : rien n'apparaît dans la scène. Avec ces objets,
chaque geste devient un petit événement visible.

| Fichier | Objet | Notes |
| --- | --- | --- |
| `bol.glb` | Une écuelle, un bol de pierre ou de bois | Posé au sol, la créature vient manger dedans |
| `balle.glb` | Une balle ou un jouet rond | Elle roule, la créature court après |
| `baquet.glb` | Une bassine, une vasque, un abreuvoir | Se remplit d'eau au moment du bain |
| `nid.glb` | Un lit, un panier, un tapis de mousse | Elle va s'y coucher pour dormir |
| ~~`fruit.glb`~~ | ✅ **Fait** — sept plats-monstres livrés | Voir `models/food/` |
| ~~`nid.glb`~~ | ✅ **Remplacé** par la maison (v44) | Elle y dort |

**Ce que je code** : apparition/disparition des objets, la créature qui se
déplace vers l'objet au lieu de rester sur place, animation de l'objet (la balle
roule, l'eau monte dans le baquet), et le sommeil qui se passe dans le nid.

> **Les repas sont faits** (v27) : sept plats-monstres tombent du ciel, la
> créature va les chercher et les mange en trois bouchées. Restent le bol, la
> balle, le baquet et le nid — la balle est probablement la plus payante des
> quatre, parce qu'elle bouge.

C'est le lot qui transformera le plus le jeu, parce qu'il change le
**comportement**, pas seulement l'image.

---

## Lot 2 — Signer chaque décor ★ priorité haute

Aujourd'hui les quatre décors partagent les trois mêmes modèles, avec des
quantités différentes. Le sous-bois et l'éboulis ont donc la même silhouette.
**Deux objets caractéristiques par décor suffisent** à les rendre reconnaissables.

| Décor | Fichiers | Idée |
| --- | --- | --- |
| Prairie | `prairie_buisson.glb`, `prairie_fleurs.glb` | Buisson rond fleuri ; touffe de hautes fleurs |
| Sous-bois | `mousse_fougere.glb`, `mousse_souche.glb` | Fougère ; souche moussue avec champignons dessus |
| Éboulis | `roche_rocher.glb`, `roche_cristal.glb` | Gros rocher fendu ; formation de cristaux violets |
| Terre sèche | `terre_cactus.glb`, `terre_ossements.glb` | Cactus ou plante grasse ; bois mort blanchi |

**Ce que je code** : rien de neuf, le système accepte déjà n'importe quel modèle
avec ses quantités, rayons, hauteurs et amplitudes de balancement. J'ajoute les
entrées dans `src/game/biomes.js`.

---

## Lot 3 — La profondeur ✅ fait (v36)

> **Douze horizons livrés** : quatre décors × trois moments de la journée. Bien
> mieux que les silhouettes que j'avais demandées — avec trois images par décor,
> on peut les fondre l'une dans l'autre au lieu de teinter la même.

### Ancienne demande, conservée pour mémoire

La scène n'a qu'un seul plan : la créature et un anneau de décor. Un plan
lointain donnerait de l'ampleur, surtout en paysage.

| Fichier | Contenu | Format |
| --- | --- | --- |
| `horizon_prairie.png` | Ligne d'arbres et collines, en **silhouette** | PNG 2048 × 512, fond transparent |
| `horizon_mousse.png` | Grands troncs serrés | idem |
| `horizon_roche.png` | Crêtes et pitons rocheux | idem |
| `horizon_terre.png` | Mesas, dunes, arbre isolé | idem |

**Important** : des silhouettes, pas des paysages détaillés. Je les teinte
selon l'heure — elles doivent virer à l'orange au couchant et au bleu la nuit.
Un paysage déjà colorié se battrait contre le cycle jour/nuit.

**Ce que je code** : une bande cylindrique derrière le décor, teintée par la
lumière du moment, avec un léger parallaxe.

Optionnel, même lot : `nuages.png` (2048 × 1024, PNG transparent, quelques
nuages doux séparés) pour un ciel qui bouge.

---

## Lot 4 — Les icônes de l'interface ★ priorité moyenne

Les boutons utilisent des emoji. Ils changent d'aspect selon le téléphone, et
n'ont rien à voir avec l'univers du jeu. Douze petites images régleraient ça.

`nourrir`, `balle`, `laver`, `caliner`, `dormir`, `reveiller`, `jeux`,
`micro`, `ecrire`, `reglages`, `souvenirs`, `guide`.

**Format** : PNG 256 × 256, fond transparent, dessin clair sur fond sombre,
même style que ton logo. Nommer `icone_nourrir.png`, etc.

**Ce que je code** : remplacement des emoji, avec repli sur les emoji actuels si
une image manque.

---

## Lot 5 — Le relief du sol ★ priorité basse

Tes quatre textures de sol sont bonnes mais éclairées à plat. Une **carte de
normales** leur donnerait du relief sous la lumière rasante du matin et du soir.

`prairie_normal.jpg`, `mousse_normal.jpg`, `roche_normal.jpg`,
`terre_normal.jpg` — 1024 × 1024, générées depuis les textures existantes.

Meshy ne fait pas ça ; il faut un outil de conversion hauteur → normale. Si
c'est compliqué, saute ce lot : le gain est réel mais modeste.

---

## Lot 6 — De nouvelles espèces ★ quand tu veux

> **Trois espèces livrées** (v28) : Braisillon, Sylvanou, Ondinelle, chacune
> avec œuf, forme jeune et forme adulte. Le catalogue en compte cinq.
> Il manque toujours un clip **`idle`** : les six nouvelles créatures n'ont, elles
> aussi, que `Walking` et `Running`.

### Pour en ajouter encore

Le système accepte autant d'espèces que tu veux. Il faut par espèce :

- `oeuf.glb` — l'œuf, avant éclosion
- `jeune.glb` — la créature nouveau-née
- `vieux.glb` — la forme adulte (facultatif, sinon la jeune est conservée)

**Les animations comptent plus que la forme.** Les modèles actuels n'ont que
`Walking` et `Running`. Si tu peux en exporter d'autres, nomme-les avec ces
mots-clés dedans, le moteur les branche tout seul :

| Mot-clé dans le nom | Effet |
| --- | --- |
| `idle` | Position de repos — **c'est le plus utile, il manque partout** |
| `sleep` | Sommeil |
| `eat` | Manger |
| `jump` | Jeu |
| `sad` | Bouderie |
| `dance` | Euphorie |

Un clip `idle` sur les trois créatures existantes améliorerait davantage le
rendu qu'une quatrième espèce.

---

## Note sur la promenade sur l'écran (v31)

Reprise de ton application précédente, avec une différence : le service n'est
plus permanent, il est réveillé par une alarme à l'heure du rappel puis s'éteint.

La créature affichée est une **planche d'images** générée depuis le vrai modèle
par `tools/render_sprite.py`. Le script applique le squelette et l'animation de
marche : ce sont de vraies images du cycle, pas une pose figée. Si tu ajoutes
une espèce, une seule commande suffit :

```bash
python3 tools/render_sprite.py public/assets/models/espece/jeune.glb \
  public/assets/sprites/espece.png 8 160
```

## Si tu ne fais qu'une chose

Le **lot 1**. Voir la créature aller manger dans son bol et se coucher dans son
nid change plus la sensation de présence que n'importe quel décor.

Et si tu ne fais qu'un fichier : un clip d'animation **`idle`** pour les
créatures existantes.
