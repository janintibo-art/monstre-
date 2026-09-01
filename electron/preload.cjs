const { contextBridge } = require('electron');

// Pont minimal. Le jeu n'a besoin de rien du systeme pour l'instant :
// on expose seulement la plateforme, utile pour adapter l'interface.
contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  version: process.versions.electron
});
