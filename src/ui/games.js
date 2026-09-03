import { GAMES, gamesForBand } from '../games/index.js';
import { createSession } from '../games/session.js';
import { createTutor } from '../games/tutor.js';
import { currentBand } from '../state/profiles.js';
import { matchChoice } from '../audio/hearing.js';
import { iconContent } from './icons.js';
import { topicsFor, personalTopic } from '../games/topics.js';

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

export function createGamesUi({
  getPet,
  voice,
  voiceProfile,
  onAnswer, // meme voie de reponse que le chat : memoire, IA, voix
  onListen, // demande d'ecoute au micro
  onChifoumi, // jeu joué dans la scène, hors panneau
  onCelebrate,
  onEncourage
}) {
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
  const talkView = document.getElementById('games-talk');
  const talkTopic = document.getElementById('talk-topic');
  const talkLog = document.getElementById('talk-log');
  const talkMic = document.getElementById('talk-mic');
  const talkWrite = document.getElementById('talk-write');
  const talkInputRow = document.getElementById('talk-input');
  const talkField = document.getElementById('talk-field');
  const talkSend = document.getElementById('talk-send');
  const talkAgain = document.getElementById('talk-again');
  const talkOther = document.getElementById('talk-other');
  const talkQuit = document.getElementById('talk-quit');
  const gameTalkBtn = document.getElementById('game-talk');

  const repeatBtn = document.getElementById('game-repeat');
  const voiceBtn = document.getElementById('game-voice');
  const modeVoixCase = document.getElementById('field-jeu-voix');
  const modeVoixLigne = document.getElementById('games-mode-voix');
  const whyBtn = document.getElementById('game-why');
  const quitBtn = document.getElementById('game-quit');

  const tutor = createTutor(getPet);

  // Mode voix : la créature pose la question, écoute, réagit, enchaîne. On ne
  // touche plus l'écran du tout. C'est ce qui transforme un questionnaire en
  // conversation.
  const CLE_MODE_VOIX = 'monstre.jeux.voix';
  let modeVoix = false;
  let essaisVoix = 0;

  try {
    modeVoix = localStorage.getItem(CLE_MODE_VOIX) === '1';
  } catch {
    /* stockage indisponible */
  }

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

  // `apres` est appelé quand la phrase est FINIE. Sans ce signal, le micro
  // s'ouvrirait pendant que la créature parle et n'entendrait qu'elle-même.
  function say(text, apres) {
    if (!text) {
      if (apres) apres();
      return;
    }
    // C'est la créature qui lit la consigne — cela fait partie du plaisir —
    // mais `narrate` borne sa hauteur : au-delà, une phrase de dix mots n'est
    // plus compréhensible.
    const dit = voice.narrate(text, voiceProfile(getPet(), currentBand()), apres);
    if (!dit.spoken && feedbackEl && dit.raison) {
      // Aucun moteur vocal : la consigne reste lisible à l'écran, on ne la
      // remplace pas par du babil qui la couvrirait pour rien.
      feedbackEl.dataset.muet = '1';
    }
  }

  /* ---------------------------------------------------------- liste des jeux */

  function renderList() {
    const band = currentBand();
    const games = gamesForBand(band, { micro: Boolean(onListen) });

    modeVoixCase.checked = modeVoix;
    modeVoixLigne.hidden = !onListen;

    intro.textContent =
      band.id === 'none'
        ? 'Tous les jeux sont proposés. Indique un âge dans les réglages pour les adapter.'
        : `Jeux adaptés à ${band.label}. ${band.description}`;

    listView.innerHTML = '';

    // La conversation est en tete de liste, avant les jeux : pour beaucoup de
    // gens — les plus jeunes comme les plus ages — c'est l'activite principale,
    // et les jeux sont ce qu'on fait entre deux discussions.
    const papoter = document.createElement('button');
    papoter.type = 'button';
    papoter.className = 'game-card game-card--talk';
    const pIcon = document.createElement('span');
    pIcon.className = 'game-card__icon';
    pIcon.textContent = '💬';
    const pBody = document.createElement('span');
    pBody.className = 'game-card__body';
    const pName = document.createElement('strong');
    pName.textContent = 'Papoter avec moi';
    const pSkill = document.createElement('span');
    pSkill.className = 'game-card__skill';
    pSkill.textContent = 'Discussion · je propose le sujet, vous n’avez qu’à répondre';
    pBody.append(pName, pSkill);
    papoter.append(pIcon, pBody);
    papoter.addEventListener('click', () => startTalk());
    listView.appendChild(papoter);

    // Le chifoumi ne s'ouvre pas dans ce panneau : il ferme tout et se joue
    // dans le décor. Sa carte le dit.
    if (onChifoumi) {
      const duel = document.createElement('button');
      duel.type = 'button';
      duel.className = 'game-card game-card--scene';
      const dIcon = document.createElement('span');
      dIcon.className = 'game-card__icon';
      dIcon.appendChild(iconContent('jeu:chifoumi', '✊'));
      const dBody = document.createElement('span');
      dBody.className = 'game-card__body';
      const dName = document.createElement('strong');
      dName.textContent = 'Chifoumi';
      const dSkill = document.createElement('span');
      dSkill.className = 'game-card__skill';
      dSkill.textContent = 'Duel · dans le décor, face à elle';
      dBody.append(dName, dSkill);
      duel.append(dIcon, dBody);
      duel.addEventListener('click', () => onChifoumi());
      listView.appendChild(duel);
    }

    games.forEach((game) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'game-card';
      card.innerHTML = '';

      const icon = document.createElement('span');
      icon.className = 'game-card__icon';
      icon.appendChild(iconContent(`jeu:${game.id}`, game.icon));

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
    talkView.hidden = true;
    intro.hidden = false;
    titleEl.textContent = 'Jeux et discussion';
  }

  /* ------------------------------------------------------------ une partie */

  function start(game) {
    session = createSession(game, { level: currentBand().level, seed: Date.now() });
    titleEl.textContent = `${game.icon} ${game.name}`;
    listView.hidden = true;
    intro.hidden = true;
    talkView.hidden = true;
    playView.hidden = false;
    nextQuestion();
  }

  function nextQuestion() {
    clearTimers();
    tutor.cancel();
    feedbackEl.textContent = '';
    whyBtn.hidden = true;
    gameTalkBtn.hidden = true;
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
    voiceBtn.hidden = !onListen;
    essaisVoix = 0;

    // En mode voix, on écoute dès que la question est posée — pas avant.
    say(question.prompt, modeVoix && onListen ? () => ecouterReponse(question) : null);

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
      // Certaines questions ouvrent sur une discussion : proverbes, geographie,
      // souvenirs de prix. C'est la que le jeu devient un pretexte a parler.
      gameTalkBtn.hidden = !question.talk;
      gameTalkBtn.onclick = question.talk ? () => startTalk(question.talk) : null;
      later(nextQuestion, question.talk ? NEXT_DELAY + 1200 : NEXT_DELAY);
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
    // Une étoile par bonne réponse : l'icône maison si elle existe.
    displayEl.textContent = '';
    for (let i = 0; i < Math.max(1, summary.correct); i += 1) {
      displayEl.appendChild(iconContent('etoile', '⭐'));
    }
    feedbackEl.textContent = summary.message;
    say(`${summary.correct} sur ${summary.total}. ${summary.message}`);
    if (onCelebrate) onCelebrate(summary.correct >= summary.total * 0.8);

    choicesEl.innerHTML = '';
    choicesEl.className = 'game-choices game-choices--text';

    const again = document.createElement('button');
    again.type = 'button';
    again.className = 'choice choice--text';
    again.textContent = '';
    again.appendChild(iconContent('rejouer', '🔁'));
    const motRejouer = document.createElement('span');
    motRejouer.textContent = ' Rejouer';
    again.appendChild(motRejouer);
    again.addEventListener('click', () => start(session.game));

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'choice choice--text';
    back.textContent = 'Autre jeu';
    back.addEventListener('click', renderList);

    const discuter = document.createElement('button');
    discuter.type = 'button';
    discuter.className = 'choice choice--text';
    discuter.textContent = '💬 Papoter';
    discuter.addEventListener('click', () => startTalk());

    choicesEl.append(again, discuter, back);
    whyBtn.hidden = true;
    gameTalkBtn.hidden = true;
  }

  /* ------------------------------------------------------------- papoter */

  let topic = null;
  let relanceIndex = 0;
  let lastSaid = '';
  let talking = false;

  function talkLine(text, who) {
    const line = document.createElement('div');
    line.className = `line line--${who}`;
    line.textContent = text;
    talkLog.appendChild(line);
    talkLog.scrollTop = talkLog.scrollHeight;
  }

  function creatureSays(text) {
    lastSaid = text;
    talkLine(text, 'pet');
    say(text);
  }

  // Choisit un sujet. Un sujet personnel — tire de ce que la creature a retenu —
  // passe en priorite une fois sur trois : c'est ce qui donne l'impression
  // qu'elle se souvient de la derniere conversation, parce que c'est le cas.
  function chooseTopic(force = null) {
    if (force) return force;
    const band = currentBand();
    const perso = personalTopic(getPet());
    if (perso && Math.random() < 0.34) return perso;
    const list = topicsFor(band).filter((t) => !topic || t.id !== topic.id);
    return list[Math.floor(Math.random() * list.length)];
  }

  function startTalk(seed = null) {
    listView.hidden = true;
    intro.hidden = true;
    playView.hidden = true;
    talkView.hidden = false;
    talkLog.innerHTML = '';
    talkInputRow.hidden = true;
    relanceIndex = 0;

    if (seed) {
      // Sujet amene par une question de jeu : on enchaine naturellement.
      topic = { id: 'jeu', icon: '🎲', title: 'À propos du jeu', opener: seed, relances: [] };
    } else {
      topic = chooseTopic();
    }

    titleEl.textContent = `${topic.icon} ${topic.title}`;
    talkTopic.textContent = topic.personal ? 'Je me souviens de quelque chose…' : 'Parlons un peu';
    creatureSays(topic.opener);
  }

  async function sendTalk(text) {
    if (!text || talking) return;
    talking = true;
    talkLine(text, 'you');
    talkField.value = '';

    const pending = document.createElement('div');
    pending.className = 'line line--pet line--thinking';
    pending.textContent = '…';
    talkLog.appendChild(pending);
    talkLog.scrollTop = talkLog.scrollHeight;

    try {
      const reply = await onAnswer(text, { silent: true });
      pending.remove();
      if (reply) creatureSays(reply);

      // Relance apres la reponse : c'est ce qui evite que la conversation
      // retombe apres deux phrases. Une seule question a la fois, jamais deux.
      const relances = topic.relances || [];
      if (relances.length && relanceIndex < relances.length) {
        const relance = relances[relanceIndex];
        relanceIndex += 1;
        setTimeout(() => {
          if (!talkView.hidden) creatureSays(relance);
        }, 2600);
      }
    } catch (error) {
      pending.remove();
      talkLine('Je n’ai pas bien entendu. Voulez-vous répéter ?', 'pet');
    } finally {
      talking = false;
    }
  }

  talkWrite.addEventListener('click', () => {
    talkInputRow.hidden = !talkInputRow.hidden;
    if (!talkInputRow.hidden) talkField.focus();
  });
  talkSend.addEventListener('click', () => sendTalk(talkField.value.trim()));
  talkField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendTalk(talkField.value.trim());
  });
  talkMic.addEventListener('click', () => {
    voice.unlock();
    // Le micro passe par le meme module que le reste : une seule voie d'ecoute
    // a maintenir, et la voix de la creature se coupe pendant qu'on parle.
    if (onListen) onListen((heard) => sendTalk(heard));
  });
  talkAgain.addEventListener('click', () => say(lastSaid));
  talkOther.addEventListener('click', () => startTalk());
  talkQuit.addEventListener('click', () => {
    voice.stop();
    renderList();
  });

  // Écoute la réponse et réagit. Trois tentatives, puis on laisse le doigt
  // reprendre la main : insister davantage devient pénible.
  function ecouterReponse(question) {
    if (!session || session.question !== question || locked) return;
    feedbackEl.textContent = 'Je t’écoute…';

    if (onEncourage) onEncourage('ecoute');

    onListen((heard) => {
      if (!session || session.question !== question) return;

      const choice = matchChoice(heard, question.choices);
      if (choice) {
        const button = choicesEl.querySelector(`[data-key="${CSS.escape(choice.key)}"]`);
        if (button) submit(choice.key, button);
        return;
      }

      essaisVoix += 1;
      if (essaisVoix >= 3) {
        feedbackEl.textContent = `J’ai entendu « ${heard} ». Touche la bonne réponse.`;
        say('Je n’arrive pas à comprendre. Touche la réponse, ça ira plus vite.');
        return;
      }
      feedbackEl.textContent = `J’ai entendu « ${heard} »…`;
      say('Je n’ai pas compris. Tu peux redire ?', () => ecouterReponse(question));
    }, question.choices);
  }

  modeVoixCase.addEventListener('change', () => {
    modeVoix = modeVoixCase.checked;
    try {
      localStorage.setItem(CLE_MODE_VOIX, modeVoix ? '1' : '0');
    } catch {
      /* stockage indisponible */
    }
  });

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

  // Répondre à la voix. C'est ici que la reconnaissance est la plus fiable :
  // on lui donne les réponses affichées comme vocabulaire, donc « vingt-deux »
  // ou « Bordeaux » sont attendus et reconnus même mal prononcés.
  //
  // Ça sert deux publics d'un coup : l'enfant qui ne lit pas encore, et la
  // personne dont les doigts visent moins bien qu'avant.
  voiceBtn.addEventListener('click', () => {
    if (!session || !session.question || locked || !onListen) return;
    const question = session.question;
    voice.unlock();
    voice.stop();
    feedbackEl.textContent = 'Je t’écoute…';

    onListen((heard) => {
      if (!session || session.question !== question) return;
      const choice = matchChoice(heard, question.choices);
      if (!choice) {
        feedbackEl.textContent = `J’ai entendu « ${heard} ». Ce n’est pas une des réponses.`;
        say('Je n’ai pas reconnu de réponse. Tu peux toucher, ou redire.');
        return;
      }
      const button = choicesEl.querySelector(`[data-key="${CSS.escape(choice.key)}"]`);
      if (button) submit(choice.key, button);
    }, question.choices);
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
    topic = null;
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
