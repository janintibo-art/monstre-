# Trois nouvelles créatures

> **Six espèces livrées** (v75) : Gemmelin, Bouffenuage, Nocturnelle, Scarabin,
> Champillon et Étincelou. Le catalogue en compte onze.
>
> Deux enseignements pour les prochaines :
>
> - **Un modèle est sorti hors norme** : 207 000 triangles là où les onze autres
>   en font 3 100. Meshy a dû l'exporter à un autre réglage. Ce n'est pas grave,
>   mais il pèse 9 Mo à lui seul. Si l'un des tiens ressort ainsi, un
>   réexport au réglage habituel vaut mieux qu'une simplification après coup.
> - **Attention aux créatures très sombres.** La Nocturnelle a une texture d'une
>   luminosité moyenne de 49 sur 255, contre 123 et 152 pour les autres. La nuit,
>   elle devient une silhouette. Un test refuse désormais toute texture sous 20,
>   mais l'idéal reste de prévoir des marques claires — les taches dorées jouent
>   ce rôle ici.

Chaîne : **ChatGPT produit une image → Meshy la convertit en 3D → Meshy rigge et
anime.**

Le maillon fragile reste le passage vers Meshy. Le bloc technique ci-dessous est
le même qui a fonctionné pour Braisillon, Sylvanou et Ondinelle — les six
modèles étaient riggés proprement et les dix os attendus par le moteur ont tous
été reconnus. Ne le modifie pas.

---

## Le bloc à coller à la fin de chaque invite de personnage

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

Pour les **œufs**, remplace-le par celui-ci :

```
Style : illustration 3D façon jeu vidéo pour enfants, formes rondes et pleines,
couleurs saturées, éclairage doux et uniforme.

Contraintes techniques impératives :
- Objet seul, centré, entier, posé debout, avec une marge tout autour.
- Vu de trois quarts, légèrement en plongée, pour qu'on lise bien le volume.
- Fond uni gris clair, vide, sans sol, sans ombre portée, sans décor.
- Éclairage diffus, aucune ombre dure ni reflet spéculaire fort.
- Formes épaisses. Aucun élément fin ou transparent.
- Image nette, aucun flou, aucun texte.
Format carré.
```

---

## Ce que les cinq espèces actuelles occupent déjà

Pour que les nouvelles se distinguent au premier coup d'œil :

| Espèce | Registre | Couleurs |
| --- | --- | --- |
| Gigglehorn | cornu, espiègle | bleu et orange |
| Moonberry | draconique | violet et rose |
| Braisillon | renardeau de feu | orange et doré |
| Sylvanou | écorce et mousse | vert et brun |
| Ondinelle | amphibien | turquoise et blanc |

Les trois nouvelles occupent donc le **minéral**, le **ciel** et la **nuit** —
trois registres encore libres, avec trois silhouettes qui ne se confondent avec
aucune des précédentes.

---

## 1. Gemmelin — créature de cristal

Dossier : `public/assets/models/gemmelin/`

**Œuf** — `oeuf.glb`
> Un œuf de roche gris-violet, dont la surface s'ouvre en larges facettes
> géométriques laissant voir un cœur de cristal améthyste. Quelques pointes de
> quartz épaisses sortent de la coquille près du sommet. Surface mate, arêtes
> nettes. Posé debout.

**Jeune** — `jeune.glb`
> Une petite créature bipède trapue, faite de pierre lisse gris-lavande, avec de
> larges plaques de cristal améthyste épaisses sur le dos et les épaules. Une
> grosse gemme violette arrondie encastrée au milieu du front, qui brille
> doucement. De grands yeux ronds violet clair. Deux petites cornes de quartz
> courtes et épaisses. Bras courts et robustes, mains à trois gros doigts.
> Jambes trapues, pieds larges. Pas de queue. Air placide et curieux.

**Adulte** — `vieux.glb`
> La même créature devenue adulte : plus haute, la pierre plus sombre et
> polie, les plaques de cristal plus grandes et plus nombreuses, formant une
> collerette de facettes autour des épaules. Les cornes de quartz sont longues
> et légèrement recourbées. La gemme du front est plus large, entourée de
> petites gemmes. Regard grave et bienveillant.

---

## 2. Bouffenuage — créature du ciel

Dossier : `public/assets/models/bouffenuage/`

**Œuf** — `oeuf.glb`
> Un œuf blanc cotonneux fait de volutes rondes et pleines, comme un nuage
> sculpté, avec des reflets lavande et pêche très doux. Quelques anneaux
> légèrement plus denses en font le tour. Surface veloutée. Posé debout.

**Jeune** — `jeune.glb`
> Une petite créature bipède très ronde et duveteuse, faite de volutes de nuage
> blanches et lavande, comme un mouton bouffant. Deux grandes oreilles rondes et
> épaisses qui retombent. De grands yeux bleu ciel très doux. Un petit toupet
> bouclé et **épais** sur le front. Quatre petites ailes rondes et charnues dans
> le dos, opaques et bien détachées du corps. Bras courts et potelés, jambes
> courtes, petits pieds ronds. Air rêveur et joyeux.

**Adulte** — `vieux.glb`
> La même créature adulte : plus grande et plus élancée, la toison de nuage plus
> dense et striée de bandes lavande et rosées. Les oreilles sont plus longues et
> se recourbent. Les quatre ailes sont plus grandes, toujours épaisses et
> pleines, écartées du corps. Une couronne de petites volutes rondes au-dessus
> de la tête. Regard calme et lointain.

---

## 3. Nocturnelle — créature de la nuit

Dossier : `public/assets/models/nocturnelle/`

**Œuf** — `oeuf.glb`
> Un œuf bleu nuit profond, à la surface veloutée, parsemé de petites taches
> dorées lumineuses disposées comme des constellations. Un croissant doré en
> relief épais sur le côté. Posé debout.

**Jeune** — `jeune.glb`
> Une petite créature bipède au pelage bleu nuit profond, court et velouté,
> parsemé de petites taches dorées lumineuses. D'immenses yeux ronds jaune
> doré, très expressifs, occupant une grande part du visage. Deux très grandes
> oreilles arrondies et **épaisses**, dressées. Un petit museau clair. Une queue
> touffue et large terminée par une pointe dorée. Bras fins mais bien détachés
> du corps, pattes souples. Air doux et un peu timide.

**Adulte** — `vieux.glb`
> La même créature adulte : plus haute et élancée, le pelage bleu nuit plus
> sombre, les taches dorées plus nombreuses et formant un vrai motif
> d'étoiles sur le dos et les bras. Les oreilles sont plus longues, avec une
> bordure dorée. Un croissant doré marque le front. La queue est plus large,
> avec plusieurs pointes lumineuses. Regard serein et perçant.

---

## Dans Meshy

1. **Image to 3D**, avec texture.
2. Coche **double face** si l'option est proposée. La simplification du maillage
   inverse le sens de certaines faces — moins de 60 % des triangles d'un arbre
   pointaient vers l'extérieur — et un modèle à face simple se retrouve troué.
3. **Rigging → Biped**, puis les animations.
4. **Prends `idle` en priorité.** C'est ce qui manque à *toutes* les créatures
   actuelles : elles n'ont que `walking` et `running`, et leur position de repos
   est entièrement calculée par le squelette procédural. Un vrai clip d'attente
   ferait plus pour le rendu qu'une sixième espèce.

   Les mots reconnus automatiquement par le moteur : `idle`, `walk`, `run`,
   `sleep`, `eat`, `jump`, `sad`, `dance`. Et depuis la v73, quatre de plus pour
   les petites scènes spontanées : `wave`, `gesture`, `observe`, `scratch`.
5. Exporte en **GLB**, fichier *Merged Animations*.
6. Envoie-moi les fichiers bruts, même très lourds : je m'occupe de la
   simplification et de la compression.

---

## Vérifier l'image avant de la passer dans Meshy

Trente secondes qui évitent de gâcher des crédits.

- [ ] Le sujet est **entier**, rien n'est coupé par le bord.
- [ ] Le fond est **uni et vide**, sans sol ni ombre portée.
- [ ] Les **deux bras sont détachés du corps** : on voit un espace entre chaque
      bras et le torse.
- [ ] Les **deux jambes sont séparées**.
- [ ] La queue ne croise ni le corps ni les jambes.
- [ ] Aucun élément fin, transparent ou filandreux.

Si un bras touche le corps :

> Refais la même image avec les bras plus écartés du corps, un espace net entre
> chaque bras et le torse.

---

## Ce que je ferai à la réception

1. Simplification et compression — les précédentes faisaient 800 Mo au total,
   ramenées à 9 Mo.
2. Rendu de contrôle de chaque modèle, pour vérifier que la simplification n'a
   rien détruit.
3. Vérification que les dix os attendus sont reconnus par l'animation
   procédurale.
4. Génération de la planche de marche pour la promenade sur l'écran
   (`tools/render_sprite.py`).
5. Ajout au catalogue dans `src/game/species.js` — le tirage couvrira alors huit
   espèces, et un test vérifie que chacune peut réellement sortir.
