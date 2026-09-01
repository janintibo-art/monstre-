// Environnement minimal pour tester la logique pure hors navigateur.
// Rien ici ne simule le rendu : les modules testes n'en ont pas besoin,
// et c'est precisement ce qu'on veut verifier.
export function installEnv() {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
    clear: () => Object.keys(store).forEach((k) => delete store[k])
  };
  globalThis.document = { addEventListener() {}, removeEventListener() {} };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  globalThis.performance = { now: () => Date.now() };
  return store;
}
