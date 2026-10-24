// Native Studio interaction with a deterministic clock for authored motions.
(function () {
  MX.setStyle('dossier');
  const factory = MX.figure, start = performance.now();
  let figure;
  MX.figure = cfg => {
    const before = cfg.beforeRender;
    figure = factory({ ...cfg, beforeRender: state => {
      if (state.t == null) state.t = (performance.now() - start) / 1000;
      if (before) before(state);
    }});
    const nativeExplore = figure.explore;
    figure.explore = options => {
      const extra = options.extra, reset = options.reset;
      const spin = options.toggles.find(toggle => toggle.label === 'SPIN');
      let clock = 0, last = performance.now();
      nativeExplore({ ...options, extra: (state, time) => {
        const now = performance.now();
        if (!spin || spin.get()) clock += Math.min(.05, (now - last) / 1000);
        last = now;
        return { ...(extra ? extra(state, time) : {}), t: clock };
      }, reset: () => { clock = 0; last = performance.now(); if (reset) reset(); } });
    };
    return figure;
  };
  try { MX.spec.run(window.SPEC); } finally { MX.figure = factory; }
  window.__studioFigure = figure;
  if (SPEC.id === 'studio-ball-bearing') {
    const part = figure.byId.bearing, pose = part.pose, rm = 20, rb = 6.272;
    part.pose = (state, p) => {
      pose(state, p);
      const angle = state.t * .8, cage = .5 * (1 - rb / rm) * angle;
      p.group.children[0].rotation.z = angle;
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI / 5 + cage, ball = p.group.children[i + 2];
        ball.position.set(rm * Math.cos(a), rm * Math.sin(a), 0);
        ball.rotation.z = -(rm / (2 * rb)) * (1 - (rb / rm) ** 2) * angle;
      }
      p.group.children[12].rotation.z = cage;
    };
  }
})();
