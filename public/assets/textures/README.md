# Textures

## Sols de décor (`ground/`)

| Fichier       | Décor        |
| ------------- | ------------ |
| `prairie.jpg` | Prairie      |
| `mousse.jpg`  | Sous-bois    |
| `roche.jpg`   | Éboulis      |
| `terre.jpg`   | Terre sèche  |

Le décor est tiré de la graine de l'œuf, donc chaque créature a son paysage.
Le joueur peut forcer un décor dans **··· → Décor**.

Le catalogue vit dans `src/game/biomes.js`. Chaque entrée définit **le sol et la
lumière ensemble** : ciel, brouillard, lampe principale, lampe d'appoint et
anneau du sol. Une prairie verte éclairée comme un éboulis violet sonnerait
faux — les deux changent d'un bloc.

Pour ajouter un décor : dépose ton image ici, ajoute une entrée dans le
catalogue, choisis ses couleurs et le nombre d'arbres.

**Contrainte** : l'image doit être raccordable bord à bord (*tileable*), sinon la
répétition se verra. Format 1024 × 1024, JPEG.

## Autres textures (facultatives)

| Fichier             | Ce que ça habille                    |
| ------------------- | ------------------------------------ |
| `monster_skin.png`  | Corps du monstre généré par code     |
| `monster_belly.png` | Ventre et cornes                     |
| `egg_shell.png`     | Coquille de l'œuf généré par code    |
| `sky.png`           | Fond de scène (remplace le dégradé)  |

Ces quatre-là ne servent qu'aux créatures générées par code, c'est-à-dire quand
aucun modèle `.glb` n'est disponible. Si un fichier est absent, la matière est
générée à la volée.
