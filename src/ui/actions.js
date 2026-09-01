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
    label: 'Jouer',
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
    id: 'talk',
    icon: '💬',
    label: 'Parler',
    cooldown: 0,
    effects: {},
    reaction: null,
    drift: {},
    line: null
  }
];

export function createActionBar(onCare) {
  const root = document.getElementById('actionbar');
  const buttons = {};
  const ready = {};

  CARES.forEach((care) => {
    const button = document.createElement('button');
    button.className = 'pebble';
    button.type = 'button';
    button.innerHTML = `<span class="pebble__icon">${care.icon}</span><span class="pebble__label">${care.label}</span>`;
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

  function setSleepLabel(asleep) {
    const button = buttons.sleep;
    button.querySelector('.pebble__label').textContent = asleep ? 'Réveiller' : 'Dormir';
    button.querySelector('.pebble__icon').textContent = asleep ? '☀️' : '🌙';
  }

  return { update, setSleepLabel, buttons };
}
