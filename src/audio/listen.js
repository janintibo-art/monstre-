// Ecoute au micro.
//
// Deux chemins, essayes dans cet ordre :
//
//   1. Le module natif Capacitor. C'est lui qui compte sur telephone : la
//      reconnaissance vocale du navigateur n'est pas fiable dans une WebView
//      Android, alors que le moteur natif l'est.
//   2. L'API du navigateur (SpeechRecognition), pour le mode developpement dans
//      un vrai Chrome.
//
// Si aucun des deux n'est disponible — c'est le cas sur la version Windows,
// Electron n'embarquant pas de moteur de reconnaissance — on le dit clairement
// et on renvoie l'utilisateur vers la saisie au clavier.

let nativePlugin = null;
let nativeChecked = false;

async function getNative() {
  if (nativeChecked) return nativePlugin;
  nativeChecked = true;
  try {
    const module = await import('@capacitor-community/speech-recognition');
    const plugin = module.SpeechRecognition;
    const status = await plugin.available();
    // Selon les versions, `available()` renvoie un booleen ou { available }.
    const ok = typeof status === 'boolean' ? status : status && status.available;
    nativePlugin = ok ? plugin : null;
  } catch {
    nativePlugin = null;
  }
  return nativePlugin;
}

function browserEngine() {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  return Ctor || null;
}

export function createListener({ onPartial, onFinal, onState, onError }) {
  let listening = false;
  let browser = null;
  let mode = null; // 'native' | 'browser'

  function setState(value) {
    listening = value;
    if (onState) onState(value);
  }

  async function supported() {
    if (await getNative()) return 'native';
    if (browserEngine()) return 'browser';
    return null;
  }

  async function startNative(plugin) {
    const permission = await plugin.requestPermissions().catch(() => null);
    const granted =
      !permission ||
      permission.speechRecognition === 'granted' ||
      permission.speechRecognition === undefined;
    if (!granted) {
      onError('Accès au micro refusé.');
      return;
    }

    await plugin.removeAllListeners().catch(() => {});
    await plugin.addListener('partialResults', (data) => {
      const text = data && data.matches && data.matches[0];
      if (text && onPartial) onPartial(text);
    });
    await plugin.addListener('listeningState', (data) => {
      if (data && data.status === 'stopped') setState(false);
    });

    setState(true);
    // `popup: false` garde l'ecoute dans le jeu au lieu d'ouvrir la fenetre
    // systeme de Google, qui masquerait la creature.
    const result = await plugin
      .start({ language: 'fr-FR', maxResults: 1, partialResults: true, popup: false })
      .catch((error) => {
        onError(String((error && error.message) || error));
        return null;
      });

    setState(false);
    const text = result && result.matches && result.matches[0];
    if (text) onFinal(text);
  }

  function startBrowser(Ctor) {
    browser = new Ctor();
    browser.lang = 'fr-FR';
    browser.interimResults = true;
    browser.maxAlternatives = 1;
    browser.continuous = false;

    browser.onresult = (event) => {
      let text = '';
      let done = false;
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        text += event.results[i][0].transcript;
        if (event.results[i].isFinal) done = true;
      }
      if (done) onFinal(text.trim());
      else if (onPartial) onPartial(text.trim());
    };
    browser.onerror = (event) => {
      setState(false);
      onError(event.error === 'not-allowed' ? 'Accès au micro refusé.' : String(event.error));
    };
    browser.onend = () => setState(false);

    setState(true);
    browser.start();
  }

  async function start() {
    if (listening) return;
    const kind = await supported();
    mode = kind;
    if (kind === 'native') await startNative(nativePlugin);
    else if (kind === 'browser') startBrowser(browserEngine());
    else onError("Ce téléphone n'a pas de reconnaissance vocale disponible.");
  }

  async function stop() {
    if (!listening) return;
    if (mode === 'native' && nativePlugin) await nativePlugin.stop().catch(() => {});
    if (mode === 'browser' && browser) browser.stop();
    setState(false);
  }

  function toggle() {
    return listening ? stop() : start();
  }

  return {
    start,
    stop,
    toggle,
    supported,
    get listening() {
      return listening;
    }
  };
}
