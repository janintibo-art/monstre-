// La voix des creatures. Deux modes, aucun fichier audio, aucune dependance.
//
//   'tts'   — synthese vocale du systeme (Web Speech API). Elle prononce
//             reellement les mots, avec une hauteur et un debit propres a la
//             creature. Demande un moteur vocal installe sur l'appareil.
//   'babil' — suite de bips generes a la volee (Web Audio), a la maniere des
//             jeux ou les personnages "parlent" sans langage. Fonctionne
//             partout, y compris sans moteur vocal, et convient mieux a un
//             monstre qu'une voix humaine.
//
// Les deux exposent un niveau sonore approximatif : c'est lui qui fait bouger
// la tete de la creature pendant qu'elle parle.

const MODE_KEY = 'monstre.voix';

export const VOICE_MODES = {
  babil: 'Babil (recommandé)',
  tts: 'Synthèse vocale',
  off: 'Muet'
};

export function loadVoiceMode() {
  try {
    return localStorage.getItem(MODE_KEY) || 'babil';
  } catch {
    return 'babil';
  }
}

export function saveVoiceMode(mode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* stockage indisponible */
  }
}

// Decoupe grossiere en syllabes : chaque groupe de voyelles en amorce une.
// Inutile d'etre linguistiquement exact, il s'agit de rythmer des bips.
function syllables(text) {
  const groups = String(text)
    .toLowerCase()
    .replace(/[^a-zàâäéèêëïîôöùûüçœ' ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word) => word.match(/[aàâäeéèêëiïîoôöuùûüyœ]+/g) || ['a']);
  return Math.max(1, Math.min(22, groups.length));
}

export function createVoice() {
  let mode = loadVoiceMode();
  let ctx = null;
  let master = null;
  let schedule = []; // fenetres {start, end, gain} en millisecondes
  let speakingUntil = 0;
  let ttsActive = false;

  function audio() {
    if (ctx) return ctx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
    return ctx;
  }

  // Sur mobile, le son reste bloque tant que l'utilisateur n'a pas touche
  // l'ecran. A appeler depuis le premier evenement de pointeur.
  function unlock() {
    const c = audio();
    if (c && c.state === 'suspended') c.resume();
  }

  function stop() {
    schedule = [];
    speakingUntil = 0;
    ttsActive = false;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  /* ------------------------------------------------------------- le babil */

  function babble(text, profile) {
    const c = audio();
    if (!c) return;
    if (c.state === 'suspended') c.resume();

    const count = syllables(text);
    const question = /[?？]\s*$/.test(text);
    const step = 0.085 + (1 - profile.rate) * 0.05;
    const base = 210 * profile.pitch;
    const now = c.currentTime;
    const startedAt = performance.now();
    schedule = [];

    for (let i = 0; i < count; i += 1) {
      const at = now + i * step;
      const progress = count > 1 ? i / (count - 1) : 0;

      // Intonation : descend en fin de phrase, monte pour une question.
      const contour = question ? 1 + progress * 0.45 : 1 - progress * 0.22;
      const jitter = 0.92 + Math.random() * 0.16;
      const freq = base * contour * jitter;
      const length = step * (0.55 + Math.random() * 0.25);

      const osc = c.createOscillator();
      osc.type = profile.timbre || 'triangle';
      osc.frequency.setValueAtTime(freq, at);
      osc.frequency.linearRampToValueAtTime(freq * 1.06, at + length);

      // Un peu de corps : une deuxieme voix a l'octave inferieure.
      const sub = c.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(freq * 0.5, at);

      const gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.55, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + length);

      const subGain = c.createGain();
      subGain.gain.value = 0.25;

      osc.connect(gain);
      sub.connect(subGain);
      subGain.connect(gain);
      gain.connect(master);

      osc.start(at);
      osc.stop(at + length + 0.02);
      sub.start(at);
      sub.stop(at + length + 0.02);

      schedule.push({
        start: startedAt + i * step * 1000,
        end: startedAt + (i * step + length) * 1000
      });
    }

    speakingUntil = startedAt + count * step * 1000 + 120;
  }

  /* ------------------------------------------------- la synthese vocale */

  function pickVoice() {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    return (
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('fr')) || voices[0]
    );
  }

  function tts(text, profile, onDone) {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      babble(text, profile); // pas de moteur vocal : on retombe sur le babil
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = (voice && voice.lang) || 'fr-FR';
    // Les bornes de l'API : hauteur 0 a 2, debit 0,1 a 10.
    utterance.pitch = Math.min(2, Math.max(0.1, profile.pitch));
    utterance.rate = Math.min(2, Math.max(0.5, profile.rate));
    utterance.volume = 0.9;

    utterance.onstart = () => {
      ttsActive = true;
    };
    utterance.onend = () => {
      ttsActive = false;
      if (onDone) onDone();
    };
    utterance.onerror = () => {
      ttsActive = false;
      if (onDone) onDone();
    };

    window.speechSynthesis.speak(utterance);
  }

  /* ------------------------------------------------------------- public */

  function speak(text, profile = { pitch: 1.4, rate: 1, timbre: 'triangle' }) {
    if (!text || mode === 'off') return;
    stop();
    if (mode === 'tts') tts(text, profile);
    else babble(text, profile);
  }

  // Lecture d'une consigne de jeu.
  //
  // Le babil ne peut pas dire « combien font trois plus quatre » : il ne
  // prononce rien, il rythme. Pour les jeux educatifs, on force donc la
  // synthese vocale meme si la creature parle en babil le reste du temps —
  // c'est le seul moyen qu'un enfant qui ne lit pas encore puisse jouer. Le
  // babil accompagne quand aucun moteur vocal n'est disponible, et l'interface
  // affiche alors la consigne en grand.
  // Hauteur maximale d'une voix qui doit rester comprise.
  //
  // Le profil de la creature monte jusqu'a 1,85 pour un nouveau-ne : charmant
  // pour deux mots de dialogue, inintelligible pour une consigne de dix. On
  // borne donc la hauteur ici, quel que soit le profil recu.
  const HAUTEUR_MAX = 1.12;

  // `onDone` permet d'enchaîner : dire la consigne, PUIS écouter. Sans ce
  // signal, le micro s'ouvrirait pendant que la créature parle et n'entendrait
  // qu'elle-même.
  function narrate(text, profile = { pitch: 1.05, rate: 0.95, timbre: 'triangle' }, onDone) {
    if (!text) {
      if (onDone) onDone();
      return { spoken: false };
    }
    stop();
    if (mode === 'off') return { spoken: false };

    if (!hasSpeech()) {
      // Surtout PAS de babil ici. Le babil ne prononce rien : il rythme. Sur
      // une consigne, il ne transmet aucune information et couvre le texte
      // affiche a l'ecran, qui lui est lisible. Mieux vaut le silence.
      //
      // On previent quand meme l'appelant : sans moteur vocal, l'enchainement
      // vocal doit se faire tout de suite au lieu d'attendre une fin qui ne
      // viendra jamais.
      if (onDone) setTimeout(onDone, 200);
      return { spoken: false, raison: 'aucune synthèse vocale' };
    }

    tts(
      text,
      {
        ...profile,
        pitch: Math.min(profile.pitch || 1, HAUTEUR_MAX),
        // Un peu plus lent que la parole ordinaire : une consigne doit etre
        // comprise du premier coup, pas seulement entendue.
        rate: Math.max(0.6, (profile.rate || 1) * 0.9)
      },
      onDone
    );
    return { spoken: true };
  }

  // Voix des explications.
  //
  // Ce n'est pas la creature qui parle : c'est l'application. Hauteur neutre,
  // debit pose, aucun timbre de personnage. Un mode d'emploi lu par une voix de
  // dessin anime ne s'ecoute pas jusqu'au bout.
  function explain(text, { rate = 1 } = {}) {
    if (!text || mode === 'off') return { spoken: false };
    stop();
    if (!hasSpeech()) return { spoken: false, raison: 'aucune synthèse vocale' };
    tts(text, { pitch: 1, rate: Math.max(0.7, rate * 0.94), timbre: 'triangle' });
    return { spoken: true };
  }

  function hasSpeech() {
    return Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
  }

  // Niveau approximatif entre 0 et 1, pour animer la tete.
  function level() {
    const now = performance.now();
    if (ttsActive) {
      // Pas d'analyse du flux de la synthese : une enveloppe plausible suffit.
      return 0.45 + Math.sin(now * 0.022) * 0.3 + Math.sin(now * 0.051) * 0.2;
    }
    if (now > speakingUntil || !schedule.length) return 0;
    for (let i = 0; i < schedule.length; i += 1) {
      const slot = schedule[i];
      if (now >= slot.start && now <= slot.end) {
        const span = Math.max(1, slot.end - slot.start);
        const t = (now - slot.start) / span;
        return Math.sin(t * Math.PI); // attaque puis extinction
      }
    }
    return 0;
  }

  return {
    speak,
    narrate,
    explain,
    hasSpeech,
    stop,
    unlock,
    level,
    get mode() {
      return mode;
    },
    setMode(next) {
      mode = next;
      saveVoiceMode(next);
      if (next === 'off') stop();
    },
    get speaking() {
      return ttsActive || performance.now() < speakingUntil;
    }
  };
}

// La voix decoule de la creature : un nouveau-ne parle haut et vite, un adulte
// plus bas et plus lentement. Le timbre vient du genome, comme la couleur.
export function voiceProfile(pet, band = null) {
  const stagePitch = { baby: 1.85, child: 1.55, teen: 1.25, adult: 1.02 };
  const stageRate = { baby: 1.3, child: 1.2, teen: 1.05, adult: 0.95 };
  const hue = (pet.genome && pet.genome.hue) || 0.5;
  const shy = (pet.personality && pet.personality.shyness) || 0.5;
  // Le debit suit l'age de l'enfant : a quatre ans, on a besoin qu'on parle
  // nettement plus lentement qu'a dix.
  const childRate = band && band.rate ? band.rate : 1;
  return {
    pitch: (stagePitch[pet.stage] || 1.4) * (0.92 + hue * 0.16),
    rate: (stageRate[pet.stage] || 1.1) * (1.08 - shy * 0.16) * childRate,
    timbre: hue > 0.5 ? 'triangle' : 'square'
  };
}
