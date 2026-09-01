import { defineConfig } from 'vite';

// base: './' est indispensable : Electron charge les fichiers en file://
// et Capacitor les sert depuis un dossier local. Un chemin absolu casserait les deux.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Three.js dans son propre fichier : il ne change qu'a la mise a jour
        // de la dependance, alors que le code du jeu change a chaque version.
        // Le navigateur garde ainsi le gros morceau en cache.
        manualChunks: {
          three: ['three'],
          'three-addons': [
            'three/examples/jsm/loaders/GLTFLoader.js',
            'three/examples/jsm/utils/SkeletonUtils.js'
          ]
        }
      }
    }
  },
  server: {
    host: true,
    port: 5173
  }
});
