import { catalogueOeufs, possede, acheter, choisirProchaine, prochaineEspece } from '../state/boutique.js';
import { solde, depenser } from '../state/points.js';
import { getActiveId } from '../state/profiles.js';
import { currentBand } from '../state/profiles.js';

// La boutique.
//
// On n'y achète que du choix : quelle créature sortira du prochain œuf. Aucun
// article ne rend la créature plus docile, ne remplit une jauge ni ne fait
// gagner un jeu — un jeu pour enfants où l'argent donne un avantage apprend
// une mauvaise leçon.

export function createBoutique({ voice, onChoix }) {
  const panel = document.getElementById('boutique');
  const closeBtn = document.getElementById('boutique-close');
  const soldeEl = document.getElementById('boutique-solde');
  const intro = document.getElementById('boutique-intro');
  const liste = document.getElementById('boutique-liste');
  const status = document.getElementById('boutique-status');
  let onToggle = null;

  function dire(texte) {
    if (voice) voice.explain(texte, { rate: currentBand().rate });
  }

  function render() {
    const profil = getActiveId();
    const points = solde(profil);
    const choisie = prochaineEspece(profil);

    soldeEl.textContent = `${points} points`;
    intro.textContent = choisie
      ? `Le prochain œuf donnera un ${catalogueOeufs().find((a) => a.espece === choisie).nom}.`
      : 'Gagne des points en jouant, en prenant soin de ta créature et en revenant la voir. Le prochain œuf est tiré au hasard.';

    liste.innerHTML = '';
    catalogueOeufs().forEach((article) => {
      const acquis = possede(profil, article.id);
      const active = choisie === article.espece;

      const carte = document.createElement('div');
      carte.className = 'boutique-item';
      if (active) carte.classList.add('boutique-item--choisi');

      const image = new Image();
      image.className = 'boutique-item__vignette';
      image.alt = '';
      image.src = `${import.meta.env.BASE_URL || './'}assets/sprites/${article.espece === 'braisillon' ? 'rouge' : article.espece === 'sylvanou' ? 'vert' : article.espece === 'ondinelle' ? 'bleu' : article.espece}.png`;

      const corps = document.createElement('div');
      corps.className = 'boutique-item__corps';
      const nom = document.createElement('strong');
      nom.textContent = article.nom;
      const trait = document.createElement('span');
      trait.className = 'boutique-item__trait';
      trait.textContent = `${article.temperament} · ${article.phrase}`;
      corps.append(nom, trait);

      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'boutique-item__action';

      if (!acquis) {
        bouton.textContent = `${article.prix} pts`;
        bouton.disabled = points < article.prix;
        bouton.addEventListener('click', () => {
          if (!depenser(profil, article.prix)) {
            status.textContent = `Il te manque ${article.prix - solde(profil)} points.`;
            return;
          }
          acheter(profil, article.id);
          choisirProchaine(profil, article.espece);
          status.textContent = `${article.nom} débloqué ! Ton prochain œuf sera le sien.`;
          dire(`${article.nom} est à toi. Le prochain œuf sera un ${article.nom}.`);
          render();
        });
      } else if (active) {
        bouton.textContent = 'Choisi';
        bouton.classList.add('boutique-item__action--choisi');
        bouton.addEventListener('click', () => {
          // Un second appui remet au hasard : on doit pouvoir revenir en
          // arrière sans chercher où.
          choisirProchaine(profil, null);
          status.textContent = 'Le prochain œuf sera une surprise.';
          render();
        });
      } else {
        bouton.textContent = 'Choisir';
        bouton.addEventListener('click', () => {
          choisirProchaine(profil, article.espece);
          status.textContent = `Ton prochain œuf sera un ${article.nom}.`;
          if (onChoix) onChoix(article.espece);
          render();
        });
      }

      carte.append(image, corps, bouton);
      liste.appendChild(carte);
    });
  }

  closeBtn.addEventListener('click', () => close());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) close();
  });

  function open() {
    status.textContent = '';
    render();
    panel.hidden = false;
    if (onToggle) onToggle(true);
  }

  function close() {
    panel.hidden = true;
    if (onToggle) onToggle(false);
  }

  return {
    open,
    close,
    render,
    setToggleHandler(fn) {
      onToggle = fn;
    },
    get isOpen() {
      return !panel.hidden;
    }
  };
}
