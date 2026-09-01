# Brancher une IA gratuite

Par défaut, le monstre parle avec son cerveau local : ça marche hors ligne, sans
compte et sans clé. Pour qu'il tienne de vraies conversations, tu peux le
brancher sur un modèle de langage. Trois options gratuites sont intégrées.

Tout se règle dans l'application : bouton **···** en haut à droite → *Cerveau du
monstre*.

---

## Quelle option choisir

| Fournisseur | Où prendre la clé | Carte bancaire | Remarque |
| --- | --- | --- | --- |
| **Google Gemini** | https://aistudio.google.com/apikey | Non | Le plus simple. Quota gratuit large, fonctionne bien depuis un téléphone. |
| **Groq** | https://console.groq.com/keys | Non | Très rapide. Modèles `openai/gpt-oss-*`. |
| **OpenRouter** | https://openrouter.ai/keys | Non | Plusieurs modèles ; ceux dont le nom finit par `:free` sont gratuits. |

Commence par **Gemini** : c'est celui qui demande le moins d'étapes.

> Les catalogues de modèles changent souvent, et un nom valide aujourd'hui peut
> disparaître dans six mois. C'est pourquoi le bouton **Charger les modèles
> disponibles** interroge directement le fournisseur : fie-toi à cette liste
> plutôt qu'à la valeur pré-remplie. Groq a par exemple retiré ses modèles
> Llama au profit de `openai/gpt-oss-20b` et `openai/gpt-oss-120b`.

> Au sujet de Grok : l'API de xAI (grok.com) est payante, il n'y a pas d'offre
> gratuite. C'est pour ça qu'elle n'est pas dans la liste. Groq, sans « k », est
> une entreprise différente — c'est celle qui propose un accès gratuit.

---

## Marche à suivre (Gemini)

1. Ouvre https://aistudio.google.com/apikey et connecte-toi avec ton compte
   Google.
2. **Create API key** → copie la clé (elle commence par `AIza...`).
3. Dans l'application : **···** → *Cerveau du monstre* → **Google Gemini**.
4. Colle la clé dans *Clé d'API*.
5. Appuie sur **Tester la connexion**. Si le monstre répond, c'est branché.

Le champ *Modèle* est pré-rempli. S'il est refusé, appuie sur **Charger les
modèles disponibles** : le jeu interroge le fournisseur et te propose la liste
réelle, à jour.

---

## Où va ta clé

Elle est enregistrée dans le stockage local de l'appareil, pas dans le code.
Elle n'est donc **jamais** poussée sur GitHub et ne se retrouve pas dans l'APK
que tu distribues. Elle part uniquement vers le fournisseur que tu as choisi,
au moment où le monstre répond.

En revanche, si tu partages ton téléphone déverrouillé, la clé est lisible. Et
si tu distribues l'application à d'autres personnes, chacune devra saisir sa
propre clé — c'est voulu.

Pour un usage plus sérieux (application publiée, clé partagée), passe par
l'option **Mon propre proxy** : la clé reste alors sur ton serveur. Un exemple
complet est fourni dans `tools/proxy-example.mjs`.

---

## Si ça ne marche pas

Le bouton **Tester la connexion** affiche le message d'erreur exact.

| Message | Cause |
| --- | --- |
| `API key not valid` | Clé mal copiée : un espace ou un caractère manquant au collage. |
| `Failed to fetch` | Pas de réseau, ou le fournisseur refuse les appels directs depuis un navigateur. Essaie un autre fournisseur, ou passe par le proxy. |
| `does not exist or you do not have access` | Le modèle a été retiré du catalogue. Appuie sur **Charger les modèles disponibles** et choisis-en un dans la liste. |
| `429` ou `quota` | Quota gratuit atteint. Il se réinitialise après un délai. |

Quoi qu'il arrive, le monstre continue de parler avec son cerveau local : une
panne d'API ne casse jamais le jeu.
