// Les points de monstre.
//
// La monnaie du jeu. Trois principes de conception, qui décident de tout le
// reste :
//
// **On gagne en jouant, pas en attendant.** Un jeu qui récompense le temps
// passé pousse à laisser l'application ouverte pour rien. Le gain principal
// vient des parties et des soins ; le temps ne rapporte qu'une petite rente,
// plafonnée, qui récompense la régularité plutôt que la durée.
//
// **Aucun plafond punitif.** On ne perd jamais de points, il n'y a pas de
// dette, et rien n'expire. C'est un jeu pour des enfants et pour des personnes
// âgées : la seule tension acceptable est celle de l'envie, pas celle de la
// perte.
//
// **Des plafonds quotidiens, pas des durées d'attente.** Répéter le même jeu
// vingt fois d'affilée rapporte de moins en moins, ce qui pousse à varier sans
// jamais bloquer personne devant un compte à rebours.

const CLE = 'monstre.points';

// Gains. Volontairement petits : la boutique est bon marché en proportion, et
// il vaut mieux acheter souvent que d'épargner longtemps.
export const GAINS = {
  bonneReponse: 2,
  partieFinie: 5,
  sansFaute: 8,
  duelGagne: 6,
  duelJoue: 2,
  soin: 1,
  eclosion: 25,
  // Rente de présence : une fois par tranche de temps réel, pas par minute
  // passée devant l'écran.
  visite: 10
};

// Au-delà, une même source ne rapporte plus pour la journée. Le total reste
// atteignable en variant les activités.
export const PLAFONDS = {
  jeux: 120,
  duel: 60,
  soin: 30,
  // Le délai de quatre heures autorise trois retours par jour ; le plafond
  // doit les payer tous les trois, sinon les deux mécanismes se contredisent
  // et le second annule le premier en silence.
  visite: 30
};

const DELAI_VISITE = 4 * 3600 * 1000; // quatre heures entre deux rentes

function cle(profileId) {
  return `${CLE}.${profileId || 'defaut'}`;
}

function aujourdhui(now = Date.now()) {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function normaliser(brut, now) {
  const jour = aujourdhui(now);
  const base = {
    total: 0,
    gagnesEnTout: 0,
    jour,
    duJour: { jeux: 0, duel: 0, soin: 0, visite: 0 },
    derniereVisite: 0
  };
  if (!brut || typeof brut !== 'object') return base;

  const total = Number(brut.total);
  const gagnes = Number(brut.gagnesEnTout);
  const memeJour = brut.jour === jour;

  return {
    total: Number.isFinite(total) && total >= 0 ? Math.floor(total) : 0,
    gagnesEnTout: Number.isFinite(gagnes) && gagnes >= 0 ? Math.floor(gagnes) : 0,
    jour,
    // Les compteurs quotidiens repartent de zéro au changement de date.
    duJour: memeJour && brut.duJour ? { ...base.duJour, ...brut.duJour } : base.duJour,
    derniereVisite: Number(brut.derniereVisite) || 0
  };
}

export function charger(profileId, now = Date.now()) {
  try {
    return normaliser(JSON.parse(localStorage.getItem(cle(profileId))), now);
  } catch {
    return normaliser(null, now);
  }
}

function ecrire(profileId, etat) {
  try {
    localStorage.setItem(cle(profileId), JSON.stringify(etat));
  } catch {
    /* stockage indisponible */
  }
  return etat;
}

// Ajoute des points. `source` sert au plafond quotidien ; sans source, le gain
// n'est pas plafonné (l'éclosion, par exemple, n'arrive qu'une fois).
export function gagner(profileId, montant, source = null, now = Date.now()) {
  const etat = charger(profileId, now);
  let reel = Math.max(0, Math.floor(montant));

  if (source && PLAFONDS[source] !== undefined) {
    const deja = etat.duJour[source] || 0;
    const reste = Math.max(0, PLAFONDS[source] - deja);
    reel = Math.min(reel, reste);
    etat.duJour[source] = deja + reel;
  }

  etat.total += reel;
  etat.gagnesEnTout += reel;
  ecrire(profileId, etat);
  return { gagne: reel, total: etat.total, plafonne: reel < Math.floor(montant) };
}

// Rente de présence, versée au plus une fois toutes les quatre heures. Elle
// récompense le fait de revenir, jamais celui de rester.
export function visiter(profileId, now = Date.now()) {
  const etat = charger(profileId, now);
  if (now - etat.derniereVisite < DELAI_VISITE) return { gagne: 0, total: etat.total };
  etat.derniereVisite = now;
  ecrire(profileId, etat);
  return gagner(profileId, GAINS.visite, 'visite', now);
}

export function solde(profileId, now = Date.now()) {
  return charger(profileId, now).total;
}

export function peutPayer(profileId, prix, now = Date.now()) {
  return solde(profileId, now) >= prix;
}

// Dépense. Renvoie faux et ne touche à rien si le compte est insuffisant : un
// achat à moitié fait serait pire qu'un achat refusé.
export function depenser(profileId, prix, now = Date.now()) {
  const etat = charger(profileId, now);
  const montant = Math.max(0, Math.floor(prix));
  if (etat.total < montant) return false;
  etat.total -= montant;
  ecrire(profileId, etat);
  return true;
}

// Récompense de fin de partie, calculée depuis le résultat.
export function recompenseDePartie(correct, total) {
  if (!total) return 0;
  let points = correct * GAINS.bonneReponse + GAINS.partieFinie;
  if (correct === total) points += GAINS.sansFaute;
  return points;
}
