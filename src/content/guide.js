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
      'Elle retient ce que tu lui racontes : ton prénom, ce que tu aimes, ta ville, le nom de ton chat. Elle le ressort plus tard, toute seule.'
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
      'Il n’y a ni chronomètre, ni vies, ni son d’échec. Une erreur donne un indice, trois erreurs donnent la réponse et on passe à la suite. On apprend, on ne se fait pas gronder.',
      'Indique l’âge de l’enfant dans les réglages : les jeux proposés et leur difficulté s’adaptent tout seuls, et la créature parle plus lentement pour les plus jeunes.'
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
