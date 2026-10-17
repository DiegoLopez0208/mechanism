/* Workflow: independent Canvas2D renderer that explains a process. It never constructs an object mesh, camera,
 * light, WebGL context or a Studio frame. Every frame is a pure function of the time (no random, no clock).
 *
 * Two scenes:
 *  - 'reconcile' (spec.workflowScene.kind): the real thing React does on a click, drawn as it happens: the page, the
 *    state, the tree the component returned before and after, the comparison node by node, and the one change that
 *    reaches the real page. The trees, the changed node and the counts come from the spec (the same model the gate
 *    asked and the evidence measured); nothing is invented here.
 *  - otherwise: a line of stations with a carrier (generic fallback for any object with steps or modes). */
(function (g) {
  'use strict';
  const MX = g.MX = g.MX || {}, E = MX.workflowEngine = {}, P = MX.presentation;
  const { text, line, box, smooth, clamp } = P.util;
  const easeOutBack = x => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const seg = (x, a, b) => clamp((x - a) / (b - a));      // 0..1 as x goes from a to b
  const along = (points, u) => {
    const lens = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1])), total = lens.reduce((s, n) => s + n, 0);
    let d = clamp(u) * total, k = 0; while (k < lens.length - 1 && d > lens[k]) d -= lens[k++];
    const a = points[k], b = points[k + 1], f = d / Math.max(.001, lens[k]); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  };
  function polygon(c, points, fill, stroke) {
    c.beginPath(); points.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.closePath(); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); }
  }
  // text in absolute coordinates (no transform), so its bounds can always be checked
  function label(c, s, x, y, size, color, weight = 600, align = 'center') {
    c.font = weight + ' ' + size + 'px ' + MX.SANS; c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillStyle = color; c.fillText(s, x, y);
    return c.measureText(s).width;
  }
  const pill = (c, s, x, y, size, fill, color) => { c.font = '700 ' + size + 'px ' + MX.SANS; const w = c.measureText(s).width + size * 1.1; box(c, x - w / 2, y - size * 1.05, w, size * 1.55, fill, null, size * .78); label(c, s, x, y, size, color, 700); return w; };

  /* ------------------------------------------------------------------ generic fallback: stations and a carrier */
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
  function route(from, to, M) {
    const wy = from.y + 18 + M.win / 2;
    if (from.x === to.x) { const side = from.x > 500 ? 1 : -1, a = M.w / 2 + 4, b = M.w / 2 + 44; return [[from.x + side * a, wy], [from.x + side * b, wy], [to.x + side * b, to.y + 18 + M.win / 2], [to.x + side * a, to.y + 18 + M.win / 2]]; }
    const dir = to.x > from.x ? 1 : -1; return [[from.x + dir * M.w / 2, wy], [to.x - dir * M.w / 2, to.y + 18 + M.win / 2]];
  }
  function conveyor(c, points, T, t, state) {
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); points.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p));
    c.strokeStyle = T.plateEdge; c.lineWidth = 28; c.stroke(); c.strokeStyle = T.paper; c.lineWidth = 20; c.stroke();
    if (state === 'done') { c.strokeStyle = MX.rgba(T.teal, .5); c.lineWidth = 8; c.stroke(); }
    else { c.setLineDash([3, 14]); c.lineDashOffset = -t * (state === 'active' ? 34 : 6); c.strokeStyle = state === 'active' ? T.teal : T.mute; c.lineWidth = 12; c.stroke(); c.setLineDash([]); }
    c.restore();
  }
  function station(c, at, item, index, st, T, t, M, appear) {
    const x = at.x, y = at.y + (1 - easeOutBack(appear)) * -70, { w, h, d, win } = M, active = st.state === 'active', done = st.state === 'done';
    c.save(); c.globalAlpha = smooth(appear * 1.4);
    if (active) box(c, x - w / 2 - 10, y - 10, w + 20, h + 20, MX.rgba(T.teal, .22 + .12 * Math.sin(t * 4)), null, 18);
    polygon(c, [[x - w / 2, y], [x + w / 2, y], [x + w / 2 + d, y - d], [x - w / 2 + d, y - d]], MX.mix(T.plate, T.ink, .08), T.plateEdge);
    polygon(c, [[x + w / 2, y], [x + w / 2 + d, y - d], [x + w / 2 + d, y + h - d], [x + w / 2, y + h]], MX.mix(T.plate, T.ink, .17), T.plateEdge);
    box(c, x - w / 2, y, w, h, T.plate, active ? T.teal : done ? MX.rgba(T.teal, .55) : T.plateEdge, 5);
    box(c, x - w / 2 + 18, y + 18, w - 36, win, T.paper, T.plateEdge, 4);
    const gx = x - w / 2 + 18 + win * .62, gy = y + 18 + win / 2, gr = win * .26, col = active ? T.teal : done ? MX.rgba(T.teal, .7) : T.mute;
    c.save(); c.translate(gx, gy); c.rotate(active ? st.since * 3.2 : 0);
    for (let k = 0; k < 8; k++) { c.rotate(Math.PI / 4); c.fillStyle = col; c.fillRect(gr, -3, 8, 6); }
    c.beginPath(); c.arc(0, 0, gr, 0, Math.PI * 2); c.strokeStyle = col; c.lineWidth = 3; c.stroke(); c.restore();
    text(c, 'OP ' + String(index + 1).padStart(2, '0'), gx + gr + 24, gy + 8, M.tall ? 28 : 24, 150, T.ink, 700);
    if (done) { c.beginPath(); c.moveTo(x + w / 2 - 62, gy); c.lineTo(x + w / 2 - 52, gy + 10); c.lineTo(x + w / 2 - 34, gy - 10); c.strokeStyle = T.teal; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); }
    text(c, item.title, x - w / 2, y + h + M.title + 8, M.title, w + 30, T.ink, active ? 700 : 500);
    const bx = x - w / 2 + 20, bw = w - 70, by = y + h - 28; box(c, bx, by, bw, 10, MX.rgba(T.plateEdge, .9), null, 5);
    const fill = done ? 1 : active ? st.work : 0; if (fill > 0) box(c, bx, by, Math.max(10, bw * fill), 10, T.teal, null, 5);
    c.fillStyle = col; c.beginPath(); c.arc(x + w / 2 - 22, by + 5, 7, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function drawStations(c, a, k) {
    const { plan, T, W, H, M } = k, capacity = H < 1600 ? 4 : 6, short = !M.tall, factoryBottom = H * (short ? .59 : .70), start = Math.floor(a.index / capacity) * capacity;
    const items = plan.items.slice(start, start + capacity), stations = E.layout(items.length, W, H), elapsed = k.elapsed;
    c.save(); c.beginPath(); c.rect(42, 210, W - 84, factoryBottom - 190); c.clip(); const drift = (a.t * 9) % 72;
    for (let x = -H - 72; x < W + H; x += 72) line(c, [x + drift, 210], [x + drift + H * .6, factoryBottom + 50], MX.rgba(T.ink, .05), 1);
    for (let y = 220; y < factoryBottom; y += 60) line(c, [42, y], [W - 42, y], MX.rgba(T.ink, .05), 1);
    c.restore();
    const stateOf = j => a.closing || start + j < a.index ? 'done' : start + j === a.index && !a.intro ? 'active' : 'pending', TRAVEL = .38;
    for (let j = 1; j < stations.length; j++) { const s = stateOf(j), arr = s === 'active'; conveyor(c, route(stations[j - 1], stations[j], M), T, a.t, arr && a.progress < TRAVEL ? 'active' : s === 'done' || (arr && a.progress >= TRAVEL) ? 'done' : 'pending'); }
    items.forEach((item, j) => { const s = stateOf(j), first = j === 0; station(c, stations[j], item, start + j, { state: s, work: s === 'active' ? clamp((a.progress - (first ? .08 : TRAVEL)) / (first ? .8 : 1 - TRAVEL - .06)) : 0, since: s === 'active' ? elapsed : 0 }, T, a.t, M, smooth((a.t - .25 - j * .16) / .7)); });
    const jc = a.index - start;
    if (!a.intro && !a.closing && jc >= 1 && jc < stations.length && a.progress < TRAVEL + .1) {
      const u = clamp(a.progress / TRAVEL), p = along(route(stations[jc - 1], stations[jc], M), smooth(u)), pop = u < 1 ? 1 : 1 + .5 * Math.sin(seg(a.progress, TRAVEL, TRAVEL + .1) * Math.PI);
      c.save(); c.translate(p[0], p[1]); c.scale(pop, pop); box(c, -24, -16, 48, 32, T.teal, null, 6); line(c, [-11, -5], [11, -5], T.paper, 3.5); line(c, [-11, 5], [5, 5], T.paper, 3.5); c.restore();
      const v = plan.items[a.index].value; if (v) pill(c, v.length > 16 ? v.slice(0, 15) + '…' : v, p[0], p[1] - 34 * pop, 22 * pop, T.ink, T.paper);
    }
    return factoryBottom;
  }

  /* ------------------------------------------------------------------ the React scene */
  // the tree of { type, text, children } in document order, and the layout of one tree around x = cx
  const flat = (node, out = [], depth = 0, parent = -1) => { const i = out.length; out.push({ i, type: node.type, text: node.text || '', depth, parent, kids: [] }); if (parent >= 0) out[parent].kids.push(i); (node.children || []).forEach(ch => flat(ch, out, depth + 1, i)); return out; };
  function layoutTree(nodes, cx, top, K) {
    const gap = 112 * K, rowH = 124 * K, stackH = 82 * K;
    nodes.forEach(n => { n.w = 98 * K; n.h = 46 * K; });
    nodes[0].x = cx; nodes[0].y = top;
    const kids = nodes[0].kids; kids.forEach((id, j) => { nodes[id].x = cx + (j - (kids.length - 1) / 2) * gap; nodes[id].y = top + rowH; });
    nodes.forEach(n => { if (n.depth === 1 && n.kids.length) n.kids.forEach((id, j) => { nodes[id].x = n.x; nodes[id].y = n.y + stackH * (j + 1); }); });
    return nodes;
  }
  const NODE_COLORS = (T, AMBER) => ({ plain: [T.plate, T.plateEdge], kept: [MX.rgba(T.teal, .2), T.teal], changed: [MX.rgba(AMBER, .3), AMBER], scan: [MX.rgba(T.teal, .45), T.teal] });
  function drawNode(c, n, mode, scale, T, AMBER, extra, FS) {
    if (scale <= 0) return; const [fill, edge] = NODE_COLORS(T, AMBER)[mode], w = n.w * scale, h = n.h * scale, hot = mode !== 'plain';
    c.save(); c.globalAlpha = clamp(scale * 1.6);
    const gr = c.createLinearGradient(0, n.y - h / 2, 0, n.y + h / 2); gr.addColorStop(0, MX.mix(T.plate, T.ink, .12)); gr.addColorStop(1, T.plate);
    c.beginPath(); c.roundRect(n.x - w / 2, n.y - h / 2, w, h, 12 * scale);
    c.shadowColor = hot ? MX.rgba(edge, .6) : 'rgba(0,0,0,.42)'; c.shadowBlur = hot ? 22 : 12; c.shadowOffsetY = hot ? 0 : 7; c.fillStyle = gr; c.fill();
    c.shadowColor = 'transparent'; if (hot) { c.fillStyle = fill; c.fill(); }
    c.lineWidth = hot ? 3 : 1.5; c.strokeStyle = hot ? edge : MX.rgba(T.ink, .18); c.stroke();
    label(c, n.type, n.x, n.y + h * .2, Math.max(8, h * .52), T.ink, 700);
    if (extra) label(c, extra, n.x, n.y + h / 2 + 30 * FS, 22 * FS, edge, 600);
    c.restore();
  }
  function edges(c, nodes, shown, T) {      // links from each parent to its children
    nodes.forEach(n => { if (n.parent < 0) return; const p = nodes[n.parent], s = Math.min(shown(n.i), shown(p.i)); if (s <= 0) return;
      c.strokeStyle = MX.rgba(T.mute, .55 * s); c.lineWidth = 2.5; c.lineCap = 'round'; c.beginPath();
      if (n.depth === 2) { const prev = p.kids[0] === n.i ? p : nodes[p.kids[p.kids.indexOf(n.i) - 1]]; c.moveTo(p.x, prev.y + prev.h / 2); c.lineTo(p.x, n.y - n.h / 2); }
      else { const y0 = p.y + p.h / 2, y1 = n.y - n.h / 2, my = (y0 + y1) / 2; c.moveTo(p.x, y0); c.bezierCurveTo(p.x, my, n.x, my, n.x, y1); }
      c.stroke(); });
  }
  function cursor(c, x, y, s, T) {
    const pts = [[0, 0], [0, 40], [10, 31], [17, 46], [25, 42], [18, 28], [31, 28]].map(p => [x + p[0] * s, y + p[1] * s]);
    c.save(); c.lineJoin = 'round'; polygon(c, pts, T.ink, T.paper); c.lineWidth = 3; c.stroke(); c.restore();
  }
  // one camera transform around the scene: each stage pushes toward what it is about, zoom in log space, settled by a spring
  function camera(c, a, k) {
    const { W, H } = k, idx = a.intro ? -1 : a.closing ? 4 : a.index, tall = H >= 1600, rowY = H * (tall ? .475 : .465);
    const key = i => i === 0 ? [1.06, W * .4, H * .2] : i === 1 ? [1.03, W * .5, H * .42] : i === 2 ? [1.02, W * .5, rowY + 30] : i === 3 ? [1.05, W * .6, H * .3] : [1, W / 2, H / 2];
    const from = key(idx - 1), to = key(idx), el = a.intro ? 0 : (a.closing ? a.t - k.plan.end : a.progress * k.plan.slot), u = a.intro ? 1 : Math.min(1.08, P.motion.spring(el, 1.1, .85));
    const z = P.motion.zoom(from[0], to[0], u) + (a.intro ? 0 : .012 * Math.sin(a.t * .9)), fx = from[1] + (to[1] - from[1]) * u, fy = from[2] + (to[2] - from[2]) * u;
    c.translate(fx, fy); c.scale(z, z); c.translate(-fx, -fy);
  }
  function drawReact(c, a, k) {
    const { T, W, H, scene, plan } = k, tall = H >= 1600, K = tall ? 1 : H / 1920 * 1.12, FS = tall ? 1 : .82, AMBER = T.dark ? '#f2c14e' : '#b45f06', ON = T.dark ? '#14191f' : '#ffffff';
    const idx = a.intro ? -1 : a.closing ? 99 : a.index, st = i => idx > i ? 1 : idx === i ? a.progress : 0;      // progress of stage i: 0 before, 0..1 during, 1 after
    const rowY = H * (tall ? .475 : .465), before = layoutTree(flat(scene.before), W * .27, rowY, K), after = layoutTree(flat(scene.after), W * .73, rowY, K);
    const changed = new Set(scene.updated || []), N = before.length, introT = a.intro ? a.t : 99, pBefore = scene.before.children[1].text, pAfter = scene.after.children[1].text;
    // ---- the page: a small browser window with the real elements
    const win = { x: 70, y: H * .118, w: W - 140, h: H * (tall ? .262 : .27) }, bar = 54 * K + 8;
    c.save(); c.globalAlpha = smooth(a.t / .9);
    c.save(); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 40; c.shadowOffsetY = 22; box(c, win.x, win.y, win.w, win.h, T.plate, null, 22); c.restore();
    box(c, win.x, win.y, win.w, win.h, T.plate, MX.rgba(T.ink, .14), 22); box(c, win.x, win.y, win.w, bar, MX.mix(T.plate, T.ink, .07), null, 22); c.fillStyle = MX.mix(T.plate, T.ink, .07); c.fillRect(win.x, win.y + bar - 22, win.w, 22);
    line(c, [win.x, win.y + bar], [win.x + win.w, win.y + bar], MX.rgba(T.ink, .1), 1.5);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((col, j) => { c.beginPath(); c.arc(win.x + 34 + j * 28, win.y + bar / 2, 8, 0, Math.PI * 2); c.fillStyle = MX.rgba(col, .85); c.fill(); });
    label(c, 'THE PAGE  ·  real DOM nodes', win.x + 120, win.y + bar / 2 + 8, 22 * FS, T.mute, 700, 'left');
    const bx = win.x + 44, top = win.y + bar + Math.max(26 * K, (win.h - bar - 250 * K) / 2), committed = st(3) >= .55;
    const el = [{ x: win.x + 24, y: win.y + bar + 8, w: win.w - 48, h: win.h - bar - 24 }, { x: bx, y: top, w: 320 * K, h: 70 * K }, { x: bx, y: top + 88 * K, w: 400 * K, h: 62 * K }, { x: bx, y: top + 168 * K, w: 150 * K, h: 70 * K }, { x: win.x + win.w - 320 * K, y: top, w: 270 * K, h: 238 * K }];
    el.forEach((r, i) => { if (i === 0 || i === 3) return; const t3 = i === 2 && committed; c.save(); c.beginPath(); c.roundRect(r.x, r.y, r.w, r.h, 14);
      c.fillStyle = t3 ? MX.rgba(AMBER, .14) : MX.rgba(T.ink, .045); c.fill(); c.lineWidth = t3 ? 4 : 1.5; c.strokeStyle = t3 ? AMBER : MX.rgba(T.ink, .1);
      if (t3) { c.shadowColor = MX.rgba(AMBER, .55); c.shadowBlur = 30; } c.stroke(); c.restore(); });
    label(c, scene.before.children[0].text, bx + 22, top + 50 * K, 46 * FS, T.ink, 800, 'left');
    const flash = seg(st(3), .55, .8);
    label(c, committed ? pAfter : pBefore, bx + 22, top + 88 * K + 44 * K, 40 * FS, committed && flash < 1 ? AMBER : T.ink, 700, 'left');
    const pressed = st(0) > .5 && st(0) < .66, bt = el[3];
    c.save(); c.shadowColor = MX.rgba(T.teal, pressed ? .25 : .5); c.shadowBlur = pressed ? 8 : 30; c.shadowOffsetY = pressed ? 2 : 10;
    const bgr = c.createLinearGradient(0, bt.y, 0, bt.y + bt.h); bgr.addColorStop(0, MX.mix(T.teal, '#ffffff', .18)); bgr.addColorStop(1, MX.mix(T.teal, '#000000', .22));
    box(c, bt.x, bt.y + (pressed ? 4 : 0), bt.w, bt.h - (pressed ? 4 : 0), bgr, null, 18); c.restore();
    label(c, scene.before.children[2].text, bt.x + bt.w / 2, bt.y + bt.h * .66 + (pressed ? 2 : 0), 36 * FS, ON, 800);
    (scene.before.children[3].children || []).forEach((li, j) => { const yy = top + 56 * K + j * 70 * K; label(c, '•', el[4].x + 30, yy, 38 * FS, T.mute, 700, 'left'); label(c, li.text, el[4].x + 72, yy, 38 * FS, T.ink, 600, 'left'); });
    if (st(0) > .5 && st(0) < .9) { const u = seg(st(0), .5, .9); c.beginPath(); c.arc(bt.x + bt.w / 2, bt.y + bt.h / 2, 14 + u * 90, 0, Math.PI * 2); c.strokeStyle = MX.rgba(T.teal, .8 * (1 - u)); c.lineWidth = 5; c.stroke(); }
    if (idx === 0) {      // the cursor travels to the button, clicks and fades
      const u = smooth(seg(st(0), .02, .46)), from = [win.x + win.w - 140, win.y + win.h + 60 * K], to = [bt.x + bt.w * .55, bt.y + bt.h * .55];
      c.save(); c.globalAlpha = 1 - seg(st(0), .86, 1); cursor(c, from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u, K * 1.15, T); c.restore();
    }
    if (committed) pill(c, 'DOM nodes touched: 1 of ' + N, win.x + win.w - 190, win.y + bar / 2 + 12, 22 * FS, AMBER, ON);
    c.restore();
    // ---- the state strip between the page and the trees
    const sy = H * (tall ? .408 : .4), flipped = st(0) > .62 || idx > 0, hot = idx === 0 && seg(st(0), .62, .82) < 1 && st(0) > .62;
    label(c, 'state', 158, sy + 8, 24 * FS, T.mute, 700, 'right'); pill(c, flipped ? 'n = 1' : 'n = 0', 246, sy + 8, 30 * FS, hot ? T.teal : T.plate, hot ? ON : T.ink);
    if (idx === 1 || idx === 2) { c.save(); c.globalAlpha = idx === 1 ? seg(st(1), 0, .25) : 1; label(c, 'Counter() runs again: a new description of the page', 330, sy + 8, 25 * FS, T.teal, 700, 'left'); c.restore(); }
    // ---- the two trees, and the comparison that walks the eight pairs in document order
    const SP = P.motion.spring, shownBefore = i => a.intro ? SP(introT - .5 - i * .16, 2.2, .75) : 1, afterT = i => idx < 1 ? 0 : idx === 1 ? SP((st(1) * plan.slot) - .4 - i * .22, 2.2, .75) : 1, ty = rowY - 70 * K;
    label(c, 'BEFORE  ·  ' + pBefore, W * .27, ty, 25 * FS, T.mute, 700); label(c, 'AFTER  ·  ' + pAfter, W * .73, ty, 25 * FS, idx >= 1 ? T.mute : MX.rgba(T.mute, .3), 700);
    edges(c, before, shownBefore, T); edges(c, after, afterT, T);
    const walk = idx === 2 ? seg(st(2), .08, .84) * N : idx > 2 ? N : 0, active = Math.floor(walk);
    before.forEach((n, i) => { const m = after[i], isCh = changed.has(i), done = i < Math.floor(walk) || idx > 2, scan = idx === 2 && i === active && active < N;
      const mode = done ? (isCh ? 'changed' : 'kept') : scan ? 'scan' : 'plain';
      drawNode(c, n, mode, shownBefore(i), T, AMBER, i === 2 ? '"' + pBefore + '"' : null, FS); drawNode(c, m, mode, afterT(i), T, AMBER, i === 2 ? '"' + pAfter + '"' : null, FS);
      // the pair under comparison is highlighted in both trees at once and then marked: a check (kept) or a not-equal sign (changed); no lines cross the other nodes
      if (done || scan) {
        const bx2 = (q) => q.x + q.w / 2 - 4, by2 = (q) => q.y - q.h / 2 + 2;
        [n, m].forEach((q, side) => { if (shownBefore(i) <= 0 && side === 0) return; if (afterT(i) <= 0 && side === 1) return;
          if (!done) return; c.beginPath(); c.arc(bx2(q), by2(q), 13 * K + 3, 0, Math.PI * 2); c.fillStyle = isCh ? AMBER : T.teal; c.fill();
          if (isCh) label(c, '\u2260', bx2(q), by2(q) + 8 * K + 2, 22 * FS, ON, 800);
          else { c.beginPath(); c.moveTo(bx2(q) - 6, by2(q)); c.lineTo(bx2(q) - 1, by2(q) + 5); c.lineTo(bx2(q) + 7, by2(q) - 6); c.strokeStyle = ON; c.lineWidth = 3.4; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); } });
      } });
    const byY = after[N - 1].y + 66 * K;
    if (idx === 2 && active < N) { const q = before[active], r = after[active], same = !changed.has(active); label(c, '<' + q.type + '> and <' + r.type + '>: ' + (same ? 'same type, same place: keep the DOM node' : 'same place, but the text differs: update it'), W / 2, byY, 26 * FS, same ? T.teal : AMBER, 700); }
    if (idx >= 2 && (idx > 2 || st(2) > .86)) { c.save(); c.globalAlpha = idx > 2 ? 1 : seg(st(2), .86, 1); label(c, (N - changed.size) + ' kept   ·   ' + changed.size + ' changed', W / 2, byY + 8 * K, 30 * FS, T.ink, 800); c.restore(); }
    // ---- the one change that reaches the page, and the nodes that were never touched
    if (idx === 3) {
      const pr = st(3), u = P.motion.inout(seg(pr, .06, .54)), pe = after[2], page = el[2], px = page.x + page.w * .5, b0 = [pe.x, pe.y - pe.h / 2 - 8], b1 = [pe.x + 40, sy - 60 * K], b2 = [px, page.y + page.h + 190 * K], b3 = [px, page.y + page.h + 6], path = Array.from({ length: 33 }, (_, i) => { const s = i / 32, r = 1 - s; return [0, 1].map(d => r * r * r * b0[d] + 3 * r * r * s * b1[d] + 3 * r * s * s * b2[d] + s * s * s * b3[d]); });      // one arc from the changed node up to its DOM node
      c.save(); c.strokeStyle = MX.rgba(AMBER, .4 * (1 - seg(pr, .6, .9))); c.lineWidth = 3; c.setLineDash([2, 12]); c.lineCap = "round"; c.lineDashOffset = -a.t * 40; c.beginPath(); path.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.stroke(); c.restore();
      if (u < 1) { const p = along(path, u);
        for (let q = 7; q >= 1; q--) { const tp = along(path, Math.max(0, u - q * .018)); c.beginPath(); c.arc(tp[0], tp[1], 15 * (1 - q / 9), 0, Math.PI * 2); c.fillStyle = MX.rgba(AMBER, .32 * (1 - q / 8)); c.fill(); }
        c.save(); c.shadowColor = AMBER; c.shadowBlur = 34; c.beginPath(); c.arc(p[0], p[1], 15, 0, Math.PI * 2); c.fillStyle = AMBER; c.fill(); c.restore(); pill(c, '"' + pAfter + '"', Math.max(150, Math.min(W - 150, p[0])), p[1] - 30, 22 * FS, T.ink, T.paper); }
      else { const r = seg(pr, .54, .8); c.beginPath(); c.arc(px, page.y + page.h / 2, 20 + r * 100, 0, Math.PI * 2); c.strokeStyle = MX.rgba(AMBER, .8 * (1 - r)); c.lineWidth = 6; c.stroke(); }
    }
    if (idx >= 3 && (idx > 3 || st(3) > .75)) { c.save(); c.globalAlpha = idx > 3 ? 1 : seg(st(3), .75, 1); label(c, (N - changed.size) + ' nodes untouched', win.x + win.w - 190, win.y + win.h + 34 * K, 24 * FS, T.teal, 700); c.restore(); }
    return H * .73 - 24;
  }

  /* ------------------------------------------------------------------ the shared frame */
  // the backdrop never changes inside a film: drawn once at the canvas resolution and reused on every frame
  let backCache = null;
  function backdrop(c, T, W, H) {
    const k = W + "x" + H + "/" + T.paper + "/" + (MX.SS || 1);
    if (!backCache || backCache.k !== k) { const SS = MX.SS || 1, cv = document.createElement("canvas"); cv.width = W * SS; cv.height = H * SS; const x = cv.getContext("2d"); x.scale(SS, SS); paintBackdrop(x, T, W, H); backCache = { k, cv }; }
    c.drawImage(backCache.cv, 0, 0, W, H);
  }
  function paintBackdrop(c, T, W, H) {
    const bg = c.createRadialGradient(W * .5, H * .3, 40, W * .5, H * .38, H * .9); bg.addColorStop(0, MX.mix(T.paper, T.teal, T.dark ? .1 : .05)); bg.addColorStop(1, T.paper);
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.fillStyle = MX.rgba(T.ink, T.dark ? .07 : .08); for (let y = 24; y < H; y += 36) for (let x = 24; x < W; x += 36) c.fillRect(x - 1, y - 1, 2.4, 2.4);
    const vg = c.createRadialGradient(W / 2, H * .45, H * .3, W / 2, H * .45, H * .78); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, T.dark ? 'rgba(0,0,0,.38)' : 'rgba(70,60,40,.1)');
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
  }
  E.run = ({ spec, validation, config, W, H, length }) => {
    const plan = P.plan(spec, 'workflow', length), T = MX.THEME, M = dims(H), scene = spec.workflowScene && spec.workflowScene.kind === 'reconcile' && plan.items.length === 5 ? spec.workflowScene : null;
    return P.mount({ plan, spec, validation, config, W, H, engine: 'workflow-canvas2d',
      diagnostics: t => { const a = P.at(plan, t); return { operation: a.index, sourceStep: a.item.index, renderer: 'canvas2d', studioFrames: 0, scene: scene ? scene.kind : 'stations' }; },
      draw(c, a) {
        c.save(); backdrop(c, T, W, H);
        const short = H < 1600, elapsed = a.intro ? a.t : a.closing ? a.t - plan.end : a.progress * plan.slot;      // seconds since the current stage began
        const k = { plan, T, W, H, M, elapsed, scene, validation }, factoryBottom = scene ? (() => { c.save(); c.beginPath(); c.rect(0, 204, W, H - 204); c.clip(); camera(c, a, k); const b = drawReact(c, a, k); c.restore(); return b; })() : drawStations(c, a, k);
        const rise = smooth(elapsed / .5), M2 = P.motion;      // the caption slides up when each stage begins
        text(c, 'WORKFLOW / PROCESS LINE', 64, 66, 19, W - 128, T.teal, 700); text(c, spec.title, 64, 124, 40, W - 128, T.ink, 700);
        text(c, scene ? 'WHAT HAPPENS WHEN YOU CLICK • FROM THE SPEC AND THE MEASURED EVIDENCE' : 'ILLUSTRATIVE FLOW • OPERATIONS FROM THE SPEC', 64, 185, 17, W - 128, T.mute);
        const y0 = factoryBottom + 24; c.fillStyle = T.teal; c.fillRect(64, y0, 72 * (.4 + .6 * rise), 5);
        c.save(); let y = y0 + 55;
        y += M2.rise(c, a.closing ? 'OUTPUT / CHECK' : a.intro ? 'INPUT / START' : 'OPERATION ' + String(a.index + 1).padStart(2, '0'), 64, y, 20, W - 128, T.teal, 700, elapsed) + 22;
        y += M2.rise(c, a.closing ? (validation.verdict?.state || 'NOTHING CHECKED') : a.item.title, 64, y, short ? 34 : 52, W - 128, T.ink, 700, elapsed - .08) + 22;
        y += M2.rise(c, a.closing ? 'The evidence verdict comes from the gate; the animation only explains it.' : a.item.formula, 64, y, short ? 24 : 32, W - 128, T.mute, 500, elapsed - .3, .03) + 22;
        if (!a.closing) M2.rise(c, a.item.value || '', 64, y, short ? 32 : 46, W - 128, T.teal, 700, elapsed - .7);
        else text(c, (validation.verdict?.checked || 0) + ' published comparisons • ' + (validation.verdict?.estimated || 0) + ' estimated claims', 64, y, 24, W - 128, T.ink);
        c.restore();
        const bottom = H - 80; line(c, [64, bottom], [W - 64, bottom], T.plateEdge, 4);
        const amount = clamp((a.t - plan.begin) / (plan.end - plan.begin)); line(c, [64, bottom], [64 + (W - 128) * amount, bottom], T.teal, 4);
        for (let q = 0; q <= plan.items.length; q++) { const tx = 64 + (W - 128) * q / plan.items.length; line(c, [tx, bottom - 9], [tx, bottom + 9], q / plan.items.length <= amount ? T.teal : T.plateEdge, 3); }
        c.beginPath(); c.arc(64 + (W - 128) * amount, bottom, 9, 0, Math.PI * 2); c.fillStyle = T.teal; c.fill();
        text(c, config.background.toUpperCase() + ' / ' + (a.index + 1) + ' OF ' + plan.items.length, 64, H - 35, 16, W - 128, T.mute);
        c.restore();
      },
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
