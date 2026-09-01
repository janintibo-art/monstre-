// Boucle de rendu. Le delta est borne pour eviter qu'un onglet en arriere-plan
// ne provoque un saut de simulation de plusieurs secondes d'un coup.

export function createLoop(update) {
  let last = performance.now();
  let running = false;
  let frame = 0;
  let elapsed = 0;

  function tick(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    elapsed += dt;
    update(dt, elapsed);
    frame = requestAnimationFrame(tick);
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
    },
    get elapsed() {
      return elapsed;
    }
  };
}
