import {
  listProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  setActiveId,
  getActiveId,
  sanitizeProfileName,
  AVATARS,
  INTERESTS
} from '../state/profiles.js';
import { AGE_BANDS, bandById } from '../state/profile.js';
import { applyIcon } from './icons.js';

// Choix et creation de profil.
//
// C'est le premier ecran que voit une personne qui installe l'application, et
// le seul endroit ou on lui demande quelque chose sur elle. Trois principes :
//
//   1. **Le minimum.** Un prenom, une tranche d'age, des gouts a cocher. Jamais
//      de nom de famille, jamais de date de naissance exacte, jamais d'adresse.
//      Ce qui est demande sert directement au jeu, et rien d'autre.
//   2. **Rien n'est obligatoire** sauf le prenom, et encore : on peut mettre ce
//      qu'on veut. Un enfant peut s'appeler « Dino » ici.
//   3. **Tout reste sur l'appareil.** C'est ecrit sur l'ecran, pas cache dans
//      une politique de confidentialite.

export function createProfilePicker({ onChoose, onToggle }) {
  const panel = document.getElementById('profiles');
  const listView = document.getElementById('profiles-list');
  const formView = document.getElementById('profiles-form');
  const title = document.getElementById('profiles-title');
  const closeBtn = document.getElementById('profiles-close');

  const nameField = document.getElementById('profile-name');
  const avatarRow = document.getElementById('profile-avatars');
  const bandSelect = document.getElementById('profile-band');
  const bandHelp = document.getElementById('profile-band-help');
  const interestsRow = document.getElementById('profile-interests');
  const noteField = document.getElementById('profile-note');
  const saveBtn = document.getElementById('profile-save');
  const cancelBtn = document.getElementById('profile-cancel');

  let draft = null;
  let editing = null;
  let canClose = false;

  /* ------------------------------------------------------------ la liste */

  function renderList() {
    const profiles = listProfiles();
    title.textContent = profiles.length ? 'Qui joue ?' : 'Bienvenue';
    listView.innerHTML = '';
    listView.hidden = false;
    formView.hidden = true;
    closeBtn.hidden = !canClose;

    if (!profiles.length) {
      const hello = document.createElement('p');
      hello.className = 'hint';
      hello.textContent =
        'Chaque personne a son propre monstre, qui se souvient d’elle et d’elle seule. Commence par te présenter.';
      listView.appendChild(hello);
    }

    profiles.forEach((profile) => {
      const row = document.createElement('div');
      row.className = 'profile-row';

      const actif = profile.id === getActiveId();
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'profile-card';
      if (actif) card.classList.add('profile-card--active');

      const avatar = document.createElement('span');
      avatar.className = 'profile-card__avatar';
      avatar.textContent = profile.avatar;

      const body = document.createElement('span');
      body.className = 'profile-card__body';
      const name = document.createElement('strong');
      name.textContent = profile.name;
      const detail = document.createElement('span');
      detail.className = 'profile-card__detail';
      const band = bandById(profile.band);
      const likes = profile.interests
        .map((id) => (INTERESTS.find((i) => i.id === id) || {}).label)
        .filter(Boolean);
      detail.textContent = likes.length
        ? `${band.label} · aime ${likes.slice(0, 2).join(', ')}`
        : band.label;
      body.append(name, detail);

      // Le dernier profil utilisé est signalé : sur un appareil partagé, c'est
      // l'information qu'on cherche en premier.
      if (actif) {
        const marque = document.createElement('span');
        marque.className = 'profile-card__last';
        marque.textContent = 'dernier';
        card.appendChild(marque);
      }

      card.append(avatar, body);
      card.addEventListener('click', () => {
        setActiveId(profile.id);
        onChoose(profile, { isNew: false });
      });

      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'profile-edit';
      applyIcon(edit, 'modifier', '✎');
      edit.setAttribute('aria-label', `Modifier ${profile.name}`);
      edit.addEventListener('click', () => openForm(profile));

      row.append(card, edit);
      listView.appendChild(row);
    });

    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'profile-add';
    add.textContent = profiles.length ? '+ Nouveau profil' : '+ Me présenter';
    add.addEventListener('click', () => openForm(null));
    listView.appendChild(add);

    const privacy = document.createElement('p');
    privacy.className = 'hint';
    privacy.textContent =
      'Tout ce que tu écris ici reste sur cet appareil. Aucun compte, aucun envoi.';
    listView.appendChild(privacy);
  }

  /* ----------------------------------------------------------- le formulaire */

  function openForm(profile) {
    editing = profile;
    draft = profile
      ? { ...profile, interests: [...profile.interests] }
      : { name: '', avatar: AVATARS[0], band: 'none', interests: [], note: '' };

    title.textContent = profile ? `Modifier ${profile.name}` : 'Se présenter';
    listView.hidden = true;
    formView.hidden = false;
    closeBtn.hidden = !canClose;

    nameField.value = draft.name;
    noteField.value = draft.note || '';
    renderAvatars();
    renderBands();
    renderInterests();
    updateSave();

    // Supprimer n'apparait qu'en modification, et jamais pour le dernier profil.
    let remove = document.getElementById('profile-delete');
    if (remove) remove.remove();
    if (profile && listProfiles().length > 1) {
      remove = document.createElement('button');
      remove.id = 'profile-delete';
      remove.type = 'button';
      remove.className = 'danger';
      remove.textContent = `Supprimer ${profile.name}`;
      remove.addEventListener('click', () => {
        const ok = window.confirm(
          `Supprimer ${profile.name} et son monstre ? Une copie de secours est conservée.`
        );
        if (!ok) return;
        deleteProfile(profile.id);
        renderList();
      });
      formView.appendChild(remove);
    }
  }

  function renderAvatars() {
    avatarRow.innerHTML = '';
    AVATARS.forEach((emoji) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'avatar-choice';
      button.textContent = emoji;
      button.setAttribute('aria-label', `Choisir ${emoji}`);
      if (draft.avatar === emoji) button.classList.add('avatar-choice--on');
      button.addEventListener('click', () => {
        draft.avatar = emoji;
        renderAvatars();
      });
      avatarRow.appendChild(button);
    });
  }

  function renderBands() {
    bandSelect.innerHTML = '';
    AGE_BANDS.forEach((band) => {
      const option = document.createElement('option');
      option.value = band.id;
      option.textContent = band.label;
      bandSelect.appendChild(option);
    });
    bandSelect.value = draft.band;
    bandHelp.textContent = bandById(draft.band).description;
  }

  bandSelect.addEventListener('change', () => {
    draft.band = bandSelect.value;
    bandHelp.textContent = bandById(draft.band).description;
  });

  function renderInterests() {
    interestsRow.innerHTML = '';
    INTERESTS.forEach((item) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = `${item.emoji} ${item.label}`;
      chip.setAttribute('aria-pressed', String(draft.interests.includes(item.id)));
      if (draft.interests.includes(item.id)) chip.classList.add('chip--on');
      chip.addEventListener('click', () => {
        const at = draft.interests.indexOf(item.id);
        if (at >= 0) draft.interests.splice(at, 1);
        else draft.interests.push(item.id);
        renderInterests();
      });
      interestsRow.appendChild(chip);
    });
  }

  function updateSave() {
    saveBtn.disabled = !sanitizeProfileName(nameField.value);
  }

  nameField.addEventListener('input', updateSave);

  saveBtn.addEventListener('click', () => {
    draft.name = sanitizeProfileName(nameField.value);
    draft.note = noteField.value.slice(0, 120);
    if (!draft.name) return;

    if (editing) {
      const updated = updateProfile(editing.id, draft);
      setActiveId(updated.id);
      onChoose(updated, { isNew: false, edited: true });
    } else {
      const created = createProfile(draft);
      setActiveId(created.id);
      // `isNew` dit au jeu de semer les gouts declares dans la memoire de la
      // creature : elle connait deja un peu la personne des la premiere minute.
      onChoose(created, { isNew: true });
    }
  });

  cancelBtn.addEventListener('click', () => {
    if (listProfiles().length) renderList();
    else openForm(null); // pas de profil : on ne peut pas annuler dans le vide
  });

  closeBtn.addEventListener('click', () => close());

  function open({ closable = true } = {}) {
    canClose = closable && listProfiles().length > 0;
    renderList();
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
    get isOpen() {
      return !panel.hidden;
    }
  };
}
