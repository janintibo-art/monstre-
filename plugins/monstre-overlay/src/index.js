import { registerPlugin } from '@capacitor/core';

// Pont vers le module natif. Sur navigateur et sous Windows, l'implémentation
// de repli répond simplement « non disponible » : l'application continue de
// fonctionner, seule la promenade sur l'écran manque.
export const MonstreOverlay = registerPlugin('MonstreOverlay', {
  web: () => ({
    isSupported: async () => ({ supported: false }),
    hasPermission: async () => ({ granted: false }),
    requestPermission: async () => ({ granted: false }),
    schedule: async () => ({ scheduled: false }),
    cancel: async () => ({}),
    cancelAll: async () => ({}),
    show: async () => ({ shown: false }),
    hide: async () => ({})
  })
});

export default MonstreOverlay;
