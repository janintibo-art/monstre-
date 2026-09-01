// Ce module a ete remplace par profile.js quand l'application s'est ouverte aux
// adultes et aux personnes agees. Il reste comme passerelle pour les imports
// existants, et pour qu'un fichier tiers ne casse pas.
export {
  AGE_BANDS,
  bandById,
  currentBand,
  audienceInstruction as childInstruction,
  loadProfile as loadChild,
  saveProfile as saveChild
} from './profile.js';
