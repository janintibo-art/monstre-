import { SPECIES, temperamentOf } from '../game/species.js';

// La boutique.
//
// Ce qu'on peut acheter, et ce que l'achat débloque. Le catalogue est une
// donnée : ajouter un article ne demande pas de toucher à l'interface.
//
// Deux règles de conception :
//
// **On n'achète jamais un avantage.** Aucun article ne rend la créature plus
// docile, ne remplit une jauge ni ne fait gagner un jeu. On achète du choix et
// du décor. Un jeu pour enfants où l'argent donne un avantage apprend une
// mauvaise leçon, et l'application n'a de toute façon rien à vendre.
//
// **Rien n'est perdu.** Un œuf acheté reste débloqué pour toujours, sur ce
// profil. On ne rachète jamais deux fois la même chose.

const CLE = 'monstre.boutique';

function cle(profileId) {
  return `${CLE}.${profileId || 'defaut'}`;
}

// Prix des œufs. Les cinq premières espèces sont libres dès le départ : il
// faut de quoi jouer avant d'avoir de quoi acheter.
const OFFERTES = ['gigglehorn', 'moonberry', 'braisillon', 'sylvanou', 'ondinelle'];

export function catalogueOeufs() {
  return SPECIES.map((espece) => ({
    id: `oeuf:${espece.id}`,
    espece: espece.id,
    nom: espece.name,
    temperament: temperamentOf(espece).label,
    phrase: temperamentOf(espece).phrase,
    prix: OFFERTES.includes(espece.id) ? 0 : 120,
    categorie: 'oeuf'
  }));
}

export function charger(profileId) {
  try {
    const brut = JSON.parse(localStorage.getItem(cle(profileId)));
    const achetes = Array.isArray(brut && brut.achetes) ? brut.achetes.filter((x) => typeof x === 'string') : [];
    return {
      achetes,
      // Espèce choisie pour le prochain œuf, ou null pour le hasard.
      prochaine: typeof (brut && brut.prochaine) === 'string' ? brut.prochaine : null
    };
  } catch {
    return { achetes: [], prochaine: null };
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

export function possede(profileId, articleId) {
  const article = catalogueOeufs().find((a) => a.id === articleId);
  if (article && article.prix === 0) return true;
  return charger(profileId).achetes.includes(articleId);
}

export function acheter(profileId, articleId) {
  const etat = charger(profileId);
  if (etat.achetes.includes(articleId)) return false;
  etat.achetes.push(articleId);
  ecrire(profileId, etat);
  return true;
}

// Espèces dont l'œuf est disponible pour ce profil.
export function especesDisponibles(profileId) {
  return catalogueOeufs()
    .filter((a) => possede(profileId, a.id))
    .map((a) => a.espece);
}

export function choisirProchaine(profileId, especeId) {
  const etat = charger(profileId);
  // On ne peut choisir qu'une espèce qu'on possède ; `null` remet au hasard.
  etat.prochaine =
    especeId && especesDisponibles(profileId).includes(especeId) ? especeId : null;
  ecrire(profileId, etat);
  return etat.prochaine;
}

export function prochaineEspece(profileId) {
  const choix = charger(profileId).prochaine;
  return choix && especesDisponibles(profileId).includes(choix) ? choix : null;
}
