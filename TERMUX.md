# Publier le projet depuis Termux

Commandes à copier **une par une**. Remplace `TON-PSEUDO`, `TON-EMAIL` et
`monstre` par tes valeurs.

## 0. Avant de commencer : le jeton GitHub

GitHub n'accepte plus les mots de passe pour `git push`. Il te faut un jeton.

1. Sur github.com : **Settings → Developer settings → Personal access tokens →
   Tokens (classic) → Generate new token (classic)**
2. Coche la case **`repo`**, choisis une expiration, valide.
3. Copie le jeton (il commence par `ghp_`). Il ne sera plus jamais réaffiché.

Ce jeton remplacera ton mot de passe au moment du push.

## 1. Préparer Termux

```bash
pkg update -y && pkg upgrade -y
```

```bash
pkg install -y git unzip nano
```

```bash
termux-setup-storage
```

> Une fenêtre Android demande l'accès aux fichiers : accepte, sinon Termux ne
> verra pas ton dossier de téléchargements.

## 2. Se présenter à git

```bash
git config --global user.name "TON-PSEUDO"
```

```bash
git config --global user.email "TON-EMAIL"
```

```bash
git config --global init.defaultBranch main
```

```bash
git config --global credential.helper store
```

> `credential.helper store` enregistre le jeton en clair dans
> `~/.git-credentials` après le premier push. Pratique, mais ne fais ça que sur
> ton propre téléphone.

## 3. Dézipper le projet

```bash
mkdir -p ~/projets && cd ~/projets
```

```bash
cp /sdcard/Download/monstre-de-compagnie.zip .
```

> Si le fichier est ailleurs : `ls /sdcard/Download` pour le retrouver, ou
> `find /sdcard -name "monstre-de-compagnie.zip"`.

```bash
unzip monstre-de-compagnie.zip
```

```bash
cd monster-pet && ls
```

Tu dois voir `index.html`, `package.json`, `src`, `public`.

## 4. Créer le dépôt sur GitHub

Sur github.com : bouton **+ → New repository**. Nom : `monstre`. **Ne coche
rien** (pas de README, pas de .gitignore, pas de licence) : le dépôt doit être
vide, sinon le premier push sera refusé.

## 5. Premier push

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "Base du projet : monstre 3D avec IA"
```

```bash
git branch -M main
```

```bash
git remote add origin https://github.com/TON-PSEUDO/monstre.git
```

```bash
git push -u origin main
```

Git demande alors :

- `Username for 'https://github.com'` → ton pseudo GitHub
- `Password for 'https://...'` → **colle le jeton `ghp_...`**, pas ton mot de
  passe. Rien ne s'affiche pendant que tu colles, c'est normal.

## 6. Récupérer l'APK et le .exe

Le workflow démarre tout seul. Sur github.com : onglet **Actions → dernier run**.
Après 5 à 10 minutes, les fichiers sont en bas de la page, dans **Artifacts** :

- `monstre-android-debug` → l'APK
- `monstre-windows` → le .exe

Pour installer l'APK, autorise les sources inconnues dans Android.

## 7. Le fichier de verrouillage (une seule fois)

```bash
cd ~/projets/monster-pet && npm install --package-lock-only
```

```bash
git add package-lock.json && git commit -m "Lockfile" && git push
```

> N'utilise **pas** `npm install` tout court sur le téléphone : certains outils
> de build n'ont pas de binaire pour Android ARM64 et l'installation échoue.
> `--package-lock-only` calcule l'arbre sans rien télécharger, en quelques
> secondes. La compilation, elle, se fait sur GitHub, pas ici.

## 8. Après chaque nouvelle version

Si la version apporte de nouvelles dépendances, il faut régénérer le fichier de
verrouillage **avant** de pousser :

```bash
cd ~/projets/monster-pet && npm run verrou
```

Puis `git add -A`, `git commit`, `git push` comme d'habitude.

> Depuis la v32, oublier cette étape ne casse plus le build : la CI le détecte,
> affiche un avertissement et continue. Mais le build n'est alors plus
> reproductible à l'identique, donc autant le faire.

## 9. Les fois suivantes

```bash
cd ~/projets/monster-pet
```

```bash
git add . && git commit -m "Ce que j'ai changé"
```

```bash
git push
```

---

## Optionnel : créer le dépôt sans quitter Termux

```bash
pkg install -y gh
```

```bash
gh auth login
```

> Choisis `GitHub.com`, puis `HTTPS`, puis `Paste an authentication token` et
> colle ton jeton.

```bash
gh repo create monstre --public --source=. --remote=origin --push
```

Cette seule commande crée le dépôt et pousse le code. L'étape 4 devient inutile.

## Optionnel : tester le jeu sur le téléphone

```bash
pkg install -y nodejs
```

```bash
cd ~/projets/monster-pet && npm install
```

```bash
npm run dev
```

Ouvre ensuite `http://localhost:5173` dans le navigateur du téléphone.
`Ctrl + C` pour arrêter.

---

## En cas de blocage

| Message | Cause et solution |
| --- | --- |
| `Authentication failed` | Tu as saisi ton mot de passe au lieu du jeton. Recommence, ou `rm ~/.git-credentials` puis repousse. |
| `Updates were rejected` | Le dépôt GitHub n'était pas vide. `git pull --rebase origin main` puis `git push`. |
| `remote origin already exists` | `git remote set-url origin https://github.com/TON-PSEUDO/monstre.git` |
| `Permission denied` sur `/sdcard` | `termux-setup-storage` n'a pas été validé. Relance-le. |
| Le push reste bloqué | Fichier trop lourd. GitHub refuse au-delà de 100 Mo : `du -sh public/assets/*` pour repérer le coupable. |
| `npm error sharp` / `libvips ... not available for android-arm64` | Tu as lancé `npm install` complet. Utilise `npm install --package-lock-only`. |
| `npm ci can only install packages when your package.json and package-lock.json are in sync` | Le fichier de verrouillage est décalé. `npm run verrou`, puis committe `package-lock.json`. |
| `Everything up-to-date` alors que tu as modifié des fichiers | Une commande précédente de la chaîne `&&` a échoué, donc `git commit` n'a jamais tourné. Relance `git add -A`, `git commit` et `git push` **séparément**. |
