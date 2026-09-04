// Contenu du guide.
//
// Ecrit pour quelqu'un qui n'a jamais entendu parler d'API, de modele de
// langage ni de synthese vocale. Chaque section repond a une question qu'on se
// pose vraiment devant l'application, dans l'ordre ou on se la pose.
//
// Regle d'ecriture : on explique a quoi ca sert avant d'expliquer comment on
// fait. Un mode d'emploi qui commence par « allez dans les reglages » ne dit
// pas pourquoi on irait.

export const GUIDE = [
  {
    id: 'debut',
    icon: '🥚',
    title: 'Faire éclore l’œuf',
    body: [
      'Au tout début, il n’y a qu’un œuf posé sur son nid. Tape dessus avec ton doigt : à chaque fois, il bouge un peu plus et des fissures apparaissent.',
      'Le pourcentage sous la scène montre où il en est. Tu peux aussi ne rien faire : il éclot tout seul en deux minutes et demie, c’est juste plus long.',
      'Quand il sort, on te demande de lui donner un nom. Il s’en souviendra, et il l’utilisera quand il te parlera.'
    ]
  },
  {
    id: 'soins',
    icon: '🍖',
    title: 'S’occuper de lui',
    body: [
      'Les cinq petites fioles en haut à gauche sont ses besoins : faim, énergie, propreté, jeu et affection. Elles se vident toutes seules avec le temps, même quand l’application est fermée.',
      'Les boutons en bas servent à les remplir. Nourrir, jouer à la balle, laver, câliner, dormir.',
      'Quand elle a sommeil, elle rentre dormir devant sa maison. Elle est toujours au même endroit du décor.',
      'Une fiole qui devient orange puis qui clignote veut dire que c’est urgent. Un monstre bien traité grandit plus vite qu’un monstre négligé — mais il ne peut pas mourir, et il ne perd jamais tout d’un coup, même si tu pars plusieurs jours.'
    ]
  },
  {
    id: 'grandir',
    icon: '🌱',
    title: 'Il grandit',
    body: [
      'Ta créature passe par quatre âges : nouveau-né, jeune, adolescent, adulte. Le passage se fait tout seul, et parfois elle change carrément de corps — avec une colonne de lumière, tu ne peux pas le rater.',
      'Son caractère aussi évolue. Il y a cinq traits : curieux, sociable, gourmand, énergique, timide. Ils viennent de son œuf au départ, puis ils se déplacent selon ce que tu fais. Si tu la câlines souvent, elle devient sociable et moins timide.',
      'Chaque œuf donne une créature différente, avec sa propre espèce, ses couleurs et son paysage.'
    ]
  },
  {
    id: 'parler',
    icon: '🎤',
    title: 'Lui parler',
    body: [
      'Le bouton avec le micro écoute ce que tu dis et la créature répond à voix haute, dans sa bulle. Le bouton avec la bulle sert à écrire au clavier à la place.',
      'La première fois, le téléphone demande l’autorisation d’utiliser le micro : il faut accepter, sinon le bouton ne pourra rien entendre.',
      'Si elle comprend mal, elle demande de répéter plutôt que de répondre à côté. Et tu peux appuyer une seconde fois sur le micro pour dire « j’ai fini » sans attendre.',
      'Dans les jeux, un bouton « Répondre à la voix » permet de dire la réponse au lieu de la toucher. C’est là que la reconnaissance est la plus sûre, parce qu’elle sait déjà quelles réponses sont possibles.',
      'Elle retient ce que tu lui racontes : ton prénom, ce que tu aimes, ta ville, le nom de ton animal. Elle le ressort plus tard, toute seule.'
    ]
  },
  {
    id: 'agenda',
    icon: '📅',
    title: 'L’agenda',
    body: [
      'Le bouton **📅 en haut de l’écran** ouvre ton agenda. Une bande montre les sept prochains jours avec des pastilles de couleur : d’un coup d’œil, tu vois les journées chargées.',
      'Trois sortes de rappels : **un rendez-vous** (turquoise), **une tâche à faire** (ambre) et **un réveil** (rose). Choisis-en un, puis dis ou écris ta phrase.',
      'Dis-lui simplement : « **j’ai rendez-vous chez le médecin mardi à 17 h** », « **rappelle-moi d’arroser les plantes samedi** » ou « **réveille-moi à 7 h** ». Elle comprend la date et l’heure toute seule, au micro comme au clavier.',
      'Un réveil sonne **à l’heure exacte** : on ne te demande pas quand prévenir, ce serait absurde. Il a aussi sa propre sonnerie, plus insistante qu’un simple rappel.',
      'Le bouton **⏱️ Essayer le réveil** en bas de l’agenda en déclenche un dans quinze secondes, avec toute la chaîne réelle. C’est le seul moyen de vérifier sans attendre le lendemain matin — et il te dit clairement si les autorisations manquent.',
      'Un réveil se répète tous les jours sans que tu aies à le demander — personne ne se lève une seule fois — et la créature insiste plus longtemps que pour un simple rappel.',
      '**Elle demande ensuite quand te prévenir** : une heure avant, le matin même, la veille au soir… C’est la question que tout le monde oublie de préciser, et sans elle un pense-bête arrive toujours trop tard.',
      'Le moment venu, ton téléphone t’alerte même si l’application est fermée. En ouvrant, la créature accourt et répète le rendez-vous jusqu’à ce que tu appuies sur « C’est noté ».',
      'Elle comprend aussi « demain », « après-demain », « dans trois jours », « le 12 mars », et les rendez-vous qui se répètent : « **tous les jours à 8 h** » pour les médicaments, « tous les mardis » pour le kiné.',
      '**Réglages → Mes pense-bêtes** montre tout ce qu’elle retient, avec la possibilité d’en effacer. Chaque profil a les siens.',
      'La première fois, le téléphone demande l’autorisation d’envoyer des notifications : il faut accepter, sinon elle ne pourra te prévenir que lorsque tu ouvres l’application.',
      '**Elle peut aussi venir marcher sur ton écran**, par-dessus tes autres applications, à l’heure du rappel. Tu la touches, elle rentre chez elle. Ça se règle dans **Réglages → Promenade sur l’écran**, avec un bouton pour l’essayer tout de suite.',
      'Rassure-toi pour la batterie : elle ne tourne pas en fond. Le téléphone la réveille à l’heure dite, elle reste trois minutes au maximum, puis tout s’éteint. Entre deux rendez-vous, elle ne consomme rien.'
    ]
  },
  {
    id: 'souvenirs',
    icon: '💭',
    title: 'Ses souvenirs',
    body: [
      'Dans les réglages, « Voir ses souvenirs » montre tout ce qu’elle a retenu de toi, avec une petite barre qui indique la solidité du souvenir.',
      'Un souvenir dont on ne reparle jamais pâlit puis s’efface, comme dans une vraie mémoire. Il suffit d’en reparler pour le raviver. Ton prénom, lui, tient plusieurs semaines.',
      'Tu peux effacer un souvenir précis, ou tout effacer. C’est ta mémoire à toi qu’elle garde : tu dois pouvoir la reprendre.'
    ]
  },
  {
    id: 'jeux',
    icon: '🎓',
    title: 'Les jeux pour apprendre',
    body: [
      'Le bouton « Jeux » ouvre des petits jeux éducatifs : couleurs, formes, compter, premières lettres, calcul, suites logiques, mémoire, lecture de l’heure.',
      'Chaque consigne est lue à voix haute par la créature, donc un enfant qui ne sait pas encore lire peut jouer tout seul. Le bouton « Relire » la répète autant de fois qu’on veut.',
      'Coche **Jouer à la voix** en haut de la liste : la créature pose la question, écoute ta réponse, réagit et enchaîne toute seule. Tu n’as plus rien à toucher. Elle penche la tête quand c’est à toi de parler.',
      'Le **chifoumi** se joue autrement : pas de panneau, la créature reste dans son décor. Tu choisis pierre, feuille ou ciseaux — au doigt ou à la voix — et vous abattez vos mains en même temps. Elle boude quand elle perd et danse quand elle gagne.',
      'Elle ne triche pas : elle choisit son coup avant de voir le tien. Mais elle observe ce que tu joues le plus souvent, alors ne prends pas d’habitude.',
      'Deux jeux sont faits pour ça : **Devine à quoi je pense**, où elle décrit quelque chose, et **Répète après moi**, où il suffit de redire le mot qu’elle dit.',
      'Il n’y a ni chronomètre, ni vies, ni son d’échec. Une erreur donne un indice, trois erreurs donnent la réponse et on passe à la suite. On apprend, on ne se fait pas gronder.',
      'Indique l’âge de l’enfant dans les réglages : les jeux proposés et leur difficulté s’adaptent tout seuls, et la créature parle plus lentement pour les plus jeunes.'
    ]
  },
  {
    id: 'profils',
    icon: '👤',
    title: 'Un profil par personne',
    body: [
      'Sur l’écran de présentation, le bouton **haut-parleur** en haut lit les explications à voix haute. Pratique si tu ne lis pas encore, ou si les petits caractères te fatiguent.',
      'Au premier lancement, l’application demande qui joue. Chaque personne crée son profil : un prénom, une image, son âge, et ce qu’elle aime.',
      '**Chaque profil a son propre monstre**, ses propres souvenirs, son propre décor. C’est essentiel : une mémoire partagée entre une grand-mère et un enfant de six ans ne serait la mémoire de personne. La complicité ne se crée que si la créature sait à qui elle parle.',
      'Ce que vous cochez à la création — les animaux, le jardin, la cuisine — devient tout de suite un souvenir. La créature vous connaît donc un peu dès la première phrase, au lieu de vous demander votre prénom que vous venez d’écrire.',
      'On ne demande jamais de nom de famille, ni d’adresse, ni de date de naissance exacte : le jeu n’en a pas besoin. Une tranche d’âge suffit à adapter les jeux et le ton.',
      'À chaque ouverture, l’application demande qui joue. Le dernier profil utilisé est signalé : une tape suffit pour reprendre. Et le bouton **+ Nouveau profil** est juste en dessous, pour qu’un autre membre de la famille ait sa propre créature.',
      'Si tu es seul à utiliser l’application, tu peux désactiver cette question dans les réglages pour ouvrir directement sur ta créature.',
      'Pour changer de personne en cours de route : **Réglages → Changer de profil**. Vous pouvez aussi modifier un profil ou en supprimer un — une copie de secours du monstre est conservée dans ce cas.'
    ]
  },
  {
    id: 'papoter',
    icon: '💬',
    title: 'Discuter avec elle',
    body: [
      'Dans « Jeux », la première carte est **Papoter avec moi**. La créature propose un sujet et pose la première question : les saisons, la cuisine, le métier qu’on a fait, les voyages, la famille.',
      'C’est fait exprès. Devant un champ vide, on ne sait pas quoi écrire et on referme. Là, il n’y a qu’à répondre — au micro ou au clavier, au choix.',
      'Elle relance ensuite d’elle-même, une question à la fois. Et de temps en temps, elle revient sur ce que vous lui avez raconté les fois précédentes : c’est le sujet marqué d’un cœur.',
      'Certaines questions de jeu ouvrent aussi sur une discussion. Après un proverbe ou une ville, un bouton « En parler » apparaît.'
    ]
  },
  {
    id: 'profil',
    icon: '👓',
    title: 'Adapter à qui joue',
    body: [
      'Dans les réglages, **Profil du joueur** va de 3 ans à « Confort ». Ça change trois choses : les jeux proposés, leur difficulté, et la façon dont la créature parle.',
      'Dans les réglages, **Orientation du jeu** te laisse choisir : suivre le téléphone, rester en paysage, ou rester en portrait. En portrait la créature a moins de largeur, alors son aire de jeu se réduit d’autant pour qu’elle reste toujours visible.',
      'Les réglages, le guide, la conversation et les jeux passent toujours en portrait : ce sont des listes et des formulaires, ils se lisent mieux à la verticale.',
      'Le profil **Confort** agrandit le texte et les boutons, ralentit un peu la voix, et met en avant les jeux calmes : proverbes, intrus, vocabulaire, géographie, rendre la monnaie. Aucun chronomètre nulle part, dans aucun jeu, quel que soit le profil.',
      'La case **Texte et boutons agrandis** peut être cochée séparément : on peut avoir cinquante ans et préférer de gros caractères.',
      'Quand une IA est branchée, le profil règle aussi son ton. Elle ne parle pas à une personne âgée comme à un enfant de six ans — et la consigne lui interdit explicitement d’être infantilisante.'
    ]
  },
  {
    id: 'ia',
    icon: '🧠',
    title: 'Le « cerveau » et la clé d’API',
    intro: 'Cette partie est facultative. L’application fonctionne très bien sans, et c’est le réglage par défaut.',
    body: [
      '**Sans rien faire**, la créature a déjà un cerveau à elle, dans l’application. Il tourne sans internet, gratuitement, pour toujours. Il reconnaît des phrases courantes et répond avec ce qu’il sait de toi. C’est limité mais ça ne tombe jamais en panne.',
      '**Si tu veux qu’elle tienne de vraies conversations**, tu peux la brancher sur une intelligence artificielle qui vit sur internet. C’est là qu’intervient la clé d’API.',
      '**Une clé d’API, c’est quoi ?** C’est un long mot de passe que t’attribue le site qui héberge l’intelligence artificielle. Il sert à savoir que c’est bien toi qui poses les questions, et à compter combien tu en poses. Ça ressemble à `AIzaSy...` ou `gsk_...`. Ce n’est pas un logiciel à installer : c’est juste un texte à copier-coller.',
      '**Est-ce que c’est payant ?** Les trois fournisseurs proposés ont une offre gratuite qui ne demande aucune carte bancaire. Google Gemini est le plus simple pour commencer.',
      '**Comment l’obtenir ?** Dans les réglages, choisis un fournisseur : un lien « Obtenir une clé gratuite » apparaît. Tu crées un compte, tu cliques sur « créer une clé », tu la copies, tu la colles dans le champ, tu appuies sur « Tester la connexion ». Si la créature répond, c’est branché.',
      '**Où va cette clé ?** Elle est enregistrée dans l’application, sur cet appareil. Elle n’est jamais mise dans le code ni envoyée sur internet ailleurs que chez le fournisseur que tu as choisi, au moment où la créature répond. Si tu prêtes le téléphone déverrouillé, quelqu’un peut la lire : c’est pour ça qu’une clé se traite comme un mot de passe.',
      '**Si tu distribues l’application**, chacun devra mettre sa propre clé. C’est voulu. Pour partager une seule clé sans la donner à tout le monde, il faut passer par « Mon propre proxy », expliqué dans le fichier `docs/IA-GRATUITE.md`.'
    ]
  },
  {
    id: 'voix',
    icon: '🔊',
    title: 'Sa voix',
    body: [
      '**Babil** est le réglage par défaut : la créature émet des sons, avec une intonation qui monte pour une question et descend en fin de phrase. Elle ne prononce pas les mots — c’est un monstre, pas un présentateur radio. Ça marche partout, même sans internet.',
      '**Synthèse vocale** utilise la voix du téléphone pour prononcer réellement les mots, en français. Il faut qu’un moteur vocal soit installé sur l’appareil ; sinon le babil reprend la main automatiquement.',
      'Pour les jeux éducatifs, les consignes sont toujours prononcées pour de vrai, quel que soit ce réglage : un enfant qui ne lit pas doit pouvoir jouer.',
      'Sur un téléphone, le son reste bloqué tant qu’on n’a pas touché l’écran une fois. C’est une règle des navigateurs, pas un défaut de l’application.'
    ]
  },
  {
    id: 'monde',
    icon: '🌍',
    title: 'Le décor et l’heure',
    body: [
      'Quatre paysages : prairie, sous-bois, éboulis, terre sèche. Chaque créature a le sien, tiré de son œuf, mais tu peux en choisir un autre dans les réglages.',
      'Le réglage **Qualité graphique** propose Auto, Économie, Normal et Magnifique. Auto privilégie la fluidité et peut réduire les effets si le téléphone peine.',
      'Le jeu suit l’heure réelle : il fait jour chez toi, il fait jour chez elle, avec le soleil qui se lève à l’est et les ombres qui s’allongent le soir. La nuit, les étoiles sortent et la créature s’endort.',
      'Le mode « Accéléré » fait défiler une journée entière en vingt-quatre minutes, pour voir le cycle sans attendre.'
    ]
  },
  {
    id: 'sauvegarde',
    icon: '💾',
    title: 'Ne pas perdre son monstre',
    body: [
      'Tout est enregistré automatiquement sur l’appareil, toutes les dix secondes et à chaque fois que tu quittes l’application.',
      'Dans les réglages, « Exporter » enregistre un fichier contenant ta créature, ses souvenirs et son âge. Garde-le quelque part : c’est la seule protection si tu changes de téléphone ou si tu effaces l’application.',
      '« Importer » remet ce fichier en place. On te montre le nom de la créature avant de remplacer, et l’ancienne est gardée en copie de secours au cas où.'
    ]
  },
  {
    id: 'parents',
    icon: '👪',
    title: 'Pour les parents',
    intro: 'Ce qu’il faut savoir avant de laisser un enfant jouer seul.',
    body: [
      '**Sans clé d’API, rien ne sort de l’appareil.** Aucune donnée n’est envoyée nulle part, l’application n’a même pas besoin d’internet une fois installée.',
      '**Avec une clé d’API**, ce que l’enfant écrit ou dit dans la conversation est envoyé au fournisseur choisi pour obtenir la réponse, ainsi qu’un résumé de ce que la créature a retenu. Si ça ne te convient pas, laisse le réglage sur « IA locale ».',
      '**L’âge renseigné** ne sort de l’appareil que sous forme de consigne au modèle : « tu parles à un enfant de 5 à 6 ans, emploie des mots simples, n’aborde aucun sujet effrayant, ne demande jamais d’informations personnelles ».',
      '**Aucune publicité, aucun achat, aucun compte.** L’application est libre et gratuite.',
      '**Le micro** ne s’active que quand on appuie sur le bouton, et rien n’est enregistré : la parole est transcrite puis oubliée aussitôt.',
      'Les jeux sont sans échec ni chronomètre, volontairement. L’objectif est qu’un enfant ait envie d’y revenir, pas qu’il fasse un score.'
    ]
  }
];
