import { getEndpoint, setEndpoint } from '../ai/dialogue/index.js';

// Reglages et bapteme. Deux petits panneaux, aucune logique de jeu ici.

export function createPanels({ onRename, onReset, onNamed }) {
  const menu = document.getElementById('menu');
  const menuBtn = document.getElementById('btn-menu');
  const menuClose = document.getElementById('menu-close');
  const nameField = document.getElementById('field-name');
  const endpointField = document.getElementById('field-endpoint');
  const resetBtn = document.getElementById('btn-reset');

  const naming = document.getElementById('naming');
  const namingField = document.getElementById('naming-field');
  const namingConfirm = document.getElementById('naming-confirm');

  endpointField.value = getEndpoint();

  menuBtn.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
  });
  menuClose.addEventListener('click', () => {
    menu.hidden = true;
  });

  nameField.addEventListener('change', () => {
    const value = nameField.value.trim();
    if (value) onRename(value);
  });

  endpointField.addEventListener('change', () => {
    setEndpoint(endpointField.value.trim());
  });

  resetBtn.addEventListener('click', () => {
    // Action destructrice : on demande confirmation explicite.
    if (window.confirm('Ton monstre actuel sera perdu. Recommencer ?')) onReset();
  });

  function confirmName() {
    const value = namingField.value.trim() || 'Nyx';
    naming.hidden = true;
    onNamed(value);
  }

  namingConfirm.addEventListener('click', confirmName);
  namingField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmName();
  });

  return {
    askName() {
      naming.hidden = false;
      namingField.focus();
    },
    syncName(name) {
      nameField.value = name;
    }
  };
}
