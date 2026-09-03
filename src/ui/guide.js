import { GUIDE } from '../content/guide.js';
import { applyIcon } from './icons.js';
import { currentBand } from '../state/profiles.js';

// Le guide. Un accordeon : une section ouverte a la fois, pour ne pas noyer.
//
// Chaque section peut etre lue a voix haute. Ce n'est pas un gadget : le guide
// s'adresse autant a un grand-oncle qui installe l'application qu'a un enfant
// qui ne lit pas encore couramment.

// Le gras est ecrit en **etoiles** dans le contenu et converti ici en noeuds
// DOM. On n'utilise jamais innerHTML : le texte doit rester du texte.
function renderRich(text, target) {
  text.split(/(\*\*[^*]+\*\*)/).forEach((part) => {
    if (!part) return;
    if (part.startsWith('**') && part.endsWith('**')) {
      const strong = document.createElement('strong');
      strong.textContent = part.slice(2, -2);
      target.appendChild(strong);
    } else {
      // Le code entre accents graves se distingue aussi, sans HTML.
      part.split(/(`[^`]+`)/).forEach((chunk) => {
        if (!chunk) return;
        if (chunk.startsWith('`') && chunk.endsWith('`')) {
          const code = document.createElement('code');
          code.textContent = chunk.slice(1, -1);
          target.appendChild(code);
        } else {
          target.appendChild(document.createTextNode(chunk));
        }
      });
    }
  });
}

// Version lisible a voix haute : on retire les marques de mise en forme.
function plain(text) {
  return text.replace(/\*\*/g, '').replace(/`/g, '');
}

export function createGuide({ voice, voiceProfile, getPet }) {
  const panel = document.getElementById('guide');
  const closeBtn = document.getElementById('guide-close');
  const list = document.getElementById('guide-list');
  let onToggle = null;
  let openId = null;

  function render() {
    list.innerHTML = '';

    GUIDE.forEach((section) => {
      const item = document.createElement('div');
      item.className = 'guide-item';

      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'guide-head';
      head.setAttribute('aria-expanded', String(openId === section.id));

      const icon = document.createElement('span');
      icon.className = 'guide-head__icon';
      icon.textContent = section.icon;
      const title = document.createElement('span');
      title.className = 'guide-head__title';
      title.textContent = section.title;
      const chevron = document.createElement('span');
      chevron.className = 'guide-head__chevron';
      chevron.textContent = openId === section.id ? '−' : '+';
      head.append(icon, title, chevron);

      head.addEventListener('click', () => {
        openId = openId === section.id ? null : section.id;
        voice.stop();
        render();
      });

      item.appendChild(head);

      if (openId === section.id) {
        const body = document.createElement('div');
        body.className = 'guide-body';

        if (section.intro) {
          const intro = document.createElement('p');
          intro.className = 'guide-intro';
          intro.textContent = section.intro;
          body.appendChild(intro);
        }

        section.body.forEach((paragraph) => {
          const p = document.createElement('p');
          renderRich(paragraph, p);
          body.appendChild(p);
        });

        const read = document.createElement('button');
        read.type = 'button';
        read.className = 'guide-read';
        read.textContent = '';
        const hp = document.createElement('span');
        hp.className = 'bouton__icone';
        applyIcon(hp, 'hautParleur', '🔊');
        const dire = document.createElement('span');
        dire.textContent = 'Me le lire';
        read.append(hp, dire);
        read.addEventListener('click', () => {
          voice.unlock();
          const text = [section.title, section.intro || '', ...section.body]
            .filter(Boolean)
            .map(plain)
            .join(' ');
          // Le guide est un mode d'emploi : voix neutre, débit posé.
          voice.explain(text, { rate: currentBand().rate });
        });
        body.appendChild(read);

        item.appendChild(body);
      }

      list.appendChild(item);
    });
  }

  closeBtn.addEventListener('click', () => close());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) close();
  });

  function open() {
    openId = null;
    render();
    panel.hidden = false;
    if (onToggle) onToggle(true);
  }

  function close() {
    voice.stop();
    panel.hidden = true;
    if (onToggle) onToggle(false);
  }

  return {
    open,
    close,
    setToggleHandler(fn) {
      onToggle = fn;
    },
    get isOpen() {
      return !panel.hidden;
    }
  };
}
