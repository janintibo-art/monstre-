import { GAMES, gamesForBand } from '../games/index.js';
import { createSession } from '../games/session.js';
import { createTutor } from '../games/tutor.js';
import { currentBand } from '../state/child.js';

// Interface des jeux educatifs.
//
// Trois regles de conception, toutes dictees par l'age des joueurs :
//
//   1. Grandes cibles. Un doigt d'enfant de quatre ans n'a pas la precision
//      d'un adulte : les reponses font au minimum 92 px de haut.
//   2. Tout ce qui est ecrit est aussi dit. Un enfant qui ne lit pas encore
//      doit pouvoir jouer seul, en ecoutant.
//   3. Jamais de sanction. Pas de chronometre, pas de vies, pas de son
//      d'echec. Une erreur amene un indice, trois erreurs amenent la reponse
//      et on passe a la suite.

// Delai entre la bonne reponse et la question suivante : assez pour voir la
// creature se rejouir, assez court pour ne pas perdre l'attention.
const NEXT_DELAY = 1500;
const SEQUENCE_STEP = 700;

export function createGamesUi({ getPet, voice, voiceProfile, onCelebrate, onEncourage }) {
  const panel = document.getElementById('games');
  const closeBtn = document.getElementById('games-close');
  const listView = document.getElementById('games-list');
  const playView = document.getElementById('games-play');
  const intro = document.getElementById('games-intro');

  const titleEl = document.getElementById('game-title');
  const progressEl = document.getElementById('game-progress');
  const promptEl = document.getElementById('game-prompt');
  const displayEl = document.getElementById('game-display');
  const choicesEl = document.getElementById('game-choices');
  const feedbackEl = document.getElementById('game-feedback');
  const repeatBtn = document.getElementById('game-repeat');
  const whyBtn = document.getElementById('game-why');
  const quitBtn = document.getElementById('game-quit');

  const tutor = createTutor(getPet);

  let session = null;
  let locked = false;
  let timers = [];
  let onClose = null;

  function later(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function say(text) {
    if (!text) return;
    voice.narrate(text, voiceProfile(getPet(), currentBand()));
  }

  /* ---------------------------------------------------------- liste des jeux */

  function renderList() {
    const band = currentBand();
    const games = gamesForBand(band);

    intro.textContent =
      band.id === 'none'
        ? 'Tous les jeux sont proposés. Indique un âge dans les réglages pour les adapter.'
        : `Jeux adaptés à ${band.label}. ${band.description}`;

    listView.innerHTML = '';
    games.forEach((game) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'game-card';
      card.innerHTML = '';

      const icon = document.createElement('span');
      icon.className = 'game-card__icon';
      icon.textContent = game.icon;

      const body = document.createElement('span');
      body.className = 'game-card__body';
      const name = document.createElement('strong');
      name.textContent = game.name;
      const skill = document.createElement('span');
      skill.className = 'game-card__skill';
      skill.textContent = `${game.skill} · ${game.ages[0]}${game.ages[1] >= 99 ? ' ans et +' : ` à ${game.ages[1]} ans`}`;
      body.append(name, skill);

      card.append(icon, body);
      card.addEventListener('click', () => start(game));
      listView.appendChild(card);
    });

    // Si le catalogue evolue, on ne veut pas d'un ecran vide sans explication.
    if (!games.length) {
      const empty = document.createElement('p');
      empty.className = 'hint';
      empty.textContent = 'Aucun jeu pour cet âge pour le moment.';
      listView.appendChild(empty);
    }

    listView.hidden = false;
    playView.hidden = true;
    intro.hidden = false;
  }

  /* ------------------------------------------------------------ une partie */

  function start(game) {
    session = createSession(game, { level: currentBand().level, seed: Date.now() });
    titleEl.textContent = `${game.icon} ${game.name}`;
    listView.hidden = true;
    intro.hidden = true;
    playView.hidden = false;
    nextQuestion();
  }

  function nextQuestion() {
    clearTimers();
    tutor.cancel();
    feedbackEl.textContent = '';
    whyBtn.hidden = true;
    locked = false;

    const question = session.next();
    if (!question) return finish();

    progressEl.textContent = `Question ${session.index} sur ${session.total}`;
    promptEl.textContent = question.promptText || question.prompt;
    displayEl.innerHTML = '';
    displayEl.hidden = true;

    if (question.display) {
      displayEl.hidden = false;
      displayEl.className = 'game-display game-display--big';
      displayEl.textContent = question.display;
    }
    if (question.kind === 'clock') {
      displayEl.hidden = false;
      displayEl.className = 'game-display';
      displayEl.appendChild(drawClock(question.clock));
    }

    renderChoices(question);
    say(question.prompt);

    // Jeu de memoire : on montre la suite, puis on rend la main.
    if (question.showSequence) {
      showSequence(question);
    }
  }

  function renderChoices(question, disabled = false) {
    choicesEl.innerHTML = '';
    choicesEl.className = `game-choices game-choices--${question.kind}`;

    question.choices.forEach((choice) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice';
      button.dataset.key = choice.key;
      button.disabled = disabled;

      if (question.kind === 'color') {
        button.classList.add('choice--color');
        button.style.background = choice.value;
        // La couleur seule ne suffit pas : un enfant daltonien doit pouvoir
        // jouer, et le lecteur d'ecran doit annoncer autre chose qu'un bouton.
        button.setAttribute('aria-label', choice.label);
        const tag = document.createElement('span');
        tag.className = 'choice__tag';
        tag.textContent = choice.label;
        button.appendChild(tag);
      } else if (question.kind === 'shape') {
        button.classList.add('choice--shape');
        button.setAttribute('aria-label', choice.label);
        button.appendChild(drawShape(choice.value));
      } else if (question.kind === 'dots') {
        button.classList.add('choice--dots');
        button.setAttribute('aria-label', `${choice.value}`);
        button.textContent = choice.label;
      } else {
        button.classList.add('choice--text');
        button.textContent = choice.label;
      }

      button.addEventListener('click', () => submit(choice.key, button));
      choicesEl.appendChild(button);
    });
  }

  // Montre la suite a memoriser, une couleur apres l'autre.
  function showSequence(question) {
    locked = true;
    renderChoices(question, true);
    feedbackEl.textContent = 'Regarde bien…';

    question.sequence.forEach((key, i) => {
      later(() => {
        const button = choicesEl.querySelector(`[data-key="${CSS.escape(key)}"]`);
        if (!button) return;
        button.classList.add('choice--flash');
        later(() => button.classList.remove('choice--flash'), SEQUENCE_STEP * 0.6);
      }, SEQUENCE_STEP * (i + 1));
    });

    later(
      () => {
        locked = false;
        renderChoices(question, false);
        feedbackEl.textContent = 'À toi !';
        say('À toi !');
      },
      SEQUENCE_STEP * (question.sequence.length + 1.4)
    );
  }

  function submit(key, button) {
    if (locked || !session || !session.question) return;
    const question = session.question;
    const result = session.answer(key);
    if (!result) return;

    if (result.state === 'progress') {
      button.classList.add('choice--picked');
      return;
    }

    if (result.state === 'won') {
      locked = true;
      button.classList.add('choice--good');
      feedbackEl.textContent = result.say;
      say(result.say);
      if (onCelebrate) onCelebrate();
      whyBtn.hidden = !question.explain;
      later(nextQuestion, NEXT_DELAY);
      return;
    }

    if (result.state === 'given') {
      locked = true;
      feedbackEl.textContent = `${result.say} ${question.explain}`;
      say(`${result.say} ${question.explain}`);
      (result.reveal || []).forEach((k) => {
        const el = choicesEl.querySelector(`[data-key="${CSS.escape(k)}"]`);
        if (el) el.classList.add('choice--good');
      });
      later(nextQuestion, NEXT_DELAY + 1600);
      return;
    }

    // Erreur : le bouton tremble, on ne le retire pas. Faire disparaitre une
    // reponse fausse empeche de comprendre pourquoi elle etait fausse.
    button.classList.add('choice--wrong');
    later(() => button.classList.remove('choice--wrong'), 600);
    if (onEncourage) onEncourage();

    const message = tutor.hint(session.game, question, {
      onBetter: (better) => {
        // L'IA a repondu a temps : on remplace l'indice local et on le relit.
        if (session && session.question === question) {
          feedbackEl.textContent = better;
          say(better);
        }
      }
    });
    const text = result.say.includes(question.hint) ? result.say : `${result.say} ${message}`;
    feedbackEl.textContent = text.trim();
    say(text.trim());

    if (result.restart) renderChoices(question, false);
  }

  function finish() {
    const summary = session.summary();
    progressEl.textContent = 'Partie terminée';
    promptEl.textContent = `${summary.correct} bonnes réponses sur ${summary.total}`;
    displayEl.hidden = false;
    displayEl.className = 'game-display game-display--big';
    displayEl.textContent = '⭐'.repeat(Math.max(1, summary.correct));
    feedbackEl.textContent = summary.message;
    say(`${summary.correct} sur ${summary.total}. ${summary.message}`);
    if (onCelebrate) onCelebrate(summary.correct >= summary.total * 0.8);

    choicesEl.innerHTML = '';
    choicesEl.className = 'game-choices game-choices--text';

    const again = document.createElement('button');
    again.type = 'button';
    again.className = 'choice choice--text';
    again.textContent = 'Rejouer';
    again.addEventListener('click', () => start(session.game));

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'choice choice--text';
    back.textContent = 'Autre jeu';
    back.addEventListener('click', renderList);

    choicesEl.append(again, back);
    whyBtn.hidden = true;
  }

  /* ---------------------------------------------------------------- dessins */

  function drawShape(path) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');
    const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    shape.setAttribute('d', path);
    shape.setAttribute('fill', 'currentColor');
    svg.appendChild(shape);
    return svg;
  }

  function drawClock({ heure, minute }) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'clock');
    svg.setAttribute('aria-hidden', 'true');

    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', '46');
    circle.setAttribute('fill', 'rgba(11,15,30,0.7)');
    circle.setAttribute('stroke', 'currentColor');
    circle.setAttribute('stroke-width', '3');
    svg.appendChild(circle);

    // Les douze reperes, avec les heures en chiffres : on apprend a lire un
    // cadran, pas a estimer un angle.
    for (let i = 1; i <= 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const text = document.createElementNS(ns, 'text');
      text.setAttribute('x', String(50 + Math.cos(angle) * 36));
      text.setAttribute('y', String(50 + Math.sin(angle) * 36 + 4));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '11');
      text.setAttribute('fill', 'currentColor');
      text.textContent = String(i);
      svg.appendChild(text);
    }

    const hand = (angle, length, width, color) => {
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', '50');
      line.setAttribute('y1', '50');
      line.setAttribute('x2', String(50 + Math.cos(angle) * length));
      line.setAttribute('y2', String(50 + Math.sin(angle) * length));
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', String(width));
      line.setAttribute('stroke-linecap', 'round');
      svg.appendChild(line);
    };

    // La petite aiguille avance aussi entre deux heures : sinon 3 h 30 se lirait
    // exactement comme 3 h, et l'enfant apprendrait quelque chose de faux.
    const hourAngle = ((heure % 12) / 12 + minute / 720) * Math.PI * 2 - Math.PI / 2;
    const minuteAngle = (minute / 60) * Math.PI * 2 - Math.PI / 2;
    hand(hourAngle, 24, 5, 'currentColor');
    hand(minuteAngle, 34, 3, '#6fe3c4');

    const pin = document.createElementNS(ns, 'circle');
    pin.setAttribute('cx', '50');
    pin.setAttribute('cy', '50');
    pin.setAttribute('r', '3');
    pin.setAttribute('fill', 'currentColor');
    svg.appendChild(pin);

    return svg;
  }

  /* --------------------------------------------------------------- contrôles */

  repeatBtn.addEventListener('click', () => {
    if (session && session.question) say(session.question.prompt);
  });

  whyBtn.addEventListener('click', async () => {
    if (!session || !session.question) return;
    whyBtn.disabled = true;
    feedbackEl.textContent = '…';
    const text = await tutor.explain(session.game, session.question);
    feedbackEl.textContent = text;
    say(text);
    whyBtn.disabled = false;
  });

  quitBtn.addEventListener('click', () => {
    clearTimers();
    tutor.cancel();
    voice.stop();
    renderList();
  });

  closeBtn.addEventListener('click', () => close());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) close();
  });

  function open() {
    voice.unlock();
    renderList();
    panel.hidden = false;
    if (onClose) onClose(true);
  }

  function close() {
    clearTimers();
    tutor.cancel();
    voice.stop();
    session = null;
    panel.hidden = true;
    if (onClose) onClose(false);
  }

  return {
    open,
    close,
    setToggleHandler(fn) {
      onClose = fn;
    },
    get isOpen() {
      return !panel.hidden;
    }
  };
}
