import { PROVIDERS, loadConfig, saveConfig, testConnection, listModels } from '../ai/dialogue/index.js';
import { VOICE_MODES, voiceProfile } from '../audio/voice.js';
import { BIOMES, biomeById, loadBiomePreference, saveBiomePreference, pickBiome } from '../game/biomes.js';
import { CYCLE_MODES } from '../game/daylight.js';
import { knownFacts, forget, daysTogether, playerName } from '../ai/memory.js';
import { exportSave, parseImport } from '../state/save.js';
import { bandById, comfortEnabled, applyComfortClass } from '../state/profile.js';
import { currentBand, getActiveProfile, updateProfile } from '../state/profiles.js';

// Reglages et bapteme. Regle de base : un seul panneau ouvert a la fois,
// et tout panneau doit pouvoir se fermer. Un ecran bloque est un bug.

export function createPanels({
  onRename,
  onReset,
  onNamed,
  onBiome,
  onMemoryChange,
  onPanelToggle,
  onImport,
  onGuide,
  onProfiles,
  onAgeChange,
  getPet,
  voice,
  daylight
}) {
  const menu = document.getElementById('menu');
  const menuBtn = document.getElementById('btn-menu');
  const menuClose = document.getElementById('menu-close');
  const nameField = document.getElementById('field-name');
  const resetBtn = document.getElementById('btn-reset');

  const guideBtn = document.getElementById('btn-guide');
  const profilesBtn = document.getElementById('btn-profiles');
  const comfortToggle = document.getElementById('field-comfort');
  const comfortHelp = document.getElementById('comfort-help');
  const cycleSelect = document.getElementById('field-cycle');
  const biomeSelect = document.getElementById('field-biome');
  const voiceSelect = document.getElementById('field-voice');
  const voiceTest = document.getElementById('btn-voice-test');
  const providerSelect = document.getElementById('field-provider');
  const providerHelp = document.getElementById('provider-help');
  const keyRow = document.getElementById('row-key');
  const keyField = document.getElementById('field-key');
  const keyLink = document.getElementById('key-link');
  const modelRow = document.getElementById('row-model');
  const modelField = document.getElementById('field-model');
  const modelListRow = document.getElementById('row-model-list');
  const modelListSelect = document.getElementById('field-model-list');
  const modelsBtn = document.getElementById('btn-models');
  const modelsStatus = document.getElementById('models-status');
  const endpointRow = document.getElementById('row-endpoint');
  const endpointField = document.getElementById('field-endpoint');
  const testBtn = document.getElementById('btn-test');
  const testStatus = document.getElementById('test-status');

  const memories = document.getElementById('memories');
  const memoriesBtn = document.getElementById('btn-memories');
  const memoriesClose = document.getElementById('memories-close');
  const memoriesList = document.getElementById('memories-list');
  const memoriesIntro = document.getElementById('memories-intro');
  const forgetAllBtn = document.getElementById('btn-forget-all');

  const exportBtn = document.getElementById('btn-export');
  const importBtn = document.getElementById('btn-import');
  const importFile = document.getElementById('file-import');
  const saveStatus = document.getElementById('save-status');

  const naming = document.getElementById('naming');
  const namingField = document.getElementById('naming-field');
  const namingConfirm = document.getElementById('naming-confirm');
  const namingLater = document.getElementById('naming-later');

  // ----------------------------------------------------------------- profil
  // L'age et les gouts se reglent dans la fiche du profil, pas ici : ce sont
  // des informations sur la personne, elles suivent le profil et non l'appareil.
  function refreshProfile() {
    const profile = getActiveProfile();
    const band = currentBand();
    profilesBtn.textContent = profile
      ? `👤 ${profile.avatar} ${profile.name} — changer de profil`
      : '👤 Choisir un profil';
    comfortToggle.checked = comfortEnabled(band, profile ? profile.comfort : null);
    comfortHelp.textContent =
      profile && profile.comfort !== null
        ? 'Réglage manuel : il ne suivra plus l’âge du profil.'
        : `Réglé automatiquement d’après le profil (${band.label}).`;
  }

  profilesBtn.addEventListener('click', () => {
    closeAll();
    if (onProfiles) onProfiles();
  });

  comfortToggle.addEventListener('change', () => {
    const profile = getActiveProfile();
    if (profile) updateProfile(profile.id, { comfort: comfortToggle.checked });
    applyComfortClass(comfortToggle.checked);
    refreshProfile();
    if (onAgeChange) onAgeChange(currentBand());
  });

  refreshProfile();

  // ------------------------------------------------------------------- cycle
  Object.keys(CYCLE_MODES).forEach((id) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = CYCLE_MODES[id];
    cycleSelect.appendChild(option);
  });
  cycleSelect.value = daylight.mode;
  cycleSelect.addEventListener('change', () => daylight.setMode(cycleSelect.value));

  // ------------------------------------------------------------------- decor
  // « Automatique » laisse le paysage decouler de la graine de l'oeuf : chaque
  // creature garde ainsi son propre pays.
  const biomeOptions = [{ id: 'auto', name: 'Automatique' }, ...BIOMES];
  biomeOptions.forEach((b) => {
    const option = document.createElement('option');
    option.value = b.id;
    option.textContent = b.name;
    biomeSelect.appendChild(option);
  });
  biomeSelect.value = loadBiomePreference();

  biomeSelect.addEventListener('change', () => {
    const value = biomeSelect.value;
    saveBiomePreference(value);
    const pet = getPet();
    onBiome(value === 'auto' ? pickBiome(pet.seed) : biomeById(value));
  });

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
    modelListRow.hidden = !info.needsKey;
    modelListSelect.hidden = true;
    modelsStatus.textContent = '';
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

  // Le catalogue de chaque fournisseur bouge : on va chercher la vraie liste
  // plutot que de proposer un nom code en dur qui finira par disparaitre.
  modelsBtn.addEventListener('click', async () => {
    persist();
    modelsBtn.disabled = true;
    modelsStatus.textContent = 'Chargement…';
    try {
      const models = await listModels(loadConfig());
      modelListSelect.innerHTML = '';
      models.forEach((id) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = id;
        modelListSelect.appendChild(option);
      });
      if (models.includes(modelField.value)) modelListSelect.value = modelField.value;
      modelListSelect.hidden = false;
      modelsStatus.textContent = `${models.length} modèles disponibles. Choisis-en un.`;
    } catch (error) {
      modelsStatus.textContent = `Impossible de charger la liste : ${error.message}`;
    } finally {
      modelsBtn.disabled = false;
    }
  });

  modelListSelect.addEventListener('change', () => {
    modelField.value = modelListSelect.value;
    persist();
    testStatus.textContent = '';
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
  // Un panneau ouvert libere l'orientation : ces ecrans sont des listes et des
  // formulaires, ils se lisent mieux a la verticale.
  // Les jeux et le guide vivent hors de ce module mais partagent le meme verrou
  // d'orientation : on leur laisse signaler leur etat.
  let externalOpen = false;

  function notify() {
    if (onPanelToggle) {
      onPanelToggle(!menu.hidden || !naming.hidden || !memories.hidden || externalOpen);
    }
  }

  function setExternalOpen(open) {
    externalOpen = open;
    notify();
  }

  function closeAll() {
    menu.hidden = true;
    naming.hidden = true;
    memories.hidden = true;
    notify();
  }

  // -------------------------------------------------------------- sauvegarde
  // Un fichier que le joueur garde chez lui : la seule vraie assurance contre
  // un telephone perdu ou une mise a jour qui tourne mal.
  exportBtn.addEventListener('click', () => {
    const pet = getPet();
    const blob = new Blob([exportSave(pet)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${pet.name || 'monstre'}-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    saveStatus.textContent = 'Sauvegarde exportée.';
  });

  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async () => {
    const file = importFile.files && importFile.files[0];
    importFile.value = '';
    if (!file) return;
    const text = await file.text();
    const result = parseImport(text);
    if (result.error) {
      saveStatus.textContent = result.error;
      return;
    }
    // On montre le nom AVANT de remplacer : personne ne doit ecraser son
    // monstre par accident avec un vieux fichier.
    const ok = window.confirm(
      `Remplacer ${getPet().name} par ${result.pet.name} (importé) ? L'actuel sera gardé en copie de secours.`
    );
    if (!ok) return;
    onImport(result.pet);
    saveStatus.textContent = `${result.pet.name} est de retour.`;
  });

  // --------------------------------------------------------------- souvenirs
  function renderMemories() {
    const pet = getPet();
    const facts = knownFacts(pet.memory);
    const moments = [...(pet.memory.moments || [])].reverse().slice(0, 6);
    const days = daysTogether(pet.memory);
    const who = playerName(pet.memory);

    const parts = [];
    if (who) parts.push(`Elle sait que tu t'appelles ${who}.`);
    parts.push(days >= 1 ? `Vous vous connaissez depuis ${days} jour(s).` : 'Vous venez de vous rencontrer.');
    if (!facts.length) parts.push("Elle ne retient encore rien : parle-lui de toi, elle enregistrera.");
    memoriesIntro.textContent = parts.join(' ');

    memoriesList.innerHTML = '';

    facts.forEach((fact) => {
      const row = document.createElement('div');
      row.className = 'memory';
      const bar = document.createElement('div');
      bar.className = 'memory__strength';
      // La force se lit a l'opacite : un souvenir qui pâlit est en train de
      // s'effacer, et il suffit d'en reparler pour le raviver.
      bar.style.opacity = String(Math.min(1, 0.25 + fact.current / 3));
      const text = document.createElement('div');
      text.className = 'memory__text';
      text.textContent = fact.text;
      const remove = document.createElement('button');
      remove.className = 'memory__forget';
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', 'Lui faire oublier');
      remove.addEventListener('click', () => {
        forget(getPet().memory, fact.key);
        if (onMemoryChange) onMemoryChange();
        renderMemories();
      });
      row.append(bar, text, remove);
      memoriesList.appendChild(row);
    });

    moments.forEach((moment) => {
      const row = document.createElement('div');
      row.className = 'memory memory--moment';
      const text = document.createElement('div');
      text.className = 'memory__text';
      text.textContent = moment.text;
      row.appendChild(text);
      memoriesList.appendChild(row);
    });
  }

  memoriesBtn.addEventListener('click', () => {
    closeAll();
    renderMemories();
    memories.hidden = false;
    notify();
  });
  memoriesClose.addEventListener('click', closeAll);

  forgetAllBtn.addEventListener('click', () => {
    if (!window.confirm('Elle oubliera tout ce que tu lui as raconté. Continuer ?')) return;
    const pet = getPet();
    pet.memory.facts = [];
    pet.memory.dialogue = [];
    if (onMemoryChange) onMemoryChange();
    renderMemories();
  });

  menuBtn.addEventListener('click', () => {
    const wasOpen = !menu.hidden;
    closeAll();
    if (!wasOpen) {
      config = loadConfig();
      refreshProviderUI();
      refreshProfile();
      menu.hidden = false;
    }
    notify();
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
    notify();
    onNamed(value);
  }

  namingConfirm.addEventListener('click', confirmName);
  namingLater.addEventListener('click', () => {
    naming.hidden = true;
    notify();
  });
  namingField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmName();
  });

  return {
    setExternalOpen,
    refreshProfile,
    askName(currentName) {
      // Le bapteme ne doit jamais s'empiler sur un autre panneau.
      menu.hidden = true;
      namingField.value = currentName && currentName !== 'Œuf' ? currentName : '';
      naming.hidden = false;
      namingField.focus();
      notify();
    },
    closeAll,
    syncName(name) {
      nameField.value = name;
    }
  };
}
