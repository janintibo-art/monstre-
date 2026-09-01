import { PROVIDERS, loadConfig, saveConfig, testConnection } from '../ai/dialogue/index.js';
import { VOICE_MODES, voiceProfile } from '../audio/voice.js';

// Reglages et bapteme. Regle de base : un seul panneau ouvert a la fois,
// et tout panneau doit pouvoir se fermer. Un ecran bloque est un bug.

export function createPanels({ onRename, onReset, onNamed, getPet, voice }) {
  const menu = document.getElementById('menu');
  const menuBtn = document.getElementById('btn-menu');
  const menuClose = document.getElementById('menu-close');
  const nameField = document.getElementById('field-name');
  const resetBtn = document.getElementById('btn-reset');

  const voiceSelect = document.getElementById('field-voice');
  const voiceTest = document.getElementById('btn-voice-test');
  const providerSelect = document.getElementById('field-provider');
  const providerHelp = document.getElementById('provider-help');
  const keyRow = document.getElementById('row-key');
  const keyField = document.getElementById('field-key');
  const keyLink = document.getElementById('key-link');
  const modelRow = document.getElementById('row-model');
  const modelField = document.getElementById('field-model');
  const endpointRow = document.getElementById('row-endpoint');
  const endpointField = document.getElementById('field-endpoint');
  const testBtn = document.getElementById('btn-test');
  const testStatus = document.getElementById('test-status');

  const naming = document.getElementById('naming');
  const namingField = document.getElementById('naming-field');
  const namingConfirm = document.getElementById('naming-confirm');
  const namingLater = document.getElementById('naming-later');

  // -------------------------------------------------------------------- voix
  Object.keys(VOICE_MODES).forEach((id) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = VOICE_MODES[id];
    voiceSelect.appendChild(option);
  });
  voiceSelect.value = voice.mode;

  voiceSelect.addEventListener('change', () => {
    voice.setMode(voiceSelect.value);
    voice.unlock();
  });

  voiceTest.addEventListener('click', () => {
    voice.unlock();
    const pet = getPet();
    voice.speak(`Bonjour, je suis ${pet.name}.`, voiceProfile(pet));
  });

  // ------------------------------------------------------------ fournisseurs
  Object.keys(PROVIDERS).forEach((id) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = PROVIDERS[id].label;
    providerSelect.appendChild(option);
  });

  let config = loadConfig();

  function refreshProviderUI() {
    const info = PROVIDERS[config.provider] || PROVIDERS.local;
    providerSelect.value = config.provider;
    providerHelp.textContent = info.help || '';

    keyRow.hidden = !info.needsKey;
    modelRow.hidden = !info.needsKey;
    endpointRow.hidden = !info.needsEndpoint;
    keyLink.hidden = !info.keyUrl;
    testBtn.hidden = config.provider === 'local';

    if (info.keyUrl) keyLink.href = info.keyUrl;
    keyField.value = config.apiKey || '';
    modelField.value = config.model || info.defaultModel || '';
    modelField.placeholder = info.defaultModel || '';
    endpointField.value = config.endpoint || '';
    testStatus.textContent = '';
  }

  function persist() {
    config.apiKey = keyField.value.trim();
    config.model = modelField.value.trim();
    config.endpoint = endpointField.value.trim();
    saveConfig(config);
  }

  providerSelect.addEventListener('change', () => {
    config.provider = providerSelect.value;
    const info = PROVIDERS[config.provider];
    if (info.defaultModel && !config.model) config.model = info.defaultModel;
    saveConfig(config);
    refreshProviderUI();
  });

  [keyField, modelField, endpointField].forEach((field) => {
    field.addEventListener('change', persist);
    field.addEventListener('blur', persist);
  });

  testBtn.addEventListener('click', async () => {
    persist();
    testBtn.disabled = true;
    testStatus.textContent = 'Test en cours…';
    const result = await testConnection(getPet());
    testStatus.textContent = result.ok ? `Ça marche : « ${result.message} »` : `Échec : ${result.message}`;
    testBtn.disabled = false;
  });

  refreshProviderUI();

  // ----------------------------------------------------------------- panneaux
  function closeAll() {
    menu.hidden = true;
    naming.hidden = true;
  }

  menuBtn.addEventListener('click', () => {
    const wasOpen = !menu.hidden;
    closeAll();
    if (!wasOpen) {
      config = loadConfig();
      refreshProviderUI();
      menu.hidden = false;
    }
  });
  menuClose.addEventListener('click', closeAll);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });

  nameField.addEventListener('change', () => {
    const value = nameField.value.trim();
    if (value) onRename(value);
  });

  resetBtn.addEventListener('click', () => {
    if (window.confirm('Ton monstre actuel sera perdu. Recommencer ?')) {
      closeAll();
      onReset();
    }
  });

  function confirmName() {
    const value = namingField.value.trim() || 'Nyx';
    naming.hidden = true;
    onNamed(value);
  }

  namingConfirm.addEventListener('click', confirmName);
  namingLater.addEventListener('click', () => {
    naming.hidden = true;
  });
  namingField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmName();
  });

  return {
    askName(currentName) {
      // Le bapteme ne doit jamais s'empiler sur un autre panneau.
      menu.hidden = true;
      namingField.value = currentName && currentName !== 'Œuf' ? currentName : '';
      naming.hidden = false;
      namingField.focus();
    },
    closeAll,
    syncName(name) {
      nameField.value = name;
    }
  };
}
