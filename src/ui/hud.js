import { NEEDS, NEED_LABELS } from '../ai/needs.js';
import { STAGE_LABELS } from '../state/pet.js';
import { describe } from '../ai/personality.js';

// Le HUD. Element signature : les besoins sont des fioles de seve qui se
// vident, pas des barres de progression horizontales.

const THOUGHTS = {
  sleep: 'Il s’assoupit.',
  beg: 'Il tourne autour de toi en regardant tes mains.',
  seekAttention: 'Il cherche ton regard.',
  play: 'Il gigote, prêt à bondir.',
  sulk: 'Il te tourne le dos.',
  explore: 'Il inspecte un recoin.',
  follow: 'Il te suit.',
  dance: 'Il danse. Sans raison.',
  idle: 'Il ne fait rien de particulier.'
};

export function createHud() {
  const vialsRoot = document.getElementById('vials');
  const nameEl = document.getElementById('pet-name');
  const stageEl = document.getElementById('pet-stage');
  const thoughtEl = document.getElementById('thought');
  const bubbleEl = document.getElementById('bubble');

  const fills = {};

  NEEDS.forEach((key) => {
    const vial = document.createElement('div');
    vial.className = 'vial';
    vial.dataset.need = key;
    vial.innerHTML = `
      <div class="vial__tube"><div class="vial__fill"></div></div>
      <div class="vial__label">${NEED_LABELS[key]}</div>
    `;
    vialsRoot.appendChild(vial);
    fills[key] = { vial, fill: vial.querySelector('.vial__fill') };
  });

  let bubbleTimer = null;

  function update(pet, decision) {
    NEEDS.forEach((key) => {
      const value = Math.max(0, Math.min(100, pet.needs[key]));
      const node = fills[key];
      node.fill.style.height = `${value}%`;
      node.vial.classList.toggle('vial--low', value < 40);
      node.vial.classList.toggle('vial--critical', value < 18);
    });

    nameEl.textContent = pet.name;
    stageEl.textContent = pet.hatched
      ? `${STAGE_LABELS[pet.stage]} · ${describe(pet.personality)}`
      : STAGE_LABELS.egg;

    thoughtEl.textContent = pet.hatched
      ? THOUGHTS[decision.action] || ''
      : 'Quelque chose bouge à l’intérieur.';
  }

  function showVials(visible) {
    vialsRoot.style.opacity = visible ? '1' : '0';
  }

  // La bulle est un element DOM positionne par projection de la tete 3D.
  function showBubble(text, duration = 4200) {
    bubbleEl.textContent = text;
    bubbleEl.hidden = false;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => {
      bubbleEl.hidden = true;
    }, duration);
  }

  function placeBubble(screen) {
    if (bubbleEl.hidden) return;
    if (!screen.visible) {
      bubbleEl.style.opacity = '0';
      return;
    }
    bubbleEl.style.opacity = '1';
    bubbleEl.style.left = `${screen.x}px`;
    bubbleEl.style.top = `${screen.y - 12}px`;
  }

  return { update, showBubble, placeBubble, showVials };
}
