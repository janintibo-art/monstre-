import { parseReminder, parseLead, formatWhen, LEADS, leadById, triggerTime } from '../agenda/parse.js';
import { listReminders, addReminder, removeReminder, completeReminder, prune } from '../agenda/store.js';
import * as notify from '../agenda/notify.js';
import { currentBand, getActiveId } from '../state/profiles.js';

// Le pense-bête.
//
// Le point important est la **question de prévenance**. Enregistrer « médecin
// mardi 17 h » ne sert à rien si l'on est prévenu à 17 h pile : il faut être
// parti depuis longtemps. La créature demande donc systématiquement quand elle
// doit prévenir, et propose des réponses à toucher autant qu'à dire — c'est la
// seule information que l'utilisateur oublie toujours de donner spontanément.

export function createAgendaUi({ getPet, voice, voiceProfile, onListen, onRecall }) {
  const panel = document.getElementById('agenda');
  const closeBtn = document.getElementById('agenda-close');
  const intro = document.getElementById('agenda-intro');
  const listView = document.getElementById('agenda-list');

  const ask = document.getElementById('agenda-ask');
  const askWhat = document.getElementById('agenda-what');
  const leadsRow = document.getElementById('agenda-leads');
  const leadVoice = document.getElementById('agenda-lead-voice');
  const cancelBtn = document.getElementById('agenda-cancel');

  const addRow = document.getElementById('agenda-add');
  const field = document.getElementById('agenda-field');
  const sendBtn = document.getElementById('agenda-send');
  const status = document.getElementById('agenda-status');

  let pending = null; // rendez-vous compris, en attente du moment de prévenance
  let onToggle = null;

  function say(text) {
    if (!text) return;
    voice.narrate(text, voiceProfile(getPet(), currentBand()));
  }

  /* ------------------------------------------------------------- la liste */

  function render() {
    const profileId = getActiveId();
    prune(profileId);
    const list = listReminders(profileId).filter((r) => !r.done);
    const now = Date.now();

    intro.textContent = list.length
      ? 'Je te préviendrai, même si l’application est fermée.'
      : 'Dis-moi un rendez-vous et je m’en souviendrai. Par exemple : « rendez-vous chez le médecin mardi à 17 h ».';

    listView.innerHTML = '';
    list.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'agenda-item';
      const reste = item.at - now;
      if (reste < 0) row.classList.add('agenda-item--past');
      else if (reste < 24 * 3600000) row.classList.add('agenda-item--soon');

      const mark = document.createElement('div');
      mark.className = 'agenda-item__mark';

      const body = document.createElement('div');
      body.className = 'agenda-item__body';
      const subject = document.createElement('div');
      subject.className = 'agenda-item__subject';
      subject.textContent = item.subject || 'Rendez-vous';
      const when = document.createElement('div');
      when.className = 'agenda-item__when';
      const prevenance = item.lead && item.lead.label ? ` · prévenu ${item.lead.label.toLowerCase()}` : '';
      when.textContent = `${formatWhen(item.at, new Date(now))}${prevenance}`;
      body.append(subject, when);

      const drop = document.createElement('button');
      drop.type = 'button';
      drop.className = 'agenda-item__drop';
      drop.textContent = '×';
      drop.setAttribute('aria-label', `Oublier ${item.subject}`);
      drop.addEventListener('click', () => {
        notify.cancel(item);
        removeReminder(profileId, item.id);
        render();
      });

      row.append(mark, body, drop);
      listView.appendChild(row);
    });

    ask.hidden = !pending;
    addRow.hidden = Boolean(pending);
    listView.hidden = Boolean(pending);
  }

  /* --------------------------------------------- la question de prévenance */

  function startAsk(reminder, { spoken = true } = {}) {
    pending = reminder;
    const quand = formatWhen(reminder.at);
    askWhat.textContent = reminder.subject
      ? `${capitalize(reminder.subject)}, ${quand}.`
      : `Rendez-vous ${quand}.`;

    leadsRow.innerHTML = '';
    LEADS.forEach((lead) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = lead.label;
      chip.addEventListener('click', () => confirm(lead));
      leadsRow.appendChild(chip);
    });

    panel.hidden = false;
    if (onToggle) onToggle(true);
    render();

    if (spoken) {
      say(
        `${askWhat.textContent} Quand veux-tu que je te prévienne ? Une heure avant, le matin même, ou la veille au soir ?`
      );
    }
  }

  async function confirm(lead) {
    if (!pending) return;
    const profileId = getActiveId();
    const item = addReminder(profileId, { ...pending, lead });
    pending = null;

    const quand = formatWhen(item.at);
    const rappel = formatWhen(triggerTime(item.at, lead));

    // La permission n'est demandée qu'ici : au moment où elle sert vraiment,
    // pas au premier lancement où personne ne comprend pourquoi.
    const ok = await notify.ensurePermission();
    if (ok) await notify.schedule(item, getPet().name);

    render();
    const phrase = ok
      ? `C’est noté : ${item.subject || 'rendez-vous'} ${quand}. Je te préviens ${rappel}.`
      : `C’est noté : ${item.subject || 'rendez-vous'} ${quand}. Je te préviendrai quand tu ouvriras l’application — autorise les notifications pour que je te prévienne même fermé.`;
    say(phrase);
    status.textContent = phrase;
  }

  cancelBtn.addEventListener('click', () => {
    pending = null;
    render();
  });

  leadVoice.addEventListener('click', () => {
    if (!onListen) return;
    voice.stop();
    status.textContent = 'Je t’écoute…';
    onListen(
      (heard) => {
        const lead = parseLead(heard);
        if (!lead) {
          status.textContent = `J’ai entendu « ${heard} ». Dis par exemple « une heure avant » ou « la veille au soir ».`;
          say('Je n’ai pas compris. Une heure avant, le matin même, ou la veille au soir ?');
          return;
        }
        confirm(lead);
      },
      LEADS.map((l) => ({ key: l.id, label: l.spoken }))
    );
  });

  /* ------------------------------------------------------------- l'ajout */

  function submitText() {
    const text = field.value.trim();
    if (!text) return;
    const reminder = parseReminder(text);
    if (!reminder) {
      status.textContent =
        'Je n’ai pas trouvé de date. Essaie « rendez-vous chez le dentiste jeudi à 10 h ».';
      return;
    }
    field.value = '';
    status.textContent = '';
    startAsk(reminder, { spoken: false });
  }

  sendBtn.addEventListener('click', submitText);
  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitText();
  });

  closeBtn.addEventListener('click', () => close());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) close();
  });

  function open() {
    voice.unlock();
    render();
    panel.hidden = false;
    if (onToggle) onToggle(true);
  }

  function close() {
    voice.stop();
    pending = null;
    panel.hidden = true;
    if (onToggle) onToggle(false);
  }

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  return {
    open,
    close,
    startAsk,
    render,
    setToggleHandler(fn) {
      onToggle = fn;
    },
    get isOpen() {
      return !panel.hidden;
    },
    get asking() {
      return Boolean(pending);
    }
  };
}

// Bandeau de rappel affiché dans le jeu. La créature vient au premier plan,
// s'agite, et répète tant qu'on ne l'a pas acquitté — c'est ce qu'on lui a
// demandé de faire.
export function createRecall({ getPet, voice, voiceProfile }) {
  let element = null;
  let current = null;
  let repeatTimer = null;

  function say(text) {
    voice.narrate(text, voiceProfile(getPet(), currentBand()));
  }

  function show(reminder, { onDismiss } = {}) {
    if (current && current.id === reminder.id) return;
    hide();
    current = reminder;

    element = document.createElement('div');
    element.className = 'recall';
    element.setAttribute('role', 'alert');

    const body = document.createElement('div');
    body.className = 'recall__body';
    const subject = document.createElement('div');
    subject.className = 'recall__subject';
    subject.textContent = reminder.subject || 'Rendez-vous';
    const when = document.createElement('div');
    when.className = 'recall__when';
    when.textContent = formatWhen(reminder.at);
    body.append(subject, when);

    const ok = document.createElement('button');
    ok.type = 'button';
    ok.textContent = 'C’est noté';
    ok.addEventListener('click', () => {
      completeReminder(getActiveId(), reminder.id);
      notify.cancel(reminder);
      hide();
      if (onDismiss) onDismiss(reminder);
    });

    element.append(body, ok);
    document.body.appendChild(element);

    const phrase = `N’oublie pas : ${reminder.subject || 'ton rendez-vous'}, ${formatWhen(reminder.at)}.`;
    say(phrase);

    // Il répète toutes les vingt secondes, tant qu'on ne l'a pas acquitté.
    // Insistant, mais c'est exactement le rôle d'un pense-bête.
    repeatTimer = setInterval(() => {
      if (current) say(phrase);
    }, 20000);
  }

  function hide() {
    clearInterval(repeatTimer);
    repeatTimer = null;
    if (element) element.remove();
    element = null;
    current = null;
  }

  return {
    show,
    hide,
    get active() {
      return Boolean(current);
    },
    get reminder() {
      return current;
    }
  };
}
