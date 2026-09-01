# Où déposer tes images

Le jeu fonctionne **sans aucune image** : tout est généré par code. Dès que tu
déposes un fichier ici avec le bon nom, il remplace automatiquement la version
procédurale. Aucun code à modifier.

| Nom du fichier      | Ce que ça habille                  | Taille conseillée | Format          |
| ------------------- | ---------------------------------- | ----------------- | --------------- |
| `monster_skin.png`  | Le corps, la tête, les membres     | 1024 × 1024       | PNG ou JPG      |
| `monster_belly.png` | Le ventre et les cornes            | 512 × 512         | PNG ou JPG      |
| `egg_shell.png`     | La coquille de l'œuf               | 512 × 512         | PNG ou JPG      |
| `ground.png`        | Le sol (répété 3 × 3, il doit être *tileable*) | 1024 × 1024 | PNG ou JPG |
| `sky.png`           | Le fond de scène                   | 2048 × 1024       | PNG ou JPG      |

## Règles pratiques

- **Puissances de deux** (512, 1024, 2048) : meilleure compression et pas de
  redimensionnement au chargement sur Android.
- Les textures du corps sont appliquées en projection sphérique. Une texture
  organique et sans motif fort (écailles, grain, dégradé) rendra mieux qu'un
  dessin précis, qui se déformerait aux pôles.
- `ground.png` doit être raccordable bord à bord, sinon la répétition se verra.
- Si tu fournis `egg_shell.png`, les fissures dessinées par le moteur ne
  s'appliquent plus. Retire le fichier pour retrouver l'animation de craquelure.
- Poids total : garde l'ensemble sous 8 Mo, sinon l'APK gonfle vite.

Pour changer ces noms ou en ajouter, tout se passe dans `src/core/assets.js`,
dans la constante `MANIFEST`.
