import {
  parseReminder,
  parseLead,
  formatWhen,
  LEADS,
  leadById,
  triggerTime,
  TYPES,
  typeById,
  REPETITIONS,
  JOURS_COURTS
} from '../agenda/parse.js';
import {
  listReminders,
  addReminder,
  removeReminder,
  completeReminder,
  prune,
  parJour
} from '../agenda/store.js';
import * as notify from '../agenda/notify.js';
import * as overlay from '../agenda/overlay.js';
import { currentBand, getActiveId } from '../state/profiles.js';
import { iconContent } from './icons.js';

// Le pense-bête.
//
// Le point important est la **question de prévenance**. Enregistrer « médecin
// mardi 17 h » ne sert à rien si l'on est prévenu à 17 h pile : il faut être
// parti depuis longtemps. La créature demande donc systématiquement quand elle
// doit prévenir, et propose des réponses à toucher autant qu'à dire — c'est la
// seule information que l'utilisateur oublie toujours de donner spontanément.

export function createAgendaUi({ getPet, voice, voiceProfile, onListen, getSpeciesFolder }) {
  const panel = document.getElementById('agenda');
  const closeBtn = document.getElementById('agenda-close');
  const intro = document.getElementById('agenda-intro');
  const semaineView = document.getElementById('agenda-semaine');
  const joursView = document.getElementById('agenda-jours');
  const typesRow = document.getElementById('agenda-types');
  const semaineTitre = document.getElementById('semaine-titre');
  const semaineAvant = document.getElementById('semaine-avant');
  const semaineApres = document.getElementById('semaine-apres');
  const semaineDate = document.getElementById('semaine-date');
  const semaineAujourdhui = document.getElementById('semaine-aujourdhui');

  const ask = document.getElementById('agenda-ask');
  const askWhat = document.getElementById('agenda-what');
  const leadsRow = document.getElementById('agenda-leads');
  const leadVoice = document.getElementById('agenda-lead-voice');
  const cancelBtn = document.getElementById('agenda-cancel');

  const addRow = document.getElementById('agenda-add');
  const field = document.getElementById('agenda-field');
  const champSujet = document.getElementById('agenda-champ-sujet');
  const dateInput = document.getElementById('agenda-date');
  const heureInput = document.getElementById('agenda-heure');
  const repetRow = document.getElementById('agenda-repetition');
  const repetTitre = document.getElementById('agenda-repet-titre');
  const joursRow = document.getElementById('agenda-jours-semaine');
  const sendBtn = document.getElementById('agenda-send');
  const dicterBtn = document.getElementById('agenda-dicter');
  const essaiBtn = document.getElementById('agenda-essai');
  const status = document.getElementById('agenda-status');

  let pending = null; // rendez-vous compris, en attente du moment de prévenance
  let onToggle = null;

  function say(text) {
    if (!text) return;
    // Confirmations et questions de l'agenda : c'est l'application qui parle.
    voice.explain(text, { rate: currentBand().rate });
  }

  /* ------------------------------------------------------------- l'agenda */

  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const MOIS = ['janv.', 'févr.', 'mars', 'avril', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  let jourChoisi = null; // filtre par jour, ou null pour toute la semaine
  let typeChoisi = 'rdv';

  // Premier jour de la fenêtre affichée. Sans lui, on restait prisonnier des
  // sept prochains jours : impossible de noter un rendez-vous le mois prochain.
  let debutFenetre = null;

  const MOIS_LONGS = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];

  function minuit(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function fenetre() {
    return debutFenetre ? new Date(debutFenetre) : minuit(Date.now());
  }

  function deplacer(jours) {
    const d = fenetre();
    d.setDate(d.getDate() + jours);
    debutFenetre = minuit(d).getTime();
    jourChoisi = null;
    render();
  }

  function memeJour(a, b) {
    const x = new Date(a);
    const y = new Date(b);
    return x.toDateString() === y.toDateString();
  }

  function titreJour(quand, maintenant) {
    const d = new Date(quand);
    const ecart = Math.round((new Date(quand).setHours(0, 0, 0, 0) - new Date(maintenant).setHours(0, 0, 0, 0)) / 86400000);
    if (ecart === 0) return "Aujourd'hui";
    if (ecart === 1) return 'Demain';
    return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
  }

  // Bande des sept prochains jours. Elle donne d'un coup d'œil la charge de la
  // semaine — c'est ce qu'on regarde en premier dans un agenda, avant même le
  // détail d'une journée.
  function renderSemaine(groupes, maintenant) {
    const depart = fenetre();
    const fin = new Date(depart);
    fin.setDate(fin.getDate() + 6);

    // Le titre nomme le mois — et l'année dès qu'on quitte l'année en cours.
    const memeMois = depart.getMonth() === fin.getMonth();
    const anneeCourante = new Date(maintenant).getFullYear();
    const annee = depart.getFullYear() === anneeCourante ? '' : ` ${depart.getFullYear()}`;
    semaineTitre.textContent = memeMois
      ? `${MOIS_LONGS[depart.getMonth()]}${annee}`
      : `${MOIS_LONGS[depart.getMonth()]} – ${MOIS_LONGS[fin.getMonth()]}${annee}`;

    semaineView.innerHTML = '';
    for (let i = 0; i < 7; i += 1) {
      const jour = new Date(depart);
      jour.setDate(jour.getDate() + i);
      jour.setHours(0, 0, 0, 0);

      const groupe = groupes.find((g) => g.jour === jour.getTime());
      const nombre = groupe ? groupe.items.length : 0;

      const case_ = document.createElement('button');
      case_.type = 'button';
      case_.className = 'semaine__jour';
      if (jourChoisi === jour.getTime()) case_.classList.add('semaine__jour--choisi');
      if (jour.getTime() === minuit(maintenant).getTime()) {
        case_.classList.add('semaine__jour--aujourdhui');
      }

      const nom = document.createElement('span');
      nom.className = 'semaine__nom';
      nom.textContent = JOURS[jour.getDay()].slice(0, 3);
      const chiffre = document.createElement('span');
      chiffre.className = 'semaine__chiffre';
      chiffre.textContent = jour.getDate();

      const points = document.createElement('span');
      points.className = 'semaine__points';
      // Trois points au maximum : au-delà, on compte au lieu d'aligner.
      (groupe ? groupe.items.slice(0, 3) : []).forEach((item) => {
        const point = document.createElement('i');
        point.style.background = typeById(item.type).couleur;
        points.appendChild(point);
      });
      if (nombre > 3) {
        const plus = document.createElement('em');
        plus.textContent = `+${nombre - 3}`;
        points.appendChild(plus);
      }

      case_.append(nom, chiffre, points);
      case_.addEventListener('click', () => {
        jourChoisi = jourChoisi === jour.getTime() ? null : jour.getTime();
        render();
      });
      semaineView.appendChild(case_);
    }
  }

  function ligne(item, maintenant) {
    const type = typeById(item.type);
    const row = document.createElement('div');
    row.className = 'agenda-item';
    row.style.setProperty('--teinte', type.couleur);
    if (item.at < maintenant) row.classList.add('agenda-item--past');

    const mark = document.createElement('div');
    mark.className = 'agenda-item__mark';

    const heure = document.createElement('div');
    heure.className = 'agenda-item__heure';
    const d = new Date(item.at);
    heure.textContent = `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`;

    const body = document.createElement('div');
    body.className = 'agenda-item__body';
    const subject = document.createElement('div');
    subject.className = 'agenda-item__subject';
    subject.textContent = item.subject || type.label;
    const detail = document.createElement('div');
    detail.className = 'agenda-item__when';
    const prevenance = item.lead && item.lead.label ? item.lead.label.toLowerCase() : '';
    detail.textContent = [type.label, item.repete ? 'chaque fois' : '', prevenance ? `prévenu ${prevenance}` : '']
      .filter(Boolean)
      .join(' · ');
    body.append(subject, detail);

    const drop = document.createElement('button');
    drop.type = 'button';
    drop.className = 'agenda-item__drop';
    drop.textContent = '×';
    drop.setAttribute('aria-label', `Oublier ${item.subject || type.label}`);
    drop.addEventListener('click', () => {
      notify.cancel(item);
      overlay.cancel(item);
      removeReminder(getActiveId(), item.id);
      render();
    });

    row.append(mark, heure, body, drop);
    return row;
  }

  function render() {
    const profileId = getActiveId();
    prune(profileId);
    const maintenant = Date.now();
    // On demande assez de jours pour couvrir la fenêtre affichée, puis on ne
    // garde que ceux qui y tombent.
    const depart = fenetre();
    const decalage = Math.round((depart.getTime() - minuit(maintenant).getTime()) / 86400000);
    const tous = parJour(profileId, Math.max(7, decalage + 7), maintenant);
    const finFenetre = depart.getTime() + 7 * 86400000;
    const groupes = tous.filter((g) => g.jour >= depart.getTime() && g.jour < finFenetre);

    renderSemaine(groupes, maintenant);
    renderTypes();
    preparerFormulaire();

    const visibles = jourChoisi === null ? groupes : groupes.filter((g) => g.jour === jourChoisi);

    if (dernierEtat && (!dernierEtat.notifiee || !dernierEtat.promenade)) {
      intro.classList.add('hint--alerte');
    } else {
      intro.classList.remove('hint--alerte');
    }

    intro.textContent = groupes.length
      ? 'Je te préviendrai, même si l’application est fermée.'
      : 'Dis-moi un rendez-vous, une tâche ou une heure de réveil, et je m’en souviendrai.';

    joursView.innerHTML = '';
    visibles.forEach((groupe) => {
      const titre = document.createElement('h3');
      titre.className = 'agenda-jour__titre';
      titre.textContent = titreJour(groupe.jour, maintenant);
      joursView.appendChild(titre);
      groupe.items.forEach((item) => joursView.appendChild(ligne(item, maintenant)));
    });

    if (!visibles.length && jourChoisi !== null) {
      const vide = document.createElement('p');
      vide.className = 'hint';
      vide.textContent = 'Rien de prévu ce jour-là.';
      joursView.appendChild(vide);
    }

    dicterBtn.hidden = !onListen;
    ask.hidden = !pending;
    addRow.hidden = Boolean(pending);
    joursView.hidden = Boolean(pending);
    semaineView.hidden = Boolean(pending);
  }

  // Choix de la nature avant d'écrire : c'est plus rapide que de deviner
  // depuis la phrase, et cela apprend à l'utilisateur ce qu'il peut demander.
  function renderTypes() {
    typesRow.innerHTML = '';
    Object.values(TYPES).forEach((type) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      if (typeChoisi === type.id) chip.classList.add('chip--on');
      chip.style.setProperty('--teinte', type.couleur);
      chip.appendChild(iconContent(`type:${type.id}`, type.icone));
      const mot = document.createElement('span');
      mot.textContent = ` ${type.label}`;
      chip.appendChild(mot);
      chip.addEventListener('click', () => {
        typeChoisi = type.id;
        // Un réveil se répète : on bascule sur « tous les jours » plutôt que de
        // laisser un choix qui n'aurait pas de sens.
        if (type.id === 'reveil' && repetChoisie === 'une') repetChoisie = 'jours';
        renderTypes();
        preparerFormulaire();
        if (type.id !== 'reveil') field.focus();
      });
      typesRow.appendChild(chip);
    });
  }

  const PLACEHOLDERS = {
    rdv: 'chez le dentiste',
    tache: 'arroser les plantes',
    reveil: ''
  };

  // Compte rendu de la dernière programmation, montré dans la liste.
  let dernierEtat = null;

  let repetChoisie = 'une';
  let joursChoisis = [];

  function renderRepetition() {
    // Un réveil se répète presque toujours : on lui propose « tous les jours »
    // d'emblée plutôt que « une fois », qui n'a guère de sens pour un réveil.
    const liste =
      typeChoisi === 'reveil' ? REPETITIONS.filter((r) => r.id !== 'une') : REPETITIONS;

    repetTitre.textContent = typeChoisi === 'reveil' ? 'Sonner…' : 'Répéter';

    repetRow.innerHTML = '';
    liste.forEach((rep) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      if (repetChoisie === rep.id) chip.classList.add('chip--on');
      chip.textContent = rep.label;
      chip.addEventListener('click', () => {
        repetChoisie = rep.id;
        renderRepetition();
      });
      repetRow.appendChild(chip);
    });

    // Les jours ne s'affichent que si on a choisi de les désigner soi-même.
    joursRow.hidden = repetChoisie !== 'choix';
    joursRow.innerHTML = '';
    if (repetChoisie === 'choix') {
      // Lundi en premier : c'est l'ordre d'une semaine en France, pas celui du
      // tableau des jours en JavaScript, qui commence au dimanche.
      [1, 2, 3, 4, 5, 6, 0].forEach((jour) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip chip--jour';
        if (joursChoisis.includes(jour)) chip.classList.add('chip--on');
        chip.textContent = JOURS_COURTS[jour];
        chip.addEventListener('click', () => {
          const at = joursChoisis.indexOf(jour);
          if (at >= 0) joursChoisis.splice(at, 1);
          else joursChoisis.push(jour);
          renderRepetition();
        });
        joursRow.appendChild(chip);
      });
    }
  }

  function recurrenceChoisie() {
    const rep = REPETITIONS.find((r) => r.id === repetChoisie);
    if (!rep || !rep.valeur) return null;
    if (rep.id === 'choix') {
      return joursChoisis.length ? { every: 'week', days: [...joursChoisis].sort() } : null;
    }
    return rep.valeur;
  }

  // Prépare le formulaire : jour du filtre en cours, ou aujourd'hui.
  function preparerFormulaire() {
    const jour = new Date(jourChoisi || Date.now());
    dateInput.value = [
      jour.getFullYear(),
      String(jour.getMonth() + 1).padStart(2, '0'),
      String(jour.getDate()).padStart(2, '0')
    ].join('-');
    if (!heureInput.value) heureInput.value = typeChoisi === 'reveil' ? '07:00' : '10:00';
    champSujet.hidden = typeChoisi === 'reveil';
    field.placeholder = PLACEHOLDERS[typeChoisi];
    renderRepetition();
  }

  /* --------------------------------------------- la question de prévenance */

  function startAsk(reminder, { spoken = true } = {}) {
    pending = reminder;

    // Un réveil sonne À L'HEURE. Lui poser la question de la prévenance était
    // une faute : choisir « une heure avant » faisait sonner le réveil de 7 h à
    // 6 h, et l'utilisateur n'avait aucune raison de s'en douter.
    if (reminder.type === 'reveil') {
      confirm(leadById('moment'));
      return;
    }
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

    const type = typeById(item.type);
    const quand = formatWhen(item.at);
    const rappel = formatWhen(triggerTime(item.at, lead));

    // La permission n'est demandée qu'ici : au moment où elle sert vraiment,
    // pas au premier lancement où personne ne comprend pourquoi.
    const ok = await notify.ensurePermission();
    const notifiee = ok ? await notify.schedule(item, getPet().name) : false;

    // Si la promenade sur l'écran est autorisée, elle s'ajoute à la
    // notification : deux façons d'être prévenu valent mieux qu'une.
    const promenade = getSpeciesFolder
      ? await overlay.schedule(item, getSpeciesFolder())
      : false;

    // On dit exactement ce qui a été mis en place.
    //
    // Un rappel qui ne sonne pas est le pire défaut possible : on ne s'en rend
    // compte qu'au moment où l'on comptait dessus. Annoncer « c'est noté » sans
    // vérifier que quelque chose a réellement été programmé revient à mentir.
    dernierEtat = { notifiee, promenade, type: item.type };

    render();
    const quoi = item.subject || type.label.toLowerCase();
    const phrase = notifiee
      ? `C’est noté : ${quoi} ${quand}. Je te préviens ${rappel}.`
      : `C’est noté : ${quoi} ${quand}. Mais je ne pourrai te prévenir que si l’application est ouverte.`;
    say(phrase);

    const manques = [];
    if (!notifiee) manques.push('les notifications ne sont pas autorisées');
    if (!promenade) manques.push('la promenade sur l’écran n’est pas autorisée');
    status.textContent = manques.length
      ? `${phrase} À corriger : ${manques.join(', ')} (Réglages).`
      : phrase;
  }

  // La parole reste la voie la plus rapide pour qui la maîtrise : une phrase
  // entière plutôt que quatre champs. Elle vient en complément du formulaire,
  // pas à sa place — au clavier, deviner la bonne formule ne valait rien.
  // Essai immédiat.
  //
  // Un réveil ne se vérifie pas autrement : attendre le lendemain matin pour
  // découvrir qu'il n'a pas sonné n'est pas une façon de mettre au point un
  // logiciel. Celui-ci part dans quinze secondes, avec toute la chaîne réelle —
  // notification système et promenade sur l'écran comprises.
  essaiBtn.addEventListener('click', async () => {
    essaiBtn.disabled = true;
    const quand = Date.now() + 15000;
    const item = addReminder(getActiveId(), {
      subject: 'essai du réveil',
      type: 'reveil',
      at: quand,
      lead: leadById('moment'),
      recurrence: null
    });

    const ok = await notify.ensurePermission();
    const notifiee = ok ? await notify.schedule(item, getPet().name) : false;
    const promenade = getSpeciesFolder ? await overlay.schedule(item, getSpeciesFolder()) : false;

    status.textContent =
      `Essai lancé pour dans 15 secondes. Notification : ${notifiee ? 'oui' : 'NON'}. ` +
      `Promenade sur l’écran : ${promenade ? 'oui' : 'NON'}. ` +
      (notifiee || promenade
        ? 'Ferme l’application pour vérifier.'
        : 'Aucune des deux n’est autorisée : va dans les Réglages.');

    render();
    setTimeout(() => {
      essaiBtn.disabled = false;
    }, 16000);
  });

  dicterBtn.addEventListener('click', () => {
    if (!onListen) return;
    voice.stop();
    status.textContent = 'Dis-moi tout : « rendez-vous chez le dentiste jeudi à 10 heures »…';
    onListen((entendu) => {
      if (!entendu) return;
      status.textContent = `J’ai entendu « ${entendu} ».`;
      soumettrePhrase(entendu);
    });
  });

  semaineAvant.addEventListener('click', () => deplacer(-7));
  semaineApres.addEventListener('click', () => deplacer(7));

  semaineAujourdhui.addEventListener('click', () => {
    debutFenetre = null;
    jourChoisi = null;
    render();
  });

  // Le sélecteur natif permet d'atteindre n'importe quelle date, y compris
  // dans plusieurs mois : c'est plus rapide que d'appuyer douze fois sur une
  // flèche, et l'interface est celle que la personne connaît déjà.
  semaineDate.addEventListener('change', () => {
    if (!semaineDate.value) return;
    const [an, mois, jour] = semaineDate.value.split('-').map(Number);
    debutFenetre = minuit(new Date(an, mois - 1, jour)).getTime();
    jourChoisi = debutFenetre;
    render();
  });

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
    if (!dateInput.value || !heureInput.value) {
      status.textContent = 'Choisis un jour et une heure.';
      return;
    }

    const [an, mois, jour] = dateInput.value.split('-').map(Number);
    const [h, m] = heureInput.value.split(':').map(Number);
    const quand = new Date(an, mois - 1, jour, h, m, 0, 0);

    const sujet = typeChoisi === 'reveil' ? '' : field.value.trim();
    if (typeChoisi !== 'reveil' && !sujet) {
      status.textContent = 'Dis-moi de quoi il s’agit.';
      field.focus();
      return;
    }

    field.value = '';
    status.textContent = '';
    startAsk(
      {
        subject: sujet,
        type: typeChoisi,
        at: quand.getTime(),
        recurrence: recurrenceChoisie(),
        vague: false,
        source: sujet
      },
      { spoken: false }
    );
  }

  // Ancienne voie, conservée pour la parole : « rendez-vous chez le médecin
  // mardi à 17 h » dit à la créature reste compris. C'est au clavier que la
  // saisie libre ne valait rien.
  function soumettrePhrase(text) {
    const reminder = parseReminder(text);
    if (reminder) {
      // La nature choisie au doigt l'emporte sur celle devinée dans la phrase :
      // l'utilisateur vient de la désigner, il sait mieux que l'analyse.
      reminder.type = typeChoisi;
      if (typeChoisi === 'reveil' && !reminder.recurrence) {
        reminder.recurrence = { every: 'day' };
      }
    }
    if (!reminder) {
      status.textContent = 'Je n’ai pas trouvé de date dans cette phrase.';
      return;
    }
    startAsk(reminder, { spoken: false });
  }

  sendBtn.addEventListener('click', submitText);
  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitText();
  });
  heureInput.addEventListener('keydown', (e) => {
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
    voice.explain(text, { rate: currentBand().rate });
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
    subject.textContent = reminder.subject || typeById(reminder.type).label;
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

    // Chaque nature a sa formule : « debout ! » pour un réveil, « tu voulais »
    // pour une tâche. Un réveil qui dit « n'oublie pas » sonne faux.
    const type = typeById(reminder.type);
    const phrase = `${type.phrase(reminder.subject || 'ton rendez-vous')}${
      type.id === 'reveil' ? '' : `, ${formatWhen(reminder.at)}.`
    }`;
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
