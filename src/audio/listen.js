import { understand, contextLexicon } from './hearing.js';

// Écoute au micro.
//
// Deux chemins, essayés dans cet ordre :
//
//   1. Le module natif Capacitor. C'est lui qui compte sur téléphone : la
//      reconnaissance vocale du navigateur n'est pas fiable dans une WebView
//      Android, alors que le moteur natif l'est.
//   2. L'API du navigateur, pour le développement dans un vrai Chrome.
//
// Ce module ne se contente pas de transmettre ce que le moteur renvoie. Trois
// traitements font la différence sur la compréhension réelle :
//
//   • **Découpage sur le silence.** Le moteur coupe dès la première pause. Une
//     personne âgée qui cherche son mot, un enfant qui hésite, et la phrase
//     part en morceaux. On accumule donc les fragments et on ne conclut qu'après
//     un vrai silence, dont la durée dépend du profil.
//   • **Plusieurs hypothèses.** On en demande cinq et on choisit avec le
//     vocabulaire du moment, pas seulement avec le score acoustique.
//   • **Un filtre de confiance.** Un raclement de gorge ne doit pas devenir une
//     réponse : en dessous du seuil, on fait répéter.

let nativePlugin = null;
let nativeChecked = false;

// ⚠️ Un module Capacitor ne doit JAMAIS être renvoyé par une fonction `async`.
//
// Ce qu'il renvoie est un proxy : toute propriété qu'on lui demande devient un
// appel natif. Or JavaScript, en résolvant une fonction asynchrone, interroge
// `.then` sur la valeur produite pour savoir si c'est une promesse. Le proxy
// répond donc « la méthode then n'existe pas », et le rejet part sans que
// personne l'attende.
//
// On garde donc le module dans une variable et l'on ne renvoie rien.
// Raison précise pour laquelle le moteur natif n'est pas retenu. Sans elle,
// « aucun moteur disponible » ne dit pas s'il manque le module, le service
// Android, ou l'autorisation.
let raisonNatif = null;

async function chargerNatif() {
  if (nativeChecked) return;
  nativeChecked = true;

  let module = null;
  try {
    module = await import('@capacitor-community/speech-recognition');
  } catch (error) {
    raisonNatif = `module introuvable (${error && error.message ? error.message : error})`;
    nativePlugin = null;
    return;
  }

  const candidat = module.SpeechRecognition;
  if (!candidat) {
    raisonNatif = 'module chargé mais vide';
    nativePlugin = null;
    return;
  }

  // On NE disqualifie PAS le moteur sur la foi de `available()`.
  //
  // Cette fonction interroge le service de reconnaissance d'Android, qui
  // répond « non » dans plusieurs cas où la reconnaissance marche tout de
  // même : autorisation micro pas encore accordée, service non listé faute de
  // déclaration de visibilité, version du système qui répond mal. Refuser le
  // moteur sur cette seule réponse revenait à s'interdire de tenter.
  //
  // On garde donc le module et l'on note ce qu'elle a répondu. Si le démarrage
  // échoue vraiment, il le dira lui-même, avec un message exploitable.
  nativePlugin = candidat;
  try {
    const status = await candidat.available();
    const ok = typeof status === 'boolean' ? status : status && status.available;
    if (!ok) raisonNatif = 'le système annonce la reconnaissance indisponible — on tente quand même';
  } catch (error) {
    raisonNatif = `available() a échoué (${error && error.message ? error.message : error}) — on tente quand même`;
  }
}

function browserEngine() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

// Durée de silence avant de conclure. Une personne âgée ou un jeune enfant
// prend le temps de formuler : couper au bout d'une seconde leur volerait la
// fin de leur phrase.
export const SILENCE_MS = {
  fast: 1100,
  normal: 1700,
  slow: 2600
};

// Délai avant le PREMIER mot. Il n'a rien à voir avec le silence qui clôt une
// phrase : entre le moment où l'on appuie sur le micro et celui où l'on
// commence à parler, il se passe facilement trois à cinq secondes — on réfléchit,
// on cherche ses mots, on approche le téléphone.
//
// C'est le défaut qui rendait le micro inutilisable : le compte à rebours de
// silence était armé dès le démarrage, et la session se terminait sur « je n'ai
// rien entendu » avant même qu'on ait ouvert la bouche.
const PREMIER_MOT_MS = 10000;

export function createListener({ onPartial, onFinal, onState, onError, getContext }) {
  let listening = false;
  let browser = null;
  let mode = null;
  // Segments déjà terminés, et transcription en cours. Bien plus lisible que
  // l'ancien tableau indexé à la main, où l'on écrasait des cases au jugé.
  let segments = [];
  let courant = '';
  let entendu = false; // a-t-on capté au moins un mot ?
  let alternatives = [];
  let moteur = 'aucun';
  let dernierEchec = null; // dernière erreur du moteur, telle qu'il l'a dite
  let silenceTimer = null;
  let hardTimer = null;
  let expected = null;
  let pace = 'normal';

  function setState(value) {
    listening = value;
    if (onState) onState(value);
  }

  function clearTimers() {
    clearTimeout(silenceTimer);
    clearTimeout(hardTimer);
    silenceTimer = null;
    hardTimer = null;
  }

  // Repart le compte à rebours à chaque fragment entendu. Tant que rien n'a
  // été capté, c'est le délai long qui s'applique.
  function bumpSilence() {
    clearTimeout(silenceTimer);
    const delai = entendu ? SILENCE_MS[pace] || SILENCE_MS.normal : PREMIER_MOT_MS;
    silenceTimer = setTimeout(() => finish(), delai);
  }

  // Enregistre un fragment. `definitif` clôt le segment en cours.
  function capter(texte, definitif = false) {
    const propre = String(texte || '').trim();
    if (!propre) return;
    entendu = true;
    if (definitif) {
      segments.push(propre);
      courant = '';
    } else {
      courant = propre;
    }
    if (onPartial) onPartial([...segments, courant].filter(Boolean).join(' '));
    bumpSilence();
  }

  function finish() {
    clearTimers();
    const assembled = [...segments, courant]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const list = alternatives.length
      ? alternatives
      : assembled
        ? [{ text: assembled, confidence: 0.6 }]
        : [];

    // Les fragments accumulés forment une hypothèse à part entière, en général
    // meilleure que chacune prise isolément.
    if (assembled && !list.some((a) => a.text === assembled)) {
      list.unshift({ text: assembled, confidence: 0.75 });
    }

    stop();

    const context = (getContext && getContext()) || {};
    const lexicon = context.lexicon || contextLexicon({});
    const result = understand(list, lexicon, { numbers: Boolean(context.numbers) });

    segments = [];
    courant = '';
    entendu = false;
    alternatives = [];

    if (!result.confident) {
      if (onError) onError(result.reason === 'silence' ? "Je n'ai rien entendu." : "Je n'ai pas bien compris.", { soft: true });
      return;
    }
    onFinal(result.text, { raw: result.raw, expected });
  }

  /* ------------------------------------------------------------- natif */

  async function startNative(plugin) {
    let permission = null;
    try {
      permission = await plugin.requestPermissions();
    } catch (error) {
      dernierEchec = `autorisation : ${error && error.message ? error.message : error}`;
      onError('Impossible de demander l’accès au micro.');
      return;
    }

    const granted =
      !permission ||
      permission.speechRecognition === 'granted' ||
      permission.speechRecognition === undefined;
    if (!granted) {
      dernierEchec = `autorisation refusée (${permission.speechRecognition})`;
      onError('Accès au micro refusé. Autorise-le dans les réglages du téléphone.');
      return;
    }

    await plugin.removeAllListeners().catch(() => {});
    await plugin.addListener('partialResults', (data) => {
      const matches = (data && data.matches) || [];
      if (!matches[0]) return;
      // Le natif renvoie la phrase complète en cours, pas un ajout : on
      // remplace la transcription courante plutôt que d'empiler des répétitions.
      alternatives = matches.map((m, i) => ({ text: m, confidence: 1 - i * 0.12 }));
      capter(matches[0], false);
    });
    await plugin.addListener('listeningState', (data) => {
      if (data && data.status === 'stopped' && listening) {
        // Le moteur s'est arrêté de lui-même sur une pause : on relance pour
        // laisser la personne finir sa phrase.
        relaunchNative(plugin);
      }
    });

    setState(true);
    bumpSilence();
    // Garde-fou : au-delà d'une minute, on conclut quoi qu'il arrive.
    hardTimer = setTimeout(() => finish(), 60000);
    launchNative(plugin);
  }

  function launchNative(plugin) {
    plugin
      .start({ language: 'fr-FR', maxResults: 5, partialResults: true, popup: false })
      .then((result) => {
        const matches = (result && result.matches) || [];
        if (matches.length) {
          alternatives = matches.map((m, i) => ({ text: m, confidence: 1 - i * 0.12 }));
          capter(matches[0], true);
        }
      })
      .catch((error) => {
        // L'erreur était avalée : « ça ne marche pas » sans la moindre piste.
        // Le moteur natif dit pourtant des choses utiles — service absent,
        // reconnaissance déjà en cours, langue non installée.
        dernierEchec = String((error && (error.message || error.errorMessage)) || error);
        if (!entendu && listening) {
          onError(`Le micro n’a pas démarré : ${dernierEchec}`, { soft: true });
        }
      });
  }

  function relaunchNative(plugin) {
    if (!listening) return;
    setTimeout(() => {
      if (listening) launchNative(plugin);
    }, 120);
  }

  /* --------------------------------------------------------- navigateur */

  function startBrowser(Ctor) {
    browser = new Ctor();
    browser.lang = 'fr-FR';
    browser.interimResults = true;
    browser.maxAlternatives = 5;
    browser.continuous = true;

    browser.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0].transcript.trim();
        if (!text) continue;
        if (result.isFinal) {
          alternatives = Array.from(result)
            .map((alt, rank) => ({
              text: alt.transcript.trim(),
              confidence: alt.confidence || 1 - rank * 0.12
            }))
            .filter((a) => a.text);
        }
        capter(text, result.isFinal);
      }
    };
    browser.onerror = (event) => {
      dernierEchec = String(event.error);
      if (event.error === 'no-speech') return; // le silence s'en chargera
      clearTimers();
      setState(false);
      onError(event.error === 'not-allowed' ? 'Accès au micro refusé.' : String(event.error));
    };
    browser.onend = () => {
      // En mode continu, certains navigateurs coupent quand même : on relance
      // tant que l'écoute est censée durer.
      if (listening) {
        try {
          browser.start();
        } catch {
          /* déjà relancé */
        }
      }
    };

    setState(true);
    bumpSilence();
    hardTimer = setTimeout(() => finish(), 60000);
    browser.start();
  }

  /* ------------------------------------------------------------ public */

  async function supported() {
    await chargerNatif();
    if (nativePlugin) return 'native';
    if (browserEngine()) return 'browser';
    return null;
  }

  // `options.pace` règle la patience, `options.expected` sert au contexte.
  async function start(options = {}) {
    if (listening) return;
    segments = [];
    courant = '';
    entendu = false;
    alternatives = [];
    pace = options.pace || 'normal';
    expected = options.expected || null;

    const kind = await supported();
    mode = kind;
    moteur = kind || 'aucun';
    if (kind === 'native') await startNative(nativePlugin);
    else if (kind === 'browser') startBrowser(browserEngine());
    else {
      dernierEchec = 'aucun moteur détecté';
      onError("Ce téléphone n'a pas de reconnaissance vocale disponible.");
    }
  }

  function stop() {
    clearTimers();
    if (!listening) return;
    setState(false);
    if (mode === 'native' && nativePlugin) {
      nativePlugin.stop().catch(() => {});
      nativePlugin.removeAllListeners().catch(() => {});
    }
    if (mode === 'browser' && browser) {
      try {
        browser.stop();
      } catch {
        /* déjà arrêté */
      }
    }
  }

  // Conclure tout de suite, sans attendre le silence : c'est le bouton
  // « J'ai fini », utile quand on sait qu'on a terminé de parler.
  function submit() {
    if (listening) finish();
  }

  function toggle(options) {
    return listening ? submit() : start(options);
  }

  return {
    start,
    stop,
    submit,
    toggle,
    supported,
    // Consultable depuis les réglages : savoir quel moteur répond évite de
    // chercher un défaut de compréhension là où il n'y a pas de micro du tout.
    get etat() {
      return {
        moteur,
        ecoute: listening,
        entendu,
        echec: dernierEchec,
        raison: raisonNatif
      };
    },

    // Essai complet, déclenché depuis les réglages : charge le module, demande
    // l'autorisation, et rapporte précisément où ça bloque.
    async diagnostiquer() {
      await chargerNatif();
      if (!nativePlugin) {
        return { moteur: browserEngine() ? 'browser' : 'aucun', detail: raisonNatif };
      }
      try {
        const permission = await nativePlugin.requestPermissions();
        const accorde =
          !permission ||
          permission.speechRecognition === 'granted' ||
          permission.speechRecognition === undefined;
        return {
          moteur: 'native',
          detail: accorde
            ? raisonNatif || 'prêt'
            : `autorisation micro : ${permission.speechRecognition}`
        };
      } catch (error) {
        return { moteur: 'native', detail: `autorisation refusée (${error && error.message})` };
      }
    },
    get listening() {
      return listening;
    }
  };
}
