// Panneau de conversation. Il ne connait rien de l'IA : il envoie le texte
// et affiche ce qu'on lui rend.

export function createChat(onSend, onToggle) {
  const panel = document.getElementById('chat');
  const log = document.getElementById('chat-log');
  const field = document.getElementById('chat-field');
  const sendBtn = document.getElementById('chat-send');
  const closeBtn = document.getElementById('chat-close');

  function append(text, who) {
    const line = document.createElement('div');
    line.className = `line line--${who}`;
    line.textContent = text;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  // Indicateur « il reflechit » : sans lui, une reponse distante de trois
  // secondes ressemble a un bouton qui n'a pas marche.
  function thinking(on) {
    let el = log.querySelector('.line--thinking');
    if (on && !el) {
      el = document.createElement('div');
      el.className = 'line line--pet line--thinking';
      el.textContent = '…';
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
    } else if (!on && el) {
      el.remove();
    }
  }

  function notice(text) {
    const line = document.createElement('div');
    line.className = 'line line--notice';
    line.textContent = text;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  let busy = false;
  async function submit() {
    const text = field.value.trim();
    if (!text || busy) return;
    busy = true;
    field.value = '';
    append(text, 'you');
    sendBtn.disabled = true;
    thinking(true);
    try {
      const reply = await onSend(text);
      thinking(false);
      if (reply) append(reply, 'pet');
    } catch (error) {
      thinking(false);
      notice(`Je n'ai pas pu répondre : ${String((error && error.message) || error).slice(0, 120)}`);
    } finally {
      sendBtn.disabled = false;
      busy = false;
    }
  }

  sendBtn.addEventListener('click', submit);
  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
  closeBtn.addEventListener('click', () => {
    panel.hidden = true;
    if (onToggle) onToggle(false);
  });

  return {
    open() {
      panel.hidden = false;
      field.focus();
      if (onToggle) onToggle(true);
    },
    close() {
      panel.hidden = true;
      if (onToggle) onToggle(false);
    },
    append,
    notice,
    get isOpen() {
      return !panel.hidden;
    }
  };
}
