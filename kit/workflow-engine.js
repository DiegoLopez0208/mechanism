/* Workflow: independent Canvas2D process/factory renderer. It never constructs
 * an object mesh, camera, light, WebGL context or a Studio frame.
 * Every frame is a pure function of the time (no random, no clock): stations drop in, a carrier
 * travels the conveyor to the next station, the station works (progress bar, spinning gear),
 * pulses when the carrier docks and ticks when it is done. */
(function (g) {
  'use strict';
  const MX = g.MX = g.MX || {}, E = MX.workflowEngine = {}, P = MX.presentation;
  const { text, line, box, smooth, clamp } = P.util;
  const easeOutBack = x => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  // station size per format: the tall 9:16 format uses the whole height instead of a small corner
  const dims = H => H < 1600 ? { w: 240, h: 90, d: 26, win: 48, title: 21, tall: false } : { w: 340, h: 150, d: 30, win: 64, title: 28, tall: true };
  E.layout = (count, W, H) => {
    const positions = [], cols = 2, tall = H >= 1600, origin = tall ? 330 : 255;
    const rowH = Math.min(tall ? 330 : 255, (H * (tall ? .70 : .59) - origin - (tall ? 190 : 150)) / Math.max(1, Math.ceil(count / cols) - 1));
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols), col = row % 2 ? 1 - i % cols : i % cols;
      positions.push({ x: W * (col ? .71 : .29), y: origin + row * rowH });
    }
    return positions;
  };
  function polygon(c, points, fill, stroke) {
    c.beginPath(); points.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.closePath(); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); }
  }
  // the route of a conveyor between two stations, as a list of points
  function route(from, to, M) {
    const wy = from.y + 18 + M.win / 2;      // the conveyor runs at the height of the station window
    if (from.x === to.x) { const side = from.x > 500 ? 1 : -1, a = M.w / 2 + 4, b = M.w / 2 + 44; return [[from.x + side * a, wy], [from.x + side * b, wy], [to.x + side * b, to.y + 18 + M.win / 2], [to.x + side * a, to.y + 18 + M.win / 2]]; }
    const dir = to.x > from.x ? 1 : -1; return [[from.x + dir * M.w / 2, wy], [to.x - dir * M.w / 2, to.y + 18 + M.win / 2]];
  }
  const along = (points, u) => {
    const lens = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1])), total = lens.reduce((s, n) => s + n, 0);
    let d = clamp(u) * total, k = 0; while (k < lens.length - 1 && d > lens[k]) d -= lens[k++];
    const a = points[k], b = points[k + 1], f = d / Math.max(.001, lens[k]); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  };
  function conveyor(c, points, T, t, state) {      // state: 'done' | 'active' | 'pending'
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); points.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p));
    c.strokeStyle = T.plateEdge; c.lineWidth = 28; c.stroke();
    c.strokeStyle = T.paper; c.lineWidth = 20; c.stroke();
    if (state === 'done') { c.strokeStyle = MX.rgba(T.teal, .5); c.lineWidth = 8; c.stroke(); }
    else { c.setLineDash([3, 14]); c.lineDashOffset = -t * (state === 'active' ? 34 : 6); c.strokeStyle = state === 'active' ? T.teal : T.mute; c.lineWidth = 12; c.stroke(); c.setLineDash([]); }
    c.restore();
  }
  function carrier(c, x, y, T, label, pop) {
    c.save(); c.translate(x, y); c.scale(pop, pop);
    box(c, -24, -16, 48, 32, T.teal, null, 6); line(c, [-11, -5], [11, -5], T.paper, 3.5); line(c, [-11, 5], [5, 5], T.paper, 3.5);
    c.restore();
    if (label) {      // the label is drawn in absolute coordinates (the pop is applied to its size), so its bounds can be checked
      const size = 22 * pop; c.save(); c.font = '700 ' + size + 'px ' + MX.SANS; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      const s = label.length > 16 ? label.slice(0, 15) + '…' : label, w = c.measureText(s).width + 28 * pop;
      box(c, x - w / 2, y - 64 * pop, w, 34 * pop, T.ink, null, 17 * pop); c.fillStyle = T.paper; c.fillText(s, x, y - 41 * pop);
      polygon(c, [[x - 7 * pop, y - 30 * pop], [x + 7 * pop, y - 30 * pop], [x, y - 21 * pop]], T.ink); c.restore();
    }
  }
  function machine(c, at, item, index, st, T, t, M, appear) {      // st: { state, work, since, pulse }
    const x = at.x, y = at.y + (1 - easeOutBack(appear)) * -70, { w, h, d, win } = M, active = st.state === 'active', done = st.state === 'done';
    c.save(); c.globalAlpha = smooth(appear * 1.4);
    if (active) { const g2 = .22 + .12 * Math.sin(t * 4); box(c, x - w / 2 - 10, y - 10, w + 20, h + 20, MX.rgba(T.teal, g2), null, 18); }
    polygon(c, [[x - w / 2, y], [x + w / 2, y], [x + w / 2 + d, y - d], [x - w / 2 + d, y - d]], MX.mix(T.plate, T.ink, .08), T.plateEdge);
    polygon(c, [[x + w / 2, y], [x + w / 2 + d, y - d], [x + w / 2 + d, y + h - d], [x + w / 2, y + h]], MX.mix(T.plate, T.ink, .17), T.plateEdge);
    box(c, x - w / 2, y, w, h, T.plate, active ? T.teal : done ? MX.rgba(T.teal, .55) : T.plateEdge, 5);
    box(c, x - w / 2 + 18, y + 18, w - 36, win, T.paper, T.plateEdge, 4);
    // The mechanism symbol rotates while the operation runs; it is explicitly a
    // process metaphor, not a physical machine specified by the object evidence.
    const gx = x - w / 2 + 18 + win * .62, gy = y + 18 + win / 2, gr = win * .26;
    c.save(); c.translate(gx, gy); c.rotate(active ? st.since * 3.2 : 0);
    for (let k = 0; k < 8; k++) { c.rotate(Math.PI / 4); c.fillStyle = active ? T.teal : done ? MX.rgba(T.teal, .7) : T.mute; c.fillRect(gr, -3, 8, 6); }
    c.beginPath(); c.arc(0, 0, gr, 0, Math.PI * 2); c.strokeStyle = active ? T.teal : done ? MX.rgba(T.teal, .7) : T.mute; c.lineWidth = 3; c.stroke(); c.restore();
    text(c, 'OP ' + String(index + 1).padStart(2, '0'), gx + gr + 24, gy + 8, M.tall ? 28 : 24, 150, T.ink, 700);
    if (done) { c.beginPath(); c.moveTo(x + w / 2 - 62, gy); c.lineTo(x + w / 2 - 52, gy + 10); c.lineTo(x + w / 2 - 34, gy - 10); c.strokeStyle = T.teal; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); }
    text(c, item.title, x - w / 2, y + h + M.title + 8, M.title, w + 30, T.ink, active ? 700 : 500);
    const bx = x - w / 2 + 20, bw = w - 70, by = y + h - 28;      // progress bar of the operation
    box(c, bx, by, bw, 10, MX.rgba(T.plateEdge, .9), null, 5); const fill = done ? 1 : active ? st.work : 0;
    if (fill > 0) box(c, bx, by, Math.max(10, bw * fill), 10, T.teal, null, 5);
    c.fillStyle = active ? T.teal : done ? MX.rgba(T.teal, .8) : T.plateEdge; c.beginPath(); c.arc(x + w / 2 - 22, by + 5, 7, 0, Math.PI * 2); c.fill();
    if (active && st.pulse > 0 && st.pulse < 1) {      // a ring leaves the window when the carrier docks
      c.beginPath(); c.arc(gx, gy, 20 + st.pulse * 120, 0, Math.PI * 2); c.strokeStyle = MX.rgba(T.teal, .7 * (1 - st.pulse)); c.lineWidth = 5; c.stroke();
    }
    c.restore();
  }
  E.run = ({ spec, validation, config, W, H, length }) => {
    const plan = P.plan(spec, 'workflow', length), T = MX.THEME, M = dims(H);
    const capacity = H < 1600 ? 4 : 6;
    return P.mount({ plan, spec, validation, config, W, H, engine: 'workflow-canvas2d',
      diagnostics: t => { const a = P.at(plan, t); return { operation: a.index, sourceStep: a.item.index, renderer: 'canvas2d', studioFrames: 0 }; },
      draw(c, a) {
        c.save(); c.fillStyle = T.paper; c.fillRect(0, 0, W, H);
        const short = !M.tall, factoryBottom = H * (short ? .59 : .70), start = Math.floor(a.index / capacity) * capacity;
        const items = plan.items.slice(start, start + capacity), stations = E.layout(items.length, W, H);
        const elapsed = a.intro ? a.t : a.closing ? a.t - plan.end : a.progress * plan.slot;      // seconds since the current stage began
        // Architectural plant floor: the diagonals drift slowly so the scene is never still.
        c.save(); c.beginPath(); c.rect(42, 210, W - 84, factoryBottom - 190); c.clip();
        const drift = (a.t * 9) % 72;
        for (let x = -H - 72; x < W + H; x += 72) line(c, [x + drift, 210], [x + drift + H * .6, factoryBottom + 50], MX.rgba(T.ink, .05), 1);
        for (let y = 220; y < factoryBottom; y += 60) line(c, [42, y], [W - 42, y], MX.rgba(T.ink, .05), 1);
        c.restore();
        const stateOf = j => a.closing || start + j < a.index ? 'done' : start + j === a.index && !a.intro ? 'active' : 'pending';
        const TRAVEL = .38;      // the first part of a step is the carrier arriving from the previous station
        for (let j = 1; j < stations.length; j++) { const s = stateOf(j), arriving = s === 'active'; conveyor(c, route(stations[j - 1], stations[j], M), T, a.t, arriving && a.progress < TRAVEL ? 'active' : s === 'done' || (arriving && a.progress >= TRAVEL) ? 'done' : 'pending'); }
        items.forEach((item, j) => {
          const s = stateOf(j), first = j === 0, since = s === 'active' ? elapsed : 0;
          const work = s === 'active' ? clamp((a.progress - (first ? .08 : TRAVEL)) / (first ? .8 : 1 - TRAVEL - .06)) : 0;
          const pulse = s === 'active' && !first ? clamp((a.progress - TRAVEL) * plan.slot / 1.1) : 0;
          machine(c, stations[j], item, start + j, { state: s, work, since, pulse }, T, a.t, M, smooth((a.t - .25 - j * .16) / .7));
        });
        // The carrier: it leaves the previous station, travels the conveyor with easing, docks with a small pop.
        const jc = a.index - start;
        if (!a.intro && !a.closing && jc >= 1 && jc < stations.length) {
          const u = clamp(a.progress / TRAVEL), p = along(route(stations[jc - 1], stations[jc], M), smooth(u)), pop = u < 1 ? 1 : 1 + .5 * Math.sin(clamp((a.progress - TRAVEL) / .1) * Math.PI);
          if (a.progress < TRAVEL + .1) carrier(c, p[0], p[1], T, plan.items[a.index].value || '', pop);
        }
        const rise = smooth(elapsed / .5), lift = (1 - rise) * 26;      // the caption slides up when each stage begins
        text(c, 'WORKFLOW / PROCESS LINE', 64, 66, 19, W - 128, T.teal, 700);
        text(c, spec.title, 64, 124, 40, W - 128, T.ink, 700);
        text(c, 'ILLUSTRATIVE FLOW • OPERATIONS FROM THE SPEC', 64, 185, 17, W - 128, T.mute);
        const y0 = factoryBottom + 24;
        c.fillStyle = T.teal; c.fillRect(64, y0, 72 * (.4 + .6 * rise), 5);
        c.save(); c.globalAlpha = rise; c.translate(0, lift);
        let y = y0 + 55;
        y += text(c, a.closing ? 'OUTPUT / CHECK' : a.intro ? 'INPUT / START' : 'OPERATION ' + String(a.index + 1).padStart(2, '0'), 64, y, 20, W - 128, T.teal, 700) + 22;
        y += text(c, a.closing ? (validation.verdict?.state || 'NOTHING CHECKED') : a.item.title, 64, y, short ? 34 : 52, W - 128, T.ink, 700) + 22;
        y += text(c, a.closing ? 'The evidence verdict comes from the gate; station movement is illustrative.' : a.item.formula, 64, y, short ? 24 : 32, W - 128, T.mute) + 22;
        if (!a.closing) text(c, a.item.value || '', 64, y, short ? 32 : 46, W - 128, T.teal, 700);
        else {
          const checks = validation.verdict?.checked || 0;
          text(c, checks + ' published comparisons • ' + (validation.verdict?.estimated || 0) + ' estimated claims', 64, y, 24, W - 128, T.ink);
        }
        c.restore();
        // Schematic routing timeline with a tick per operation and a moving head.
        const bottom = H - 80; line(c, [64, bottom], [W - 64, bottom], T.plateEdge, 4);
        const amount = clamp((a.t - plan.begin) / (plan.end - plan.begin)); line(c, [64, bottom], [64 + (W - 128) * amount, bottom], T.teal, 4);
        for (let k = 0; k <= plan.items.length; k++) { const tx = 64 + (W - 128) * k / plan.items.length; line(c, [tx, bottom - 9], [tx, bottom + 9], k / plan.items.length <= amount ? T.teal : T.plateEdge, 3); }
        c.beginPath(); c.arc(64 + (W - 128) * amount, bottom, 9, 0, Math.PI * 2); c.fillStyle = T.teal; c.fill();
        text(c, config.background.toUpperCase() + ' / ' + (a.index + 1) + ' OF ' + plan.items.length, 64, H - 35, 16, W - 128, T.mute);
        c.restore();
      },
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
