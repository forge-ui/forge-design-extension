(() => {
  window.startThinkingOrb = function startThinkingOrb(canvas, size = 22, state = 'composing') {
    const presetSize = 64;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(presetSize * dpr);
    canvas.height = Math.round(presetSize * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx || typeof ThinkingOrbs === 'undefined') return () => {};

    const { mode, speed, opts } = ThinkingOrbs.resolvePreset(state, presetSize);
    const drawMode = ThinkingOrbs.MODE_DRAWS[mode];
    let raf = 0;
    let running = false;

    function paint(now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, presetSize, presetSize);
      drawMode(ctx, presetSize, (now / 1000) * speed, false, opts);
    }

    function tick(now) {
      if (!running || !canvas.isConnected) {
        running = false;
        return;
      }
      paint(now);
      raf = requestAnimationFrame(tick);
    }

    function start() {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    paint(performance.now());
    if (typeof IntersectionObserver === 'undefined') {
      start();
    } else {
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && document.visibilityState !== 'hidden') start();
        else stop();
      });
      observer.observe(canvas);
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') stop();
      else if (canvas.isConnected) start();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  };
})();
