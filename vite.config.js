import { defineConfig } from 'vite';

// base: './' est indispensable : Electron charge les fichiers en file://
// et Capacitor les sert depuis un dossier local. Un chemin absolu casserait les deux.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false
  },
  server: {
    host: true,
    port: 5173
  }
});
