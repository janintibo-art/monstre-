const { app, BrowserWindow, shell, session } = require('electron');
const path = require('node:path');

// Processus principal Electron. Il ne fait qu'ouvrir une fenetre sur le
// build Vite : toute la logique du jeu vit dans dist/.

const isDev = !app.isPackaged && process.env.VITE_DEV_SERVER_URL;

// Seuls ces hotes sont joignables depuis la page : les trois fournisseurs
// d'IA integres, plus le proxy que le joueur renseigne (https uniquement).
const ALLOWED_CONNECT = [
  'https://generativelanguage.googleapis.com',
  'https://api.groq.com',
  'https://openrouter.ai'
];

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 640,
    minWidth: 480,
    minHeight: 420,
    backgroundColor: '#0B0F1E',
    autoHideMenuBar: true,
    title: 'Monstre de Compagnie',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // La page ne navigue jamais ailleurs que vers elle-meme.
  win.webContents.on('will-navigate', (event, url) => {
    const own = isDev ? process.env.VITE_DEV_SERVER_URL : 'file://';
    if (!url.startsWith(own)) event.preventDefault();
  });

  // Les liens externes s'ouvrent dans le navigateur, et seulement en https.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  // Permissions : micro autorise (parole), tout le reste refuse par defaut.
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === 'media');
  });

  // Politique de securite de contenu. Le jeu est entierement local : seuls les
  // appels aux fournisseurs d'IA et a un proxy https sont autorises en reseau.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const connect = ["'self'", ...ALLOWED_CONNECT, 'https:'].join(' ');
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self'; ` +
            `script-src 'self'; ` +
            `style-src 'self' 'unsafe-inline'; ` +
            `img-src 'self' data: blob:; ` +
            `media-src 'self' blob:; ` +
            `connect-src ${connect}; ` +
            `worker-src 'self' blob:; ` +
            `object-src 'none'; base-uri 'self'; frame-ancestors 'none'`
        ]
      }
    });
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
