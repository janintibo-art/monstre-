// Panneau de conversation. Il ne connait rien de l'IA : il envoie le texte
// et affiche ce qu'on lui rend.

export function createChat(onSend) {
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

  async function submit() {
    const text = field.value.trim();
    if (!text) return;
    field.value = '';
    append(text, 'you');
    sendBtn.disabled = true;
    try {
      const reply = await onSend(text);
      append(reply, 'pet');
    } finally {
      sendBtn.disabled = false;
    }
  }

  sendBtn.addEventListener('click', submit);
  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
  closeBtn.addEventListener('click', () => {
    panel.hidden = true;
  });

  return {
    open() {
      panel.hidden = false;
      field.focus();
    },
    close() {
      panel.hidden = true;
    },
    append,
    get isOpen() {
      return !panel.hidden;
    }
  };
}
