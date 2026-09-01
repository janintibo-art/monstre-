# Invites pour ChatGPT → Meshy

Chaîne visée : **ChatGPT produit une image → Meshy la convertit en 3D → Meshy
rigge et anime les personnages.**

Le maillon fragile est le passage vers Meshy. Une belle illustration peut donner
un modèle inutilisable : membres fusionnés, rig raté, silhouette plate. Les
invites ci-dessous sont écrites pour éviter ça.

---

## 1. Les deux blocs à connaître

Colle le bloc adapté **à la fin** de chaque invite. C'est lui qui fait la
différence entre une image jolie et une image exploitable.

### Bloc PERSONNAGE — pour tout ce qui sera rigué et animé

```
Style : illustration 3D façon jeu vidéo pour enfants, formes rondes et pleines,
couleurs saturées, éclairage doux et uniforme, sans ombre portée.

Contraintes techniques impératives :
- Personnage seul, centré, corps entier visible des pieds à la tête, avec une
  petite marge tout autour. Rien ne dépasse du cadre.
- Vu strictement de face, de plein pied. Pas de vue de trois quarts.
- Pose en A : bras écartés du corps à environ 45 degrés, mains ouvertes et bien
  séparées du torse, jambes légèrement écartées, pieds à plat.
- Deux bras et deux jambes clairement distincts, aucun membre ne touche ni ne
  croise le corps. La queue est écartée sur le côté, jamais devant.
- Fond uni gris clair, totalement vide, sans sol, sans ombre, sans décor.
- Éclairage frontal diffus. Aucune ombre marquée, aucun contre-jour, aucun halo.
- Formes épaisses et solides. Aucun élément fin, filandreux ou transparent :
  pas de poils volants, pas de voiles, pas d'ailes translucides, pas de
  moustaches fines.
- Image nette, pas de flou d'arrière-plan, pas d'effet de mouvement.
- Aucun texte, aucun logo, aucun objet tenu en main.
Format carré.
```

### Bloc OBJET — pour le décor et les accessoires

```
Style : illustration 3D façon jeu vidéo pour enfants, formes rondes et pleines,
couleurs saturées, éclairage doux et uniforme.

Contraintes techniques impératives :
- Objet seul, centré, entier, avec une marge tout autour.
- Vu de trois quarts, légèrement en plongée, pour qu'on lise bien le volume.
- Fond uni gris clair, vide, sans sol, sans ombre portée, sans décor.
- Éclairage diffus, aucune ombre dure ni reflet spéculaire fort.
- Formes épaisses. Aucun élément fin ou transparent : pas de feuillage en
  lamelles, pas de verre, pas de fumée.
- Image nette, aucun flou, aucun texte.
Format carré.
```

> **Pourquoi la pose en A** : Meshy rigge en détectant un squelette humanoïde.
> Si les bras touchent le corps, il fusionne bras et torse en une seule masse et
> l'animation devient grotesque. C'est la cause d'échec numéro un.

> **Pourquoi pas d'éléments fins** : ils survivent mal à la conversion en 3D
> puis à la simplification. C'est ce qui avait rendu ton premier arbre plat.

---

## 2. Trois nouvelles créatures

Trois espèces, chacune avec **un œuf, une forme jeune, une forme adulte**. Les
formes jeune et adulte doivent se ressembler : c'est la même créature qui a
grandi.

Pour l'œuf, utilise le **bloc OBJET**. Pour jeune et adulte, le **bloc
PERSONNAGE**.

### Braisillon — créature de braise

**Œuf**
> Un œuf de pierre volcanique noire, parcouru de fissures d'où sort une lueur
> orange et dorée, comme de la braise vivante. Surface mate et rugueuse, quelques
> écailles minérales. Posé debout.

**Jeune** — `braisillon/jeune.glb`
> Une petite créature bipède ronde et duveteuse, façon renardeau de feu. Pelage
> orange et doré, ventre crème. Deux grandes oreilles pointues, de grands yeux
> ambrés très expressifs. Une queue épaisse et touffue terminée par une flamme
> arrondie et solide. De petites cornes rondes dorées sur le front. Bras courts
> mais bien détachés du corps, pattes robustes. Air joyeux et curieux.

**Adulte** — `braisillon/vieux.glb`
> La même créature devenue adulte : plus grande et plus élancée, silhouette de
> renard debout. Pelage orange profond avec des marques dorées lumineuses sur le
> dos et les épaules. Cornes plus longues et recourbées. Collerette de fourrure
> épaisse autour du cou. Queue plus large, à la pointe enflammée arrondie.
> Regard calme et assuré.

### Ondinelle — créature des eaux

**Œuf**
> Un œuf nacré aux reflets turquoise et rose pâle, à la surface lisse, parcouru
> de motifs d'ondulations d'eau en relief doux. Quelques petites bulles
> minérales sur le bas. Posé debout.

**Jeune** — `ondinelle/jeune.glb`
> Une petite créature bipède amphibie, ronde et lisse, peau turquoise clair avec
> le ventre blanc perlé. De larges oreilles en forme de nageoires arrondies et
> épaisses. De grands yeux bleu profond. Une crête dorsale basse et arrondie.
> Une queue plate de têtard, épaisse. Petites mains palmées bien écartées du
> corps. Air doux et rêveur.

**Adulte** — `ondinelle/vieux.glb`
> La même créature adulte : plus haute et plus fine, silhouette élégante. Peau
> turquoise profond avec des motifs plus clairs sur les bras et les jambes. Les
> nageoires des oreilles sont plus grandes et bien épaisses. Une crête dorsale
> plus marquée, en écailles rondes. Queue de poisson large et courte. Regard
> serein.

### Sylvanou — créature des bois

**Œuf**
> Un œuf en bois clair recouvert de mousse verte épaisse, avec de petits
> champignons ronds et deux ou trois pousses de feuilles charnues sur le dessus.
> Quelques nervures dorées lumineuses dans le bois. Posé debout.

**Jeune** — `sylvanou/jeune.glb`
> Une petite créature bipède faite d'écorce claire et de mousse. Corps rond,
> texture de bois lisse, épaules et dos couverts de mousse vert tendre. Une
> grosse feuille charnue en guise de capuche sur la tête. Deux yeux ronds vert
> lumineux. Petits bras de branche épais et bien écartés, jambes courtes et
> solides. De petits champignons ronds poussent sur son épaule. Air timide et
> gentil.

**Adulte** — `sylvanou/vieux.glb`
> La même créature adulte : plus grande, silhouette de petit gardien des bois.
> Écorce plus sombre et sculptée, mousse plus dense sur les épaules et les
> avant-bras. Une couronne de feuilles charnues et de champignons ronds sur la
> tête. Nervures dorées lumineuses le long des bras. Regard bienveillant et
> tranquille.

---

## 3. Les objets de soin — priorité haute

Bloc OBJET pour tous.

| Fichier | Invite |
| --- | --- |
| `bol.glb` | Un bol en pierre creusé, rond et épais, aux bords irréguliers, décoré de motifs gravés turquoise lumineux. Vide. |
| `fruit.glb` | Un gros fruit rond violet et rose, à la peau lisse, avec une petite feuille charnue sur le dessus et une lueur douce à l'intérieur. |
| `balle.glb` | Une balle de jeu rebondie en tissu épais, à motifs turquoise et orange, avec des coutures visibles en relief. |
| `baquet.glb` | Une bassine ronde en bois clair cerclée de métal doré, remplie d'eau turquoise claire avec de la mousse de savon épaisse dessus. |
| `nid.glb` | Un lit rond fait de mousse épaisse et de feuilles charnues, en forme de panier bas et douillet, avec un coussin de mousse à l'intérieur. |

---

## 4. Les objets de décor — un par ambiance

Bloc OBJET pour tous.

| Fichier | Invite |
| --- | --- |
| `prairie_buisson.glb` | Un buisson rond et touffu, feuillage vert clair en masses arrondies et pleines, parsemé de petites fleurs blanches et roses. |
| `prairie_fleurs.glb` | Une touffe de hautes fleurs sauvages aux tiges épaisses, avec de grandes corolles rondes jaunes, roses et violettes. |
| `mousse_fougere.glb` | Une grande fougère aux frondes épaisses et charnues, vert profond, enroulées en crosses sur le dessus. |
| `mousse_souche.glb` | Une souche d'arbre coupée, large et basse, entièrement couverte de mousse verte, avec des champignons ronds turquoise lumineux qui poussent sur le côté. |
| `roche_rocher.glb` | Un gros rocher fendu, gris violacé, aux faces anguleuses et arrondies, avec des veines de cristal turquoise dans la fissure. |
| `roche_cristal.glb` | Une formation de grands cristaux violets et roses qui sortent du sol en éventail, aux faces larges et épaisses, lumineux. |
| `terre_cactus.glb` | Un cactus rond et charnu à trois branches épaisses, vert-de-gris, avec de grosses épines courtes et une fleur rose sur le dessus. |
| `terre_ossements.glb` | Un morceau de bois mort blanchi par le soleil, tordu et épais, à demi enfoncé dans le sable, avec une petite plante grasse à sa base. |

---

## 5. Les images 2D — sans Meshy

Celles-ci restent des images. **N'utilise aucun des deux blocs** ci-dessus.

### Bandes d'horizon

Quatre fichiers : `horizon_prairie.png`, `horizon_mousse.png`,
`horizon_roche.png`, `horizon_terre.png`.

> Une bande panoramique très large montrant une ligne d'horizon en **silhouette
> unie, entièrement d'une seule couleur sombre**, sur fond totalement
> transparent. Aucun détail intérieur, aucune texture, aucun dégradé : seulement
> la découpe de la silhouette. Le bas de l'image est occupé par la silhouette,
> le haut est vide. Format très allongé, environ 2048 sur 512, PNG avec
> transparence.
>
> Sujet : [collines douces et bosquets d'arbres ronds / grands troncs droits et
> serrés d'une forêt / crêtes rocheuses anguleuses et pitons / mesas plates,
> dunes et un arbre isolé].

> **Pourquoi une silhouette unie** : je la teinte selon l'heure du jour. Elle
> doit virer à l'orange au couchant et au bleu la nuit. Un paysage déjà colorié
> se battrait contre le cycle jour/nuit.

### Icônes de l'interface

Douze fichiers : `icone_nourrir.png`, `icone_balle.png`, `icone_laver.png`,
`icone_caliner.png`, `icone_dormir.png`, `icone_reveiller.png`,
`icone_jeux.png`, `icone_micro.png`, `icone_ecrire.png`,
`icone_reglages.png`, `icone_souvenirs.png`, `icone_guide.png`.

Demande-les **en une seule image de planche**, tu découperas ensuite :

> Une planche de douze icônes d'application disposées en grille de quatre
> colonnes sur trois rangées, sur fond transparent. Style illustration douce et
> arrondie, couleurs turquoise, violet et ambre lumineux sur formes pleines,
> contours épais et lisibles, sans texte. Chaque icône est simple, centrée dans
> sa case, lisible à très petite taille.
>
> Les douze sujets, dans l'ordre : un os avec un morceau de viande ; une balle
> de jeu ; une bulle de savon ; une main ouverte qui caresse ; un croissant de
> lune ; un soleil levant ; des cubes de jeu ; un microphone ; un crayon ; trois
> points alignés dans un cercle ; un cœur avec une petite étoile ; un livre
> ouvert.

---

## 6. Vérifier l'image avant de la passer dans Meshy

Trente secondes qui évitent de gâcher des crédits.

- [ ] Le sujet est **entier**, rien n'est coupé par le bord.
- [ ] Le fond est **uni et vide**, sans sol ni ombre portée.
- [ ] Pour un personnage : les **deux bras sont détachés du corps**, on voit un
      espace entre chaque bras et le torse.
- [ ] Les **deux jambes sont séparées**, on voit un espace entre elles.
- [ ] La queue ne croise ni le corps ni les jambes.
- [ ] Aucun élément fin, transparent ou filandreux.
- [ ] Aucune ombre dure sur le sujet.

Si un bras touche le corps, redemande simplement :
« Refais la même image avec les bras plus écartés du corps, un espace net entre
chaque bras et le torse. »

---

## 7. Dans Meshy

1. **Image to 3D**, avec texture.
2. Pour un personnage : **Rigging → Biped**, puis choisir les animations.
3. Prends en priorité un clip **`idle`**, puis `walking`, `running`. Les mots
   `idle`, `walk`, `run`, `sleep`, `eat`, `jump`, `sad`, `dance` sont reconnus
   automatiquement par le moteur du jeu — inutile de renommer quoi que ce soit.
4. Exporte en **GLB**, avec les animations fusionnées (le fichier
   *Merged Animations*, comme pour tes créatures actuelles).
5. Envoie-moi le fichier brut, même très lourd : je m'occupe de la
   simplification et de la compression.

> Le clip **`idle`** est ce qui manque le plus aujourd'hui. Tes trois créatures
> n'ont que `Walking` et `Running` : leur position de repos est entièrement
> calculée par le squelette procédural. Un vrai clip d'attente améliorerait le
> rendu plus qu'une nouvelle espèce.
