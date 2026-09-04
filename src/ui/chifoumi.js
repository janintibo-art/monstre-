import {
  COUPS,
  NOMS,
  coupCreature,
  resultat,
  phrase,
  commentaire,
  bilan
} from '../games/chifoumi.js';
import { currentBand } from '../state/profiles.js';

// Le chifoumi.
//
// Le seul jeu qui se joue **dans la scène**, sans panneau. Les autres cachent
// la créature derrière une liste de questions ; celui-ci la laisse au milieu de
// son décor et se contente d'une barre en bas. On joue avec elle, on la voit
// gagner et perdre.
//
// Trois manches gagnantes par défaut : assez pour qu'une lecture du jeu de
// l'adversaire serve, assez court pour rejouer tout de suite.

const MANCHES = 5;
const COMPTE = ['Pierre…', 'Feuille…', 'Ciseaux !'];

export function createChifoumi({
  getPet,
  voice,
  voiceProfile,
  onListen,
  onReaction,
  onQuit
}) {
  const racine = document.getElementById('chifoumi');
  const revele = document.getElementById('chifoumi-revele');
  const mainJoueur = document.getElementById('chifoumi-joueur');
  const mainCreature = document.getElementById('chifoumi-creature');
  const verdict = document.getElementById('chifoumi-verdict');
  const score = document.getElementById('chifoumi-score');
  const boutons = document.getElementById('chifoumi-coups');
  const micro = document.getElementById('chifoumi-micro');
  const quitter = document.getElementById('chifoumi-quitter');

  let historique = [];
  let compte = { gagne: 0, perd: 0, egalite: 0 };
  let occupe = false;
  let manche = 0;
  let onToggle = null;
  let timers = [];

  function base() {
    return import.meta.env.BASE_URL || './';
  }

  function later(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function dire(texte, apres) {
    if (!texte) {
      if (apres) apres();
      return;
    }
    voice.narrate(texte, voiceProfile(getPet(), currentBand()), apres);
  }

  function majScore() {
    score.textContent = `Manche ${Math.min(manche + 1, MANCHES)} sur ${MANCHES} · toi ${compte.gagne} — ${compte.perd} elle`;
  }

  function rendreBoutons() {
    boutons.innerHTML = '';
    COUPS.forEach((coup) => {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'chifoumi__coup';
      bouton.dataset.coup = coup;
      bouton.setAttribute('aria-label', NOMS[coup]);

      const image = new Image();
      image.src = `${base()}assets/chifoumi/humain-${coup === 'feuille' ? 'feuille' : coup}.png`;
      image.alt = '';
      const mot = document.createElement('span');
      mot.textContent = NOMS[coup];

      bouton.append(image, mot);
      bouton.addEventListener('click', () => jouer(coup));
      boutons.appendChild(bouton);
    });
  }

  // Une manche. Le décompte est parlé, puis les deux mains se révèlent
  // ensemble — c'est le moment du jeu, il ne faut pas l'escamoter.
  function jouer(coup) {
    if (occupe || manche >= MANCHES) return;
    occupe = true;

    // La créature choisit AVANT que le décompte s'affiche, et sans jamais
    // regarder le coup du joueur. C'est ce qui distingue un adversaire d'un
    // tricheur, même pour un jeu de trois symboles.
    const sien = coupCreature(historique, getPet().personality || {}, Math.random);
    historique.push(coup);

    revele.classList.remove('chifoumi__revele--montre');
    verdict.textContent = '';
    if (onReaction) onReaction('compte');

    // Elle compte à voix haute et bat la mesure. Sans cela, on joue devant une
    // créature qui regarde ailleurs — c'est ce qui rendait le duel décoratif.
    COMPTE.forEach((mot, i) => {
      later(() => {
        verdict.textContent = mot;
        dire(mot);
        if (onReaction) onReaction('bat');
        if (i === COMPTE.length - 1) later(() => devoiler(coup, sien), 420);
      }, i * 620);
    });
  }

  function devoiler(coup, sien) {
    mainJoueur.src = `${base()}assets/chifoumi/humain-${coup}.png`;
    mainCreature.src = `${base()}assets/chifoumi/monstre-${sien}.png`;
    revele.classList.add('chifoumi__revele--montre');

    const issue = resultat(coup, sien);
    compte[issue] += 1;
    manche += 1;
    majScore();

    verdict.textContent = `${NOMS[coup]} contre ${NOMS[sien]} — ${
      issue === 'gagne' ? 'tu gagnes !' : issue === 'perd' ? 'elle gagne' : 'égalité'
    }`;
    verdict.dataset.issue = issue;

    if (onReaction) onReaction(issue);

    // La créature commente. Elle ne se moque jamais : un enfant qui perd trois
    // fois de suite doit avoir envie de rejouer.
    dire(phrase(issue), () => {
      // Une remarque sur la partie, quand il y a quelque chose à remarquer.
      const remarque = manche < MANCHES ? commentaire(historique, compte) : null;
      if (remarque) {
        verdict.textContent = remarque;
        dire(remarque, () => {
          occupe = false;
        });
        return;
      }
      occupe = false;
      if (manche >= MANCHES) later(finir, 400);
    });
  }

  function finir() {
    const texte = bilan(compte);
    verdict.textContent = texte;
    dire(texte);

    boutons.innerHTML = '';
    const rejouer = document.createElement('button');
    rejouer.type = 'button';
    rejouer.className = 'chifoumi__rejouer';
    rejouer.textContent = 'Rejouer';
    rejouer.addEventListener('click', () => demarrer(true));
    boutons.appendChild(rejouer);
  }

  micro.addEventListener('click', () => {
    if (!onListen || occupe) return;
    verdict.textContent = 'Dis « pierre », « feuille » ou « ciseaux »…';
    onListen(
      (entendu) => {
        const dit = String(entendu || '').toLowerCase();
        const trouve = COUPS.find((c) => dit.includes(c) || dit.includes(NOMS[c].toLowerCase()));
        if (trouve) jouer(trouve);
        else verdict.textContent = `J’ai entendu « ${entendu} ». Redis-moi ton coup.`;
      },
      COUPS.map((c) => ({ key: c, label: NOMS[c] }))
    );
  });

  quitter.addEventListener('click', () => fermer());

  function demarrer(garderHistorique = false) {
    clearTimers();
    manche = 0;
    compte = { gagne: 0, perd: 0, egalite: 0 };
    // L'historique survit à une revanche : la créature continue d'apprendre
    // de ce que joue la personne en face, ce qui est tout l'intérêt.
    if (!garderHistorique) historique = [];
    occupe = false;
    revele.classList.remove('chifoumi__revele--montre');
    verdict.textContent = 'À toi de jouer.';
    delete verdict.dataset.issue;
    rendreBoutons();
    majScore();
  }

  function ouvrir() {
    voice.unlock();
    demarrer();
    racine.hidden = false;
    micro.hidden = !onListen;
    // Le reste de l'interface s'efface : on ne joue pas au chifoumi par-dessus
    // une barre de soins et une ligne de pensée qui parle d'autre chose.
    document.documentElement.classList.add('duel-en-cours');
    if (onToggle) onToggle(true);
    dire('Alors, on joue ? Choisis ton coup.');
  }

  function fermer() {
    clearTimers();
    voice.stop();
    racine.hidden = true;
    document.documentElement.classList.remove('duel-en-cours');
    if (onToggle) onToggle(false);
    if (onQuit) onQuit();
  }

  return {
    ouvrir,
    fermer,
    setToggleHandler(fn) {
      onToggle = fn;
    },
    get ouvert() {
      return !racine.hidden;
    }
  };
}
