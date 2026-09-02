// Barre d'actions. Chaque soin decrit son effet sur les besoins, la reaction
// physique du monstre, et la derive de caractere qu'il provoque a long terme.

export const CARES = [
  {
    id: 'feed',
    icon: '🍖',
    label: 'Nourrir',
    cooldown: 25,
    effects: { hunger: 30, fun: 3 },
    reaction: 'eat',
    drift: { greed: 0.012 },
    line: 'Miam.'
  },
  {
    id: 'play',
    icon: '🎾',
    label: 'Balle',
    cooldown: 12,
    effects: { fun: 28, affection: 8, energy: -9 },
    reaction: 'play',
    drift: { energy: 0.012, shyness: -0.008 },
    line: 'Encore une fois !'
  },
  {
    id: 'wash',
    icon: '🫧',
    label: 'Laver',
    cooldown: 40,
    effects: { hygiene: 45, fun: -4 },
    reaction: 'wash',
    drift: { shyness: 0.004 },
    line: 'Pas l’eau. Bon, d’accord.'
  },
  {
    id: 'pet',
    icon: '✋',
    label: 'Câliner',
    cooldown: 8,
    effects: { affection: 20, fun: 4 },
    reaction: 'pet',
    drift: { sociability: 0.012, shyness: -0.01 },
    line: 'Mmh.'
  },
  {
    id: 'sleep',
    icon: '🌙',
    label: 'Dormir',
    cooldown: 4,
    effects: {},
    reaction: null,
    drift: {},
    line: 'Bonne nuit…'
  },
  {
    id: 'games',
    icon: '🎓',
    label: 'Jeux',
    cooldown: 0,
    effects: {},
    reaction: null,
    drift: {},
    line: null
  },
  {
    id: 'listen',
    icon: '🎤',
    label: 'Parler',
    cooldown: 0,
    effects: {},
    reaction: null,
    drift: {},
    line: null
  },
  {
    id: 'talk',
    icon: '💬',
    label: 'Écrire',
    cooldown: 0,
    effects: {},
    reaction: null,
    drift: {},
    line: null
  }
];

import { iconContent, applyIcon } from './icons.js';

export function createActionBar(onCare) {
  const root = document.getElementById('actionbar');
  const buttons = {};
  const ready = {};

  CARES.forEach((care) => {
    const button = document.createElement('button');
    button.className = 'pebble';
    button.type = 'button';
    // L'icône maison si elle existe, l'emoji sinon. On ne construit pas de
    // HTML : le libellé vient du catalogue, mais un jour il viendra peut-être
    // d'ailleurs, et une injection dans un bouton n'a rien d'anodin.
    const icone = document.createElement('span');
    icone.className = 'pebble__icon';
    icone.appendChild(iconContent(care.id, care.icon));

    const libelle = document.createElement('span');
    libelle.className = 'pebble__label';
    libelle.textContent = care.label;

    button.append(icone, libelle);
    button.addEventListener('click', () => {
      if (button.disabled) return;
      onCare(care);
      if (care.cooldown > 0) startCooldown(care);
    });
    root.appendChild(button);
    buttons[care.id] = button;
    ready[care.id] = 0;
  });

  function startCooldown(care) {
    ready[care.id] = care.cooldown;
    buttons[care.id].disabled = true;
  }

  function update(dt, { hatched }) {
    CARES.forEach((care) => {
      const button = buttons[care.id];
      if (!hatched) {
        button.disabled = true;
        return;
      }
      if (ready[care.id] > 0) {
        ready[care.id] -= dt;
        if (ready[care.id] <= 0) button.disabled = false;
      } else {
        button.disabled = false;
      }
    });
  }

  // Le bouton du micro change d'etat pendant l'ecoute : sans retour visible,
  // on ne sait pas si l'application entend quelque chose.
  function setListening(active) {
    const button = buttons.listen;
    if (!button) return;
    button.classList.toggle('pebble--live', active);
    button.querySelector('.pebble__label').textContent = active ? "J'écoute" : 'Parler';
    applyIcon(button.querySelector('.pebble__icon'), active ? 'microActif' : 'listen', active ? '🔴' : '🎤');
  }

  function setSleepLabel(asleep) {
    const button = buttons.sleep;
    button.querySelector('.pebble__label').textContent = asleep ? 'Réveiller' : 'Dormir';
    applyIcon(button.querySelector('.pebble__icon'), asleep ? 'soleil' : 'sleep', asleep ? '☀️' : '🌙');
  }

  return { update, setSleepLabel, setListening, buttons };
}
